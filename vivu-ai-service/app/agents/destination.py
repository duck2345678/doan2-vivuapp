from __future__ import annotations

import logging
import math
import re
from typing import Dict, List, Optional

from app.agents.supervisor import CITY_MAPPINGS
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.places import PlacesProvider, get_default_places_provider

logger = logging.getLogger(__name__)


class DestinationAgent:
    CATEGORIES = ("HOTEL", "ATTRACTION", "CAFE", "RESTAURANT")

    def __init__(self, provider: Optional[PlacesProvider] = None):
        self.provider = provider or get_default_places_provider()

    def process(self, request: ParsedUserRequest) -> List[PlaceCandidate]:
        raw_candidates = self._fetch_by_category(request.destination_city)
        if not raw_candidates:
            logger.warning("Không tìm thấy ứng viên cho %s", request.destination_city)
            return []

        filtered = [c for c in raw_candidates if self._is_valid_candidate(c, request.destination_city)]
        scored: List[PlaceCandidate] = []
        for candidate in filtered:
            copy = candidate.model_copy(deep=True)
            copy.score, copy.reason_codes = self._compute_score_and_reasons(copy, request)
            scored.append(copy)

        scored.sort(key=lambda c: (c.score, c.rating, c.user_ratings_total), reverse=True)
        return self._select_diverse_candidates(scored, request)

    def _fetch_by_category(self, city: str) -> List[PlaceCandidate]:
        merged: Dict[str, PlaceCandidate] = {}
        for category in self.CATEGORIES:
            for candidate in self.provider.search_places(city=city, categories=[category]):
                existing = merged.get(candidate.place_id)
                if existing is None or candidate.rating > existing.rating:
                    merged[candidate.place_id] = candidate
        return list(merged.values())

    def select_hotel(self, candidates: List[PlaceCandidate]) -> Optional[PlaceCandidate]:
        preferred = next(
            (c for c in candidates if c.category == "HOTEL" and "HOTEL_PREFERENCE_MATCH" in c.reason_codes),
            None,
        )
        return preferred or next((c for c in candidates if c.category == "HOTEL"), None)

    def _is_valid_candidate(self, c: PlaceCandidate, target_city: str) -> bool:
        if c.latitude == 0.0 and c.longitude == 0.0:
            return False
        if c.rating < 3.0:
            return False

        if c.address:
            address = c.address.lower()
            target = target_city.lower()
            for city_name, patterns in CITY_MAPPINGS:
                if city_name.lower() == target:
                    continue
                if any(re.search(pattern, address) for pattern in patterns):
                    logger.info("Loại %s do address có region khác: %s", c.name, c.address)
                    return False
        return True

    def _compute_score_and_reasons(self, place: PlaceCandidate, request: ParsedUserRequest) -> tuple[float, List[str]]:
        preference_score = self._calculate_preference_match(place, request.interests)
        rating_score = min(place.rating / 5.0, 1.0)
        popularity_score = min(math.log10(place.user_ratings_total + 1) / math.log10(5001), 1.0)
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
        if place.rating >= 4.5:
            reasons.append("HIGH_RATING")
        if place.user_ratings_total >= 3000:
            reasons.append("POPULAR_DESTINATION")
        if budget_fit >= 0.8:
            reasons.append("BUDGET_FIT")
        if style_fit >= 0.8:
            reasons.append("STYLE_FIT")

        if request.hotel_preference and place.category == "HOTEL":
            wanted = self._normalize_text(request.hotel_preference)
            actual = self._normalize_text(place.name)
            if wanted and (wanted in actual or actual in wanted):
                final_score = min(final_score + 0.30, 1.0)
                reasons.append("HOTEL_PREFERENCE_MATCH")

        return round(final_score, 4), reasons

    def _calculate_preference_match(self, place: PlaceCandidate, user_interests: List[str]) -> float:
        if not user_interests:
            return 0.5
        return min(len(set(place.interests) & set(user_interests)) / len(set(user_interests)), 1.0)

    def _known_unit_cost(self, place: PlaceCandidate) -> Optional[float]:
        if place.category == "HOTEL":
            if place.estimated_room_cost_per_night is None:
                return None
            return place.estimated_room_cost_per_night / 2

        known = [v for v in (place.estimated_cost_per_person, place.ticket_price) if v is not None]
        return float(sum(known)) if known else None

    def _calculate_budget_fit(self, place: PlaceCandidate, request: ParsedUserRequest) -> float:
        unit_cost = self._known_unit_cost(place)
        if unit_cost is None:
            return 0.5
        if request.total_budget <= 0:
            return 1.0 if unit_cost == 0 else 0.0

        per_person_day = request.total_budget / max(1, request.num_travelers * request.duration_days)
        share = {
            "HOTEL": 0.40,
            "RESTAURANT": 0.22,
            "CAFE": 0.10,
            "ATTRACTION": 0.25,
        }[place.category]
        target = max(per_person_day * share, 1.0)
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

        if place.category == "HOTEL":
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

    def _select_diverse_candidates(self, candidates: List[PlaceCandidate], request: ParsedUserRequest) -> List[PlaceCandidate]:
        by_category: Dict[str, List[PlaceCandidate]] = {category: [] for category in self.CATEGORIES}
        for candidate in candidates:
            by_category[candidate.category].append(candidate)

        pace_factor = {"RELAXED": 1.2, "MODERATE": 1.8, "FAST": 2.5}[request.travel_pace]
        attraction_max = min(20, max(5, math.ceil(request.duration_days * pace_factor * 1.5)))
        restaurant_max = min(14, max(3, request.duration_days + 2))
        cafe_max = min(10, max(2, math.ceil(request.duration_days * 0.8)))
        hotel_max = 3

        quotas = {
            "HOTEL": hotel_max,
            "ATTRACTION": attraction_max,
            "CAFE": cafe_max,
            "RESTAURANT": restaurant_max,
        }

        selected: List[PlaceCandidate] = []
        for category, max_count in quotas.items():
            pool = by_category[category]
            if category == "HOTEL":
                preferred = [c for c in pool if "HOTEL_PREFERENCE_MATCH" in c.reason_codes]
                if preferred:
                    selected.append(preferred[0])
                    pool = [c for c in pool if c.place_id != preferred[0].place_id]
                    max_count -= 1
            selected.extend(pool[:max(0, max_count)])

        dedup = {c.place_id: c for c in selected}
        result = list(dedup.values())
        result.sort(key=lambda c: (c.score, c.rating, c.user_ratings_total), reverse=True)
        return result

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.casefold().split())
