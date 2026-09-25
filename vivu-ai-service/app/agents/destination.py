from __future__ import annotations

import logging
import math
import re
import unicodedata
from typing import Dict, List, Optional

from app.agents.supervisor import CITY_MAPPINGS
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.places import PlacesProvider, get_default_places_provider

logger = logging.getLogger(__name__)


class DestinationAgent:
    CATEGORIES = ("HOTEL", "ATTRACTION", "CAFE", "RESTAURANT")

    # Nhu cầu tối thiểu/ ngày của itinerary template. Candidate pool lấy dư để có
    # alternative khi validation/optimization loại một số địa điểm.
    DEMAND_PER_DAY = {
        "RELAXED": {"ATTRACTION": 2, "CAFE": 2, "RESTAURANT": 2},
        "MODERATE": {"ATTRACTION": 2, "CAFE": 1, "RESTAURANT": 2},
        "FAST": {"ATTRACTION": 3, "CAFE": 1, "RESTAURANT": 2},
    }
    # Hard upper bounds protect latency/API cost. Within those bounds, the
    # requested capacity grows with duration and travel pace so optimization
    # has replacement candidates available.
    MAX_POOL_BY_CATEGORY = {
        "HOTEL": 5,
        "ATTRACTION": 60,
        "CAFE": 30,
        "RESTAURANT": 60,
    }
    REPLACEMENT_BUFFER_RATIO = 0.5

    def __init__(self, provider: Optional[PlacesProvider] = None):
        self.provider = provider or get_default_places_provider()

    def process(self, request: ParsedUserRequest) -> List[PlaceCandidate]:
        raw_candidates = self._fetch_by_category(request)
        if not raw_candidates:
            logger.warning("Không tìm thấy ứng viên cho %s", request.destination_city)
            return []

        filtered = [
            c for c in raw_candidates
            if self._is_valid_candidate(c, request.destination_city)
        ]
        scored: List[PlaceCandidate] = []
        for candidate in filtered:
            copy = candidate.model_copy(deep=True)
            copy.score, copy.reason_codes = self._compute_score_and_reasons(copy, request)
            scored.append(copy)

        scored.sort(
            key=lambda c: (
                c.score,
                self._safe_rating(c),
                c.user_ratings_total or 0,
            ),
            reverse=True,
        )
        return self._select_diverse_candidates(scored, request)

    def _fetch_by_category(self, request: ParsedUserRequest) -> List[PlaceCandidate]:
        merged: Dict[str, PlaceCandidate] = {}
        pace = str(request.travel_pace or "MODERATE").upper()
        demand = self.DEMAND_PER_DAY.get(pace, self.DEMAND_PER_DAY["MODERATE"])

        for category in self.CATEGORIES:
            if category == "HOTEL":
                target_capacity = self.MAX_POOL_BY_CATEGORY["HOTEL"]
            else:
                required = max(
                    1,
                    request.duration_days * demand[category],
                )
                buffer = max(2, math.ceil(required * self.REPLACEMENT_BUFFER_RATIO))
                target_capacity = min(
                    self.MAX_POOL_BY_CATEGORY[category],
                    required + buffer,
                )

            # Prefer the new capacity-aware provider API. A legacy/custom
            # provider that only implements search_places remains compatible.
            capacity_search = getattr(self.provider, "search_places_for_capacity", None)
            if callable(capacity_search):
                fetched = capacity_search(
                    city=request.destination_city,
                    categories=[category],
                    max_results=target_capacity,
                )
            else:
                fetched = self.provider.search_places(
                    city=request.destination_city,
                    categories=[category],
                )[:target_capacity]

            if len(fetched) < target_capacity:
                logger.info(
                    "Candidate capacity shortfall category=%s city=%s requested=%s received=%s",
                    category,
                    request.destination_city,
                    target_capacity,
                    len(fetched),
                )

            for candidate in fetched:
                existing = merged.get(candidate.place_id)
                if existing is None or self._safe_rating(candidate) > self._safe_rating(existing):
                    merged[candidate.place_id] = candidate

        return list(merged.values())

    def select_hotel(self, candidates: List[PlaceCandidate]) -> Optional[PlaceCandidate]:
        preferred = next(
            (
                c
                for c in candidates
                if (c.category or "").upper() == "HOTEL"
                and "HOTEL_PREFERENCE_MATCH" in c.reason_codes
            ),
            None,
        )
        return preferred or next(
            (c for c in candidates if (c.category or "").upper() == "HOTEL"),
            None,
        )

    def _is_valid_candidate(self, c: PlaceCandidate, target_city: str) -> bool:
        if c.latitude == 0.0 and c.longitude == 0.0:
            return False
        if c.business_status in {"CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY", "FUTURE_OPENING"}:
            return False
        if c.rating is not None and c.rating < 3.0:
            return False

        if not self._address_matches_city(c.address, target_city):
            logger.info(
                "Loại %s do không xác nhận được region target=%s address=%s",
                c.name,
                target_city,
                c.address,
            )
            return False
        return True

    @staticmethod
    def _strip_accents(value: str) -> str:
        normalized = unicodedata.normalize("NFD", value.casefold())
        return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

    def _address_matches_city(self, address: str, target_city: str) -> bool:
        if not address:
            return False
        normalized_address = self._strip_accents(address)
        target_aliases = [target_city]
        for city_name, patterns in CITY_MAPPINGS:
            if city_name == target_city:
                for pattern in patterns:
                    literal = re.sub(r"\\b", "", pattern)
                    # Chuyển regex đơn giản về chuỗi để tăng khả năng match address.
                    if literal:
                        target_aliases.append(literal)

        aliases = {
            self._strip_accents(alias).strip()
            for alias in target_aliases
            if alias and len(alias.strip()) >= 2
        }
        return any(alias in normalized_address for alias in aliases)

    def _compute_score_and_reasons(
        self,
        place: PlaceCandidate,
        request: ParsedUserRequest,
    ) -> tuple[float, List[str]]:
        preference_score = self._calculate_preference_match(place, request.interests)
        rating_score = 0.5 if place.rating is None else min(place.rating / 5.0, 1.0)
        popularity_score = (
            0.5
            if not place.user_ratings_total
            else min(math.log10(place.user_ratings_total + 1) / math.log10(5001), 1.0)
        )
        budget_fit = self._calculate_budget_fit(place, request)
        style_fit = self._calculate_style_fit(place, request.travel_style)
        cost_score = 0.7 * budget_fit + 0.3 * style_fit

        final_score = (
            0.30 * preference_score
            + 0.25 * rating_score
            + 0.20 * popularity_score
            + 0.25 * cost_score
        )

        reasons: List[str] = []
        if request.interests and set(place.interests) & set(request.interests):
            reasons.append("MATCH_PREFERENCE")
        if place.rating is not None and place.rating >= 4.5:
            reasons.append("HIGH_RATING")
        if (place.user_ratings_total or 0) >= 3000:
            reasons.append("POPULAR_DESTINATION")
        if budget_fit >= 0.8:
            reasons.append("BUDGET_FIT")
        if style_fit >= 0.8:
            reasons.append("STYLE_FIT")

        if request.hotel_preference and (place.category or "").upper() == "HOTEL":
            wanted = self._normalize_text(request.hotel_preference)
            actual = self._normalize_text(place.name)
            if wanted and (wanted in actual or actual in wanted):
                final_score = min(final_score + 0.30, 1.0)
                reasons.append("HOTEL_PREFERENCE_MATCH")

        return round(final_score, 4), list(dict.fromkeys(reasons))

    def _calculate_preference_match(self, place: PlaceCandidate, user_interests: List[str]) -> float:
        if not user_interests:
            return 0.5
        matches = len(set(place.interests) & set(user_interests))
        return min(matches / len(set(user_interests)), 1.0)

    @staticmethod
    def _known_unit_cost(place: PlaceCandidate) -> Optional[float]:
        category = (place.category or "").upper()
        if category == "HOTEL":
            if place.estimated_room_cost_per_night is None:
                return None
            return float(place.estimated_room_cost_per_night)

        # Ticket là chi phí admission riêng. Nếu đã biết ticket_price thì dùng nó;
        # nếu chưa biết, estimated_cost_per_person chỉ dùng cho ranking, không được
        # cộng với ticket_price để tránh double-count semantics.
        if place.ticket_price is not None:
            return float(place.ticket_price)
        if place.estimated_cost_per_person is not None:
            return float(place.estimated_cost_per_person)
        return None

    def _calculate_budget_fit(self, place: PlaceCandidate, request: ParsedUserRequest) -> float:
        unit_cost = self._known_unit_cost(place)
        if unit_cost is None:
            return 0.5
        if request.total_budget <= 0:
            return 1.0 if unit_cost == 0 else 0.0

        category = (place.category or "").upper()
        if category == "HOTEL":
            rooms = math.ceil(max(request.num_travelers, 1) / 2)
            nights = max(request.duration_days - 1, 1)
            per_room_night = request.total_budget / max(rooms * nights, 1)
            share = 0.40
        else:
            per_person_day = request.total_budget / max(
                1,
                request.num_travelers * request.duration_days,
            )
            share = {
                "RESTAURANT": 0.22,
                "CAFE": 0.10,
                "ATTRACTION": 0.25,
            }.get(category, 0.20)
            per_room_night = per_person_day

        target = max(per_room_night * share, 1.0)
        ratio = unit_cost / target

        if ratio <= 1.0:
            return 1.0
        if ratio <= 1.35:
            return 0.8
        if ratio <= 1.75:
            return 0.55
        if ratio <= 2.5:
            return 0.3
        return 0.1

    def _calculate_style_fit(self, place: PlaceCandidate, travel_style: str) -> float:
        unit_cost = self._known_unit_cost(place)
        if unit_cost is None:
            return 0.5

        category = (place.category or "").upper()
        if category == "HOTEL":
            bands = {
                "BUDGET": (0, 700_000),
                "BALANCED": (500_000, 1_800_000),
                "LUXURY": (1_200_000, float("inf")),
            }
        else:
            bands = {
                "BUDGET": (0, 150_000),
                "BALANCED": (50_000, 500_000),
                "LUXURY": (180_000, float("inf")),
            }

        low, high = bands[travel_style]
        if low <= unit_cost <= high:
            return 1.0
        if unit_cost < low:
            return 0.7 if travel_style == "LUXURY" else 0.8
        return 0.5 if travel_style == "BUDGET" else 0.7

    def _select_diverse_candidates(
        self,
        candidates: List[PlaceCandidate],
        request: ParsedUserRequest,
    ) -> List[PlaceCandidate]:
        by_category: Dict[str, List[PlaceCandidate]] = {
            category: [] for category in self.CATEGORIES
        }
        for candidate in candidates:
            category = (candidate.category or "").upper()
            if category in by_category:
                by_category[category].append(candidate)

        pace = str(request.travel_pace or "MODERATE").upper()
        demand = self.DEMAND_PER_DAY.get(pace, self.DEMAND_PER_DAY["MODERATE"])
        selected: List[PlaceCandidate] = []

        for category in self.CATEGORIES:
            pool = by_category[category]
            if category == "HOTEL":
                max_count = self.MAX_POOL_BY_CATEGORY["HOTEL"]
            else:
                required = request.duration_days * demand[category]
                buffer = max(1, math.ceil(required * 0.5))
                max_count = min(
                    self.MAX_POOL_BY_CATEGORY[category],
                    max(required + buffer, demand[category]),
                )

            if category == "HOTEL":
                preferred = [
                    c for c in pool if "HOTEL_PREFERENCE_MATCH" in c.reason_codes
                ]
                if preferred:
                    selected.append(preferred[0])
                    pool = [
                        c for c in pool if c.place_id != preferred[0].place_id
                    ]
                    max_count -= 1

            selected.extend(pool[: max(0, max_count)])

        dedup = {c.place_id: c for c in selected}
        result = list(dedup.values())
        result.sort(
            key=lambda c: (
                c.score,
                self._safe_rating(c),
                c.user_ratings_total or 0,
            ),
            reverse=True,
        )
        return result

    @staticmethod
    def _safe_rating(place: PlaceCandidate) -> float:
        return 0.0 if place.rating is None else place.rating

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.casefold().split())
