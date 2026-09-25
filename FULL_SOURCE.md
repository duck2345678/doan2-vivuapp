# ViVu AI Phase 1–4 — FULL SOURCE v2.2
> This file contains the complete Python source included in the v2.2 core bundle. No source file is intentionally abbreviated.
## Source file list
- `app/agents/budget.py`
- `app/agents/destination.py`
- `app/agents/itinerary.py`
- `app/agents/supervisor.py`
- `app/graph/nodes.py`
- `app/graph/travel_graph.py`
- `app/models/state.py`
- `app/schemas/budget.py`
- `app/schemas/common.py`
- `app/schemas/itinerary.py`
- `app/schemas/place.py`
- `app/schemas/request.py`
- `app/schemas/supervisor.py`
- `app/schemas/travel_plan.py`
- `app/tools/cost.py`
- `app/tools/places.py`
- `app/tools/prompting.py`
- `app/tools/routes.py`
- `app/tools/validation.py`
- `regression_tests.py`
- `smoke_test.py`
- `optimization_smoke_test.py`

---

# `app/agents/budget.py`

```python
"""BudgetAgent — Giai đoạn 4: deterministic financial calculation + bounded optimization targets."""
from __future__ import annotations

import math
from typing import List, Optional, Sequence

from app.schemas.budget import BudgetBreakdown, OptimizationContext, OptimizationTarget
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.cost import COST_TABLE, DEFAULT_TRANSPORT_RATE_PER_KM, calculate_budget
from app.tools.validation import validate_budget_breakdown


# Optimization priority: optional/correctable choices first; core attractions last.
_CATEGORY_PRIORITY: dict[str, int] = {
    "CAFE": 0,
    "RESTAURANT": 1,
    "HOTEL": 2,
    "ATTRACTION": 3,
}


def _norm_cat(place: PlaceCandidate) -> str:
    return (place.category or "").upper()


class BudgetAgent:
    @staticmethod
    def collect_data_quality_warnings(
        *,
        request: ParsedUserRequest,
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate],
    ) -> List[str]:
        """Return deterministic warnings when budget inputs are incomplete/estimated.

        These warnings do not change the arithmetic. They make it explicit when
        the final amount contains a fallback estimate or an unknown provider field.
        """
        warnings: List[str] = []
        place_map = {place.place_id: place for place in candidate_pool}

        num_nights = max(request.duration_days - 1, 0)
        if num_nights > 0:
            if selected_hotel is None or selected_hotel.estimated_room_cost_per_night is None:
                warnings.append(
                    "HOTEL_COST_FALLBACK_USED: chưa có giá phòng cụ thể; Budget Engine dùng COST_TABLE."
                )
            elif selected_hotel.provenance.is_estimate:
                warnings.append(
                    "HOTEL_COST_ESTIMATE_USED: giá phòng đang là dữ liệu ước tính."
                )

        for day in itinerary_days:
            meal_slots = {
                slot.slot_type: slot
                for slot in day.time_slots
                if slot.slot_type in {"LUNCH", "DINNER"}
            }
            for meal_type in ("LUNCH", "DINNER"):
                slot = meal_slots.get(meal_type)
                if slot is None:
                    warnings.append(
                        f"FOOD_FALLBACK_USED: Ngày {day.day_number} thiếu {meal_type}; dùng 1/2 định mức bữa ăn/ngày."
                    )
                    continue
                place = place_map.get(slot.place_id)
                if place is None or place.estimated_cost_per_person is None:
                    warnings.append(
                        f"FOOD_FALLBACK_USED: Ngày {day.day_number} {meal_type} chưa có giá cụ thể; dùng 1/2 định mức bữa ăn/ngày."
                    )
                elif place.provenance.is_estimate:
                    warnings.append(
                        f"FOOD_COST_ESTIMATE_USED: Ngày {day.day_number} {meal_type} dùng giá ước tính."
                    )

            for slot in day.time_slots:
                if slot.slot_type in {"LUNCH", "DINNER"}:
                    continue
                place = place_map.get(slot.place_id)
                if place is None or _norm_cat(place) != "CAFE":
                    continue
                if place.estimated_cost_per_person is None:
                    warnings.append(
                        f"CAFE_COST_UNKNOWN: Cafe {slot.place_name} chưa có chi phí explicit; khoản này không được cộng."
                    )
                elif place.provenance.is_estimate:
                    warnings.append(
                        f"CAFE_COST_ESTIMATE_USED: Cafe {slot.place_name} dùng chi phí ước tính."
                    )

        seen_attractions: set[str] = set()
        for day in itinerary_days:
            for slot in day.time_slots:
                place = place_map.get(slot.place_id)
                if place is None or _norm_cat(place) != "ATTRACTION":
                    continue
                if place.place_id in seen_attractions:
                    continue
                seen_attractions.add(place.place_id)
                if place.ticket_price is None:
                    warnings.append(
                        f"UNKNOWN_TICKET_PRICE: {place.name} chưa có dữ liệu ticket_price; ticket cost không được cộng."
                    )
                elif place.provenance.is_estimate:
                    warnings.append(
                        f"TICKET_COST_ESTIMATE_USED: {place.name} dùng giá vé ước tính."
                    )

        if any(
            segment.provenance.is_estimate
            for day in itinerary_days
            for segment in day.route_segments
        ):
            warnings.append(
                "ROUTE_DISTANCE_ESTIMATE_USED: ít nhất một route segment đang dùng Haversine/ước tính."
            )

        return list(dict.fromkeys(warnings))

    def process(
        self,
        request: ParsedUserRequest,
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate] = None,
    ) -> tuple[BudgetBreakdown, List[OptimizationTarget], Optional[OptimizationContext]]:
        num_nights = max(request.duration_days - 1, 0)
        ticket_cost = self._collect_ticket_cost(
            itinerary_days,
            candidate_pool,
            request.num_travelers,
        )
        transport_cost = self._collect_transport_cost(itinerary_days)
        explicit_hotel_cost = self._explicit_hotel_cost(selected_hotel, request)
        explicit_food_cost = self._collect_food_cost(
            itinerary_days,
            candidate_pool,
            request,
        )

        breakdown = calculate_budget(
            num_travelers=request.num_travelers,
            num_days=request.duration_days,
            num_nights=num_nights,
            max_budget=request.total_budget,
            travel_style=request.travel_style,
            ticket_cost=ticket_cost,
            transport_cost=transport_cost,
            explicit_hotel_cost=explicit_hotel_cost,
            explicit_food_cost=explicit_food_cost,
        )

        budget_issues = validate_budget_breakdown(breakdown)
        if budget_issues:
            raise ValueError(
                "Budget invariant violation: " + ", ".join(budget_issues)
            )

        if breakdown.status == "BUDGET_OK":
            return breakdown, [], OptimizationContext(
                previous_total=breakdown.total_calculated,
                target_reduction_total=0,
                affected_days=[],
                iteration_summary="BUDGET_OK",
                progress_made=True,
                termination_reason="BUDGET_OK",
            )

        targets = self._build_targets(
            breakdown,
            itinerary_days,
            candidate_pool,
            selected_hotel,
            request.num_travelers,
        )
        affected = sorted(
            {
                target.day_number
                for target in targets
                if target.day_number is not None
            }
        )

        context = OptimizationContext(
            previous_total=breakdown.total_calculated,
            target_reduction_total=breakdown.over_amount,
            affected_days=affected,
            iteration_summary=(
                f"OVER_BUDGET {breakdown.over_amount:,} VND; "
                f"{len(targets)} target(s) identified."
            ),
            progress_made=None,
            termination_reason=None,
        )
        return breakdown, targets, context

    @staticmethod
    def _explicit_hotel_cost(
        hotel: Optional[PlaceCandidate],
        request: ParsedUserRequest,
    ) -> Optional[int]:
        if hotel is None or hotel.estimated_room_cost_per_night is None:
            return None
        num_nights = max(request.duration_days - 1, 0)
        if num_nights == 0:
            return 0
        rooms = math.ceil(max(request.num_travelers, 1) / 2)
        return hotel.estimated_room_cost_per_night * rooms * num_nights

    @staticmethod
    def _collect_ticket_cost(
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        num_travelers: int,
    ) -> int:
        place_map = {p.place_id: p for p in candidate_pool}
        total = 0
        seen: set[str] = set()

        for day in itinerary_days:
            for slot in day.time_slots:
                if slot.place_id in seen:
                    continue
                place = place_map.get(slot.place_id)
                if place is None or _norm_cat(place) != "ATTRACTION":
                    continue

                seen.add(slot.place_id)
                # Canonical ticket semantics: only ticket_price contributes to
                # ticket_cost. Generic estimated_cost is not silently converted to a ticket.
                if place.ticket_price is not None:
                    total += place.ticket_price * num_travelers
        return total

    @staticmethod
    def _collect_food_cost(
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        request: ParsedUserRequest,
    ) -> int:
        """
        Food semantics:
        - Lunch/Dinner are required meal slots. Known explicit price is used.
        - An unpriced/missing meal uses exactly one-half of the daily fallback rate.
        - Cafe is an optional explicit food expense; when its price is known it is added.
        - Cafe with unknown price is not replaced by a mandatory meal fallback.
        """
        place_map = {p.place_id: p for p in candidate_pool}
        fallback_meal_per_person = (
            COST_TABLE[request.travel_style]["meal_per_person_day"] // 2
        )
        fallback_meal_total = fallback_meal_per_person * request.num_travelers

        total = 0

        for day in itinerary_days:
            day_meals = {
                slot.slot_type: slot
                for slot in day.time_slots
                if slot.slot_type in {"LUNCH", "DINNER"}
            }
            for meal_type in ("LUNCH", "DINNER"):
                slot = day_meals.get(meal_type)
                if slot is None:
                    total += fallback_meal_total
                    continue

                place = place_map.get(slot.place_id)
                if (
                    place is not None
                    and place.estimated_cost_per_person is not None
                ):
                    total += place.estimated_cost_per_person * request.num_travelers
                else:
                    total += fallback_meal_total

            # A cafe used as LUNCH/DINNER is already counted as the meal above.
            # Only standalone cafe stops (e.g. MORNING/AFTERNOON/EVENING) are
            # optional explicit cafe expenses. This prevents double-counting.
            for slot in day.time_slots:
                if slot.slot_type in {"LUNCH", "DINNER"}:
                    continue
                place = place_map.get(slot.place_id)
                if place is None or _norm_cat(place) != "CAFE":
                    continue
                if place.estimated_cost_per_person is not None:
                    total += place.estimated_cost_per_person * request.num_travelers

        return total

    @staticmethod
    def _collect_transport_cost(itinerary_days: Sequence[DayItinerary]) -> int:
        route_km = sum(
            max(0.0, segment.distance_km)
            for day in itinerary_days
            for segment in day.route_segments
        )
        # Canonical v2.0 formula: Σ(route_segment.distance_km × rate).
        # No universal airport-transfer constant and no hidden vehicle multiplier.
        return int(math.ceil(route_km * DEFAULT_TRANSPORT_RATE_PER_KM))

    def _build_targets(
        self,
        breakdown: BudgetBreakdown,
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate],
        num_travelers: int,
    ) -> List[OptimizationTarget]:
        place_map = {p.place_id: p for p in candidate_pool}
        over = breakdown.over_amount
        targets: List[OptimizationTarget] = []
        accumulated = 0

        entries: list[tuple[int, int, int, int, int, str, int]] = []
        for day in itinerary_days:
            for idx, slot in enumerate(day.time_slots):
                place = place_map.get(slot.place_id)
                if place is None:
                    continue
                category = _norm_cat(place)
                reducible_cost = self._reducible_slot_cost(place, num_travelers)
                if reducible_cost <= 0:
                    continue

                # Prefer low-risk reductions first: optional cafe, food,
                # low-preference choices, hotel, and finally core attractions.
                if category == "CAFE":
                    strategy_priority = 0
                elif category == "RESTAURANT":
                    strategy_priority = 1
                elif place.score is not None and place.score < 0.5:
                    strategy_priority = 2
                elif category == "HOTEL":
                    strategy_priority = 3
                else:
                    strategy_priority = 4

                category_priority = _CATEGORY_PRIORITY.get(category, 3)
                entries.append(
                    (
                        strategy_priority,
                        category_priority,
                        -reducible_cost,
                        day.day_number,
                        idx,
                        slot.place_id,
                        reducible_cost,
                    )
                )

        entries.sort()

        for (
            _,
            _,
            _,
            day_number,
            slot_index,
            place_id,
            reducible_cost,
        ) in entries:
            if accumulated >= over:
                break
            place = place_map[place_id]
            reduction_needed = min(reducible_cost, over - accumulated)
            targets.append(
                OptimizationTarget(
                    target_category=_norm_cat(place),  # type: ignore[arg-type]
                    day_number=day_number,
                    slot_index=slot_index,
                    current_place_id=place_id,
                    current_cost=reducible_cost,
                    target_reduction=reduction_needed,
                    reason=self._reason_for(place),
                )
            )
            accumulated += reduction_needed

        # Hotel is a whole-trip expense rather than a day slot.
        if accumulated < over and selected_hotel is not None:
            hotel_cost = breakdown.hotel_cost
            if hotel_cost > 0:
                reduction_needed = min(hotel_cost, over - accumulated)
                targets.append(
                    OptimizationTarget(
                        target_category="HOTEL",
                        day_number=None,
                        slot_index=None,
                        current_place_id=selected_hotel.place_id,
                        current_cost=hotel_cost,
                        target_reduction=reduction_needed,
                        reason="HIGH_COST_HOTEL",
                    )
                )

        return targets

    @staticmethod
    def _reducible_slot_cost(place: PlaceCandidate, num_travelers: int) -> int:
        category = _norm_cat(place)
        if category == "ATTRACTION":
            if place.ticket_price is None or place.ticket_price <= 0:
                return 0
            return place.ticket_price * num_travelers
        if category in {"CAFE", "RESTAURANT"}:
            if place.estimated_cost_per_person is None or place.estimated_cost_per_person <= 0:
                return 0
            return place.estimated_cost_per_person * num_travelers
        return 0

    @staticmethod
    def _reason_for(place: PlaceCandidate) -> str:
        category = _norm_cat(place)
        score = place.score if place.score is not None else 0.0
        if score < 0.5:
            return "LOW_PREFERENCE_SCORE"
        if category == "CAFE":
            return "OPTIONAL_STOP"
        if category == "RESTAURANT":
            return "HIGH_COST_FOOD"
        if category == "HOTEL":
            return "HIGH_COST_HOTEL"
        return "HIGH_COST_PREMIUM"
```

---

# `app/agents/destination.py`

```python
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
```

---

# `app/agents/itinerary.py`

```python
"""ItineraryAgent — Giai đoạn 3: deterministic constraint-aware itinerary planning."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta, time
from typing import Dict, List, Optional, Sequence, Set, Tuple

from app.schemas.itinerary import DayItinerary, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.routes import (
    RouteProvider,
    estimate_road_duration_minutes,
    get_default_routes_provider,
    haversine_km,
)
from app.tools.validation import (
    MAX_SEGMENT_DISTANCE_KM,
    validate_itinerary,
)

CLUSTER_RADIUS_KM = 12.0
STRICT_CLUSTER_RADIUS_KM = 6.0


# ── Safe helpers ─────────────────────────────────────────────────────────────


def _safe_score(place: PlaceCandidate) -> float:
    return place.score if place.score is not None else 0.0


def _safe_rating(place: PlaceCandidate) -> float:
    return place.rating if place.rating is not None else 0.0


def _safe_ratings_total(place: PlaceCandidate) -> int:
    return place.user_ratings_total if place.user_ratings_total is not None else 0


def _norm_category(place: PlaceCandidate) -> str:
    return (place.category or "").upper()


def _time_to_minutes(value: str) -> int:
    parsed = time.fromisoformat(value)
    return parsed.hour * 60 + parsed.minute


@dataclass(frozen=True)
class SlotTemplate:
    slot_type: str
    start_time: str
    end_time: str
    preferred_categories: Tuple[str, ...]


# Planner và validator dùng cùng một contract về số slot.
SLOT_TEMPLATES: Dict[str, List[SlotTemplate]] = {
    "RELAXED": [
        SlotTemplate("MORNING", "09:00", "11:00", ("ATTRACTION", "CAFE")),
        SlotTemplate("LUNCH", "12:00", "13:30", ("RESTAURANT",)),
        SlotTemplate("AFTERNOON", "14:30", "16:30", ("ATTRACTION", "CAFE")),
        SlotTemplate("DINNER", "18:00", "19:30", ("RESTAURANT",)),
    ],
    "MODERATE": [
        SlotTemplate("MORNING", "08:00", "09:30", ("CAFE",)),
        SlotTemplate("MORNING", "10:00", "12:00", ("ATTRACTION",)),
        SlotTemplate("LUNCH", "12:15", "13:30", ("RESTAURANT",)),
        SlotTemplate("AFTERNOON", "14:00", "16:00", ("ATTRACTION",)),
        SlotTemplate("DINNER", "18:00", "19:30", ("RESTAURANT",)),
    ],
    "FAST": [
        SlotTemplate("MORNING", "08:00", "09:00", ("CAFE",)),
        SlotTemplate("MORNING", "09:15", "11:00", ("ATTRACTION",)),
        SlotTemplate("LUNCH", "11:15", "12:15", ("RESTAURANT",)),
        SlotTemplate("AFTERNOON", "12:45", "14:15", ("ATTRACTION",)),
        SlotTemplate("AFTERNOON", "14:30", "16:00", ("ATTRACTION", "CAFE")),
        SlotTemplate("DINNER", "17:30", "18:45", ("RESTAURANT",)),
        SlotTemplate("EVENING", "19:15", "20:30", ("ATTRACTION", "CAFE")),
    ],
}


class ItineraryAgent:
    def __init__(self, route_provider: Optional[RouteProvider] = None):
        self.route_provider = route_provider or get_default_routes_provider()

    def process(
        self,
        request: ParsedUserRequest,
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate] = None,
    ) -> Tuple[List[DayItinerary], List[str], List[str]]:
        warnings: List[str] = []

        if selected_hotel is not None and (
            selected_hotel.latitude == 0.0
            and selected_hotel.longitude == 0.0
        ):
            warnings.append(
                "Khách sạn được chọn có tọa độ không hợp lệ; bỏ khỏi route itinerary."
            )
            selected_hotel = None
        elif selected_hotel is not None and selected_hotel.business_status in {
            "CLOSED_TEMPORARILY",
            "CLOSED_PERMANENTLY",
            "FUTURE_OPENING",
        }:
            warnings.append(
                f"Khách sạn {selected_hotel.name} không ở trạng thái có thể sử dụng; bỏ khỏi route itinerary."
            )
            selected_hotel = None

        # Defensive dedupe + operational/coordinate validation.
        valid_pool_by_id: Dict[str, PlaceCandidate] = {}
        for place in candidate_pool:
            if place.latitude is None or place.longitude is None:
                continue
            if place.latitude == 0.0 and place.longitude == 0.0:
                continue
            if place.business_status in {"CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY", "FUTURE_OPENING"}:
                continue
            valid_pool_by_id.setdefault(place.place_id, place)

        valid_pool = list(valid_pool_by_id.values())
        if not valid_pool:
            warnings.append("Không có candidate_pool hợp lệ để lập lịch trình.")
            return [], [], warnings

        days = self._build_days(
            request,
            valid_pool,
            selected_hotel,
            CLUSTER_RADIUS_KM,
            warnings,
        )
        issues = validate_itinerary(
            days,
            candidate_pool=valid_pool,
            duration_days=request.duration_days,
            travel_pace=request.travel_pace,
            selected_hotel=selected_hotel,
        )

        if issues:
            warnings.append(
                "Lịch trình lần 1 chưa đạt validation: "
                f"{', '.join(issues)}. Thử lập lại với bán kính chặt hơn."
            )
            retry_warnings: List[str] = []
            retried = self._build_days(
                request,
                valid_pool,
                selected_hotel,
                STRICT_CLUSTER_RADIUS_KM,
                retry_warnings,
            )
            retry_issues = validate_itinerary(
                retried,
                candidate_pool=valid_pool,
                duration_days=request.duration_days,
                travel_pace=request.travel_pace,
                selected_hotel=selected_hotel,
            )

            if len(retry_issues) < len(issues):
                days = retried
                issues = retry_issues
                warnings.extend(retry_warnings)

        if issues:
            warnings.append(
                "Không thể tạo lịch trình hoàn toàn hợp lệ sau retry: "
                f"{', '.join(issues)}"
            )
            return [], [], warnings

        selected_ids = list(dict.fromkeys(
            [slot.place_id for day in days for slot in day.time_slots]
        ))
        if selected_hotel and selected_hotel.place_id not in selected_ids:
            selected_ids.append(selected_hotel.place_id)

        return days, selected_ids, warnings

    def _build_days(
        self,
        request: ParsedUserRequest,
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate],
        cluster_radius_km: float,
        warnings: List[str],
    ) -> List[DayItinerary]:
        unused = [
            p for p in candidate_pool
            if _norm_category(p) != "HOTEL"
        ]
        unused.sort(
            key=lambda p: (
                _safe_score(p),
                _safe_rating(p),
                _safe_ratings_total(p),
            ),
            reverse=True,
        )

        travel_pace = str(request.travel_pace or "MODERATE").upper()
        templates = SLOT_TEMPLATES.get(travel_pace, SLOT_TEMPLATES["MODERATE"])
        days: List[DayItinerary] = []
        start_date: Optional[date] = getattr(request, "start_date", None)

        for day_number in range(1, request.duration_days + 1):
            current_day_date = (
                start_date + timedelta(days=day_number - 1)
                if start_date
                else None
            )

            if not unused:
                warnings.append(f"Cạn kiệt địa điểm tại Ngày {day_number}.")
                days.append(
                    DayItinerary(
                        day_number=day_number,
                        date_label=(
                            f"Ngày {day_number} ({current_day_date.strftime('%d/%m/%Y')})"
                            if current_day_date
                            else f"Ngày {day_number}"
                        ),
                    )
                )
                continue

            seed = self._pick_seed(unused, cluster_radius_km)
            last_place = selected_hotel or seed
            day_places: List[PlaceCandidate] = []
            slots: List[TimeSlot] = []
            seed_assigned = False
            previous_slot_end: Optional[str] = None

            for template in templates:
                chosen: Optional[PlaceCandidate] = None
                fallback_category_used = False

                # Ưu tiên seed vào attraction slot để seed không trở thành phantom seed.
                if (
                    not seed_assigned
                    and seed is not None
                    and _norm_category(seed) == "ATTRACTION"
                    and "ATTRACTION" in template.preferred_categories
                    and seed.place_id in {p.place_id for p in unused}
                    and self._opening_hours_compatible(
                        seed,
                        template.start_time,
                        template.end_time,
                        current_day_date,
                    )
                    and self._candidate_travel_gap_is_feasible(
                        last_place,
                        seed,
                        previous_slot_end,
                        template.start_time,
                    )
                ):
                    chosen = seed
                    seed_assigned = True
                else:
                    chosen, fallback_category_used = self._pick_for_slot(
                        unused=unused,
                        template=template,
                        last_place=last_place,
                        seed=seed,
                        cluster_radius_km=cluster_radius_km,
                        already_in_day=day_places,
                        previous_slot_end=previous_slot_end,
                        current_date=current_day_date,
                    )

                if chosen is None:
                    continue

                unused = [p for p in unused if p.place_id != chosen.place_id]
                day_places.append(chosen)
                last_place = chosen
                slots.append(
                    self._to_slot(
                        chosen,
                        template,
                        request,
                        seed,
                        category_fallback=fallback_category_used,
                    )
                )
                previous_slot_end = template.end_time

            if not slots:
                warnings.append(f"Ngày {day_number}: Không gán được hoạt động nào phù hợp.")

            route_places: List[PlaceCandidate] = []
            if selected_hotel is not None and day_places:
                route_places.append(selected_hotel)
            route_places.extend(day_places)
            if selected_hotel is not None and day_places:
                route_places.append(selected_hotel)

            segments = (
                self.route_provider.calculate_route_segments(route_places)
                if len(route_places) >= 2
                else []
            )

            if current_day_date is not None:
                date_label = (
                    f"Ngày {day_number} "
                    f"({current_day_date.strftime('%d/%m/%Y')})"
                )
            else:
                date_label = f"Ngày {day_number}"

            days.append(
                DayItinerary(
                    day_number=day_number,
                    date_label=date_label,
                    time_slots=slots,
                    route_segments=segments,
                    total_travel_distance_km=round(
                        sum(segment.distance_km for segment in segments),
                        2,
                    ),
                    total_travel_time_minutes=sum(
                        segment.duration_minutes for segment in segments
                    ),
                    daily_cost=sum(slot.estimated_cost for slot in slots),
                )
            )

        return days

    def _pick_seed(
        self,
        unused: Sequence[PlaceCandidate],
        cluster_radius_km: float,
    ) -> Optional[PlaceCandidate]:
        candidates = [
            p for p in unused if _norm_category(p) == "ATTRACTION"
        ] or list(unused)
        if not candidates:
            return None

        def cluster_score(place: PlaceCandidate) -> Tuple[int, float, float]:
            neighbors = sum(
                1
                for other in unused
                if other.place_id != place.place_id
                and haversine_km(
                    place.latitude,
                    place.longitude,
                    other.latitude,
                    other.longitude,
                ) <= cluster_radius_km
            )
            return neighbors, _safe_score(place), _safe_rating(place)

        return max(candidates, key=cluster_score)

    def _pick_for_slot(
        self,
        *,
        unused: Sequence[PlaceCandidate],
        template: SlotTemplate,
        last_place: Optional[PlaceCandidate],
        seed: Optional[PlaceCandidate],
        cluster_radius_km: float,
        already_in_day: Sequence[PlaceCandidate],
        previous_slot_end: Optional[str],
        current_date: Optional[date] = None,
    ) -> Tuple[Optional[PlaceCandidate], bool]:
        already_ids: Set[str] = {p.place_id for p in already_in_day}
        anchor = last_place or seed

        exact_pool = [
            p
            for p in unused
            if p.place_id not in already_ids
            and _norm_category(p) in template.preferred_categories
            and self._opening_hours_compatible(
                p,
                template.start_time,
                template.end_time,
                current_date,
            )
            and self._candidate_travel_gap_is_feasible(
                anchor,
                p,
                previous_slot_end,
                template.start_time,
            )
        ]

        fallback_used = False
        matched_pool = exact_pool

        # Controlled semantic fallback only for meal slots.
        if not matched_pool and template.slot_type in {"LUNCH", "DINNER"}:
            matched_pool = [
                p
                for p in unused
                if p.place_id not in already_ids
                and _norm_category(p) in {"RESTAURANT", "CAFE"}
                and self._opening_hours_compatible(
                    p,
                    template.start_time,
                    template.end_time,
                    current_date,
                )
                and self._candidate_travel_gap_is_feasible(
                    anchor,
                    p,
                    previous_slot_end,
                    template.start_time,
                )
            ]
            fallback_used = bool(matched_pool)

        if not matched_pool:
            return None, False

        ranked: List[Tuple[float, PlaceCandidate]] = []
        for place in matched_pool:
            distance = 0.0
            if anchor is not None:
                distance = haversine_km(
                    anchor.latitude,
                    anchor.longitude,
                    place.latitude,
                    place.longitude,
                )

            cluster_bonus = 0.25 if distance <= cluster_radius_km else 0.0
            # Không chặn cứng 20km ở scoring; validator sẽ enforce hard limit.
            distance_penalty = (distance / 10.0) * 0.15
            final_score = _safe_score(place) + cluster_bonus - distance_penalty
            ranked.append((final_score, place))

        ranked.sort(
            key=lambda item: (
                item[0],
                _safe_rating(item[1]),
                _safe_ratings_total(item[1]),
            ),
            reverse=True,
        )
        return ranked[0][1], fallback_used

    @staticmethod
    def _candidate_travel_gap_is_feasible(
        anchor: Optional[PlaceCandidate],
        candidate: PlaceCandidate,
        previous_slot_end: Optional[str],
        next_start: str,
    ) -> bool:
        if anchor is None or previous_slot_end is None:
            return True
        gap = _time_to_minutes(next_start) - _time_to_minutes(previous_slot_end)
        if gap < 0:
            return False
        distance = haversine_km(
            anchor.latitude,
            anchor.longitude,
            candidate.latitude,
            candidate.longitude,
        )
        return estimate_road_duration_minutes(distance) <= gap

    def _to_slot(
        self,
        place: PlaceCandidate,
        template: SlotTemplate,
        request: ParsedUserRequest,
        seed: Optional[PlaceCandidate],
        *,
        category_fallback: bool = False,
    ) -> TimeSlot:
        reasons = list(place.reason_codes or [])
        if "AVOID_DUPLICATE" not in reasons:
            reasons.append("AVOID_DUPLICATE")

        if seed is not None:
            distance = haversine_km(
                seed.latitude,
                seed.longitude,
                place.latitude,
                place.longitude,
            )
            if distance <= STRICT_CLUSTER_RADIUS_KM:
                reasons.append("ROUTE_EFFICIENT")
            elif distance <= CLUSTER_RADIUS_KM:
                reasons.append("NEARBY_CLUSTER")

        if place.opening_hours:
            reasons.append("OPENING_HOURS")
        if category_fallback:
            reasons.append("CATEGORY_FALLBACK")

        return TimeSlot(
            slot_type=template.slot_type,  # type: ignore[arg-type]
            start_time=template.start_time,
            end_time=template.end_time,
            place_id=place.place_id,
            place_name=place.name,
            activity_description=self._describe(place, template),
            reason_codes=list(dict.fromkeys(reasons)),
            estimated_cost=self._slot_cost(place, request.num_travelers),
        )

    @staticmethod
    def _slot_cost(place: PlaceCandidate, num_travelers: int) -> int:
        cat = _norm_category(place)
        if cat == "ATTRACTION":
            # Canonical budget semantics: only verified/estimated ticket_price
            # contributes to the itinerary's explicit attraction cost. A generic
            # estimated activity cost is ranking-only and is not silently treated as a ticket.
            if place.ticket_price is not None and place.ticket_price > 0:
                return place.ticket_price * num_travelers
            return 0
        if place.estimated_cost_per_person is not None and place.estimated_cost_per_person > 0:
            return place.estimated_cost_per_person * num_travelers
        return 0

    @staticmethod
    def _describe(place: PlaceCandidate, template: SlotTemplate) -> str:
        labels = {
            "CAFE": "Thưởng thức cà phê tại",
            "RESTAURANT": "Dùng bữa tại",
            "ATTRACTION": "Tham quan",
            "HOTEL": "Nghỉ ngơi tại khách sạn",
        }
        slot_vietnamese = {
            "MORNING": "buổi sáng",
            "LUNCH": "buổi trưa",
            "AFTERNOON": "buổi chiều",
            "DINNER": "buổi tối",
            "EVENING": "về đêm",
        }
        cat = _norm_category(place)
        action = labels.get(cat, "Ghé thăm")
        timing = slot_vietnamese.get(template.slot_type, template.slot_type.lower())
        return f"{action} {place.name} ({timing})."

    @staticmethod
    def _opening_hours_compatible(
        place: PlaceCandidate,
        start_time: str,
        end_time: str,
        current_date: Optional[date] = None,
    ) -> bool:
        """Check whether the whole activity slot is inside opening hours.

        Policy:
        - No opening-hours data -> UNKNOWN -> allow candidate.
        - ``regularOpeningHours`` is the normal weekly schedule.
        - When a target date is explicitly listed in ``currentOpeningHours.specialDays``,
          that 7-day current schedule is preferred because it contains date-specific
          holiday/special-hour adjustments.
        - Empty ``periods`` is treated as explicitly closed.
        - Google-style 24/7 periods are handled specially.
        - With no ``current_date`` the weekday is unknown, so best-effort weekly
          compatibility is used instead of inventing a day.
        """
        regular_hours = place.opening_hours
        current_hours = getattr(place, "current_opening_hours", None)
        hours, allow_current_24_7 = ItineraryAgent._select_opening_hours_source(
            regular_hours,
            current_hours,
            current_date,
        )

        if not hours:
            return True

        periods = (
            hours.get("periods")
            if isinstance(hours, dict)
            else getattr(hours, "periods", None)
        )

        # Missing periods means the provider did not expose enough information.
        # Explicit [] means the provider says the place has no regular opening period.
        if periods is None:
            return True
        if periods == []:
            return False

        slot_start = _time_to_minutes(start_time)
        slot_end = _time_to_minutes(end_time)
        if slot_end <= slot_start:
            return False

        def raw_info(period: object) -> tuple[dict, dict]:
            if isinstance(period, dict):
                return period.get("open") or {}, period.get("close") or {}
            return (
                getattr(period, "open", {}) or {},
                getattr(period, "close", {}) or {},
            )

        def value(obj: object, key: str) -> Optional[int]:
            if isinstance(obj, dict):
                return obj.get(key)
            return getattr(obj, key, None)

        def is_24_7() -> bool:
            if len(periods) != 1:
                return False
            open_info, close_info = raw_info(periods[0])
            open_day = value(open_info, "day")
            open_hour = value(open_info, "hour")
            open_minute = value(open_info, "minute")

            # regularOpeningHours official representation: Sunday 00:00, no close.
            if (
                not allow_current_24_7
                and open_day == 0
                and int(open_hour or 0) == 0
                and int(open_minute or 0) == 0
                and not close_info
            ):
                return True

            # currentOpeningHours is a rolling 7-day window. For a 24/7 place the
            # single period may start on the requested/current weekday rather than Sunday.
            return (
                allow_current_24_7
                and open_day is not None
                and int(open_hour or 0) == 0
                and int(open_minute or 0) == 0
                and not close_info
            )

        if is_24_7():
            return True

        week_minutes = 7 * 1440
        intervals: List[Tuple[int, int]] = []

        for period in periods:
            open_info, close_info = raw_info(period)
            open_day = value(open_info, "day")
            if open_day is None or not 0 <= int(open_day) <= 6:
                continue

            open_abs = (
                int(open_day) * 1440
                + int(value(open_info, "hour") or 0) * 60
                + int(value(open_info, "minute") or 0)
            )

            if close_info:
                close_day = value(close_info, "day")
                if close_day is not None and 0 <= int(close_day) <= 6:
                    close_abs = (
                        int(close_day) * 1440
                        + int(value(close_info, "hour") or 0) * 60
                        + int(value(close_info, "minute") or 0)
                    )
                    if close_abs <= open_abs:
                        close_abs += week_minutes
                else:
                    close_abs = (
                        int(open_day) * 1440
                        + int(value(close_info, "hour") or 0) * 60
                        + int(value(close_info, "minute") or 0)
                    )
                    if close_abs <= open_abs:
                        close_abs += 1440
            else:
                # Do not let an unspecified close spill into the next weekday unless
                # it is the explicit 24/7 signature handled above.
                close_abs = int(open_day) * 1440 + 1440

            if close_abs > open_abs:
                intervals.append((open_abs, close_abs))

        if not intervals:
            return True

        def covered_at(day_index: int) -> bool:
            slot_start_abs = day_index * 1440 + slot_start
            slot_end_abs = day_index * 1440 + slot_end
            for open_abs, close_abs in intervals:
                for shift in (0, week_minutes):
                    shifted_open = open_abs + shift
                    shifted_close = close_abs + shift
                    if shifted_open <= slot_start_abs and slot_end_abs <= shifted_close:
                        return True
            return False

        if current_date is None:
            return any(covered_at(day_index) for day_index in range(7))

        target_day = (current_date.weekday() + 1) % 7
        return covered_at(target_day)

    @staticmethod
    def _select_opening_hours_source(
        regular_hours: Optional[object],
        current_hours: Optional[object],
        current_date: Optional[date],
    ) -> tuple[Optional[object], bool]:
        """Return (hours_source, current_rolling_window_flag).

        ``currentOpeningHours`` is intentionally used only when its specialDays
        explicitly contain the requested date. This avoids treating a rolling
        7-day snapshot as if it were a permanent weekly schedule.
        """
        if current_date is not None and current_hours:
            special_days = (
                current_hours.get("specialDays")
                if isinstance(current_hours, dict)
                else getattr(current_hours, "specialDays", None)
            )
            if special_days:
                for special_day in special_days:
                    special_date = ItineraryAgent._parse_special_day_date(special_day)
                    if special_date == current_date:
                        return current_hours, True

        return regular_hours, False

    @staticmethod
    def _parse_special_day_date(value: object) -> Optional[date]:
        if isinstance(value, date):
            return value
        payload = value
        if isinstance(value, dict):
            payload = value.get("date") or value

        if isinstance(payload, date):
            return payload
        if isinstance(payload, str):
            try:
                return date.fromisoformat(payload)
            except ValueError:
                return None
        if isinstance(payload, dict):
            year = payload.get("year")
            month = payload.get("month")
            day = payload.get("day")
            if year is None or month is None or day is None:
                return None
            try:
                return date(int(year), int(month), int(day))
            except (TypeError, ValueError):
                return None

        year = getattr(payload, "year", None)
        month = getattr(payload, "month", None)
        day = getattr(payload, "day", None)
        if year is None or month is None or day is None:
            return None
        try:
            return date(int(year), int(month), int(day))
        except (TypeError, ValueError):
            return None

```

---

# `app/agents/supervisor.py`

```python
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.schemas.request import ParsedUserRequest
from app.schemas.supervisor import SupervisorIntent, SupervisorParseResult
from app.tools.prompting import GeminiSemanticParser


CITY_MAPPINGS = [
    ("Đà Lạt", [r"\bđà lạt\b", r"\bda lat\b", r"\bdalat\b"]),
    ("Đà Nẵng", [r"\bđà nẵng\b", r"\bda nang\b", r"\bdanang\b"]),
    ("Hà Nội", [r"\bhà nội\b", r"\bha noi\b", r"\bhanoi\b"]),
    (
        "Hồ Chí Minh",
        [
            r"\bhồ chí minh\b",
            r"\bho chi minh\b",
            r"\bsài gòn\b",
            r"\bsai gon\b",
            r"\btphcm\b",
            r"\bhcm\b",
        ],
    ),
    ("Nha Trang", [r"\bnha trang\b", r"\bnhatrang\b"]),
    ("Phú Quốc", [r"\bphú quốc\b", r"\bphu quoc\b", r"\bphuquoc\b"]),
    ("Vũng Tàu", [r"\bvũng tàu\b", r"\bvung tau\b", r"\bvungtau\b"]),
    ("Huế", [r"\bhuế\b", r"\bhue\b"]),
    ("Hội An", [r"\bhội an\b", r"\bhoi an\b", r"\bhoian\b"]),
    ("Quy Nhơn", [r"\bquy nhơn\b", r"\bquy nhon\b", r"\bquynhon\b"]),
    ("Sa Pa", [r"\bsa pa\b", r"\bsapa\b"]),
    ("Ninh Bình", [r"\bninh bình\b", r"\bninh binh\b"]),
    ("Phan Thiết", [r"\bphan thiết\b", r"\bphan thiet\b", r"\bmũi né\b", r"\bmui ne\b"]),
    ("Cần Thơ", [r"\bcần thơ\b", r"\bcan tho\b"]),
]

INTEREST_KEYWORDS = [
    ("CAFE", [r"\bcà phê\b", r"\bcafe\b", r"\bcoffee\b", r"\bquán nước\b"]),
    (
        "NATURE",
        [
            r"\bthiên nhiên\b",
            r"\bnature\b",
            r"\brừng\b",
            r"\bnúi\b",
            r"\bthác\b",
            r"\bcảnh đẹp\b",
        ],
    ),
    (
        "FOOD",
        [
            r"\bẩm thực\b",
            r"\băn uống\b",
            r"\bfood\b",
            r"\bmón ngon\b",
            r"\bquán ăn\b",
            r"\bđặc sản\b",
        ],
    ),
    (
        "CULTURE",
        [
            r"\bvăn hóa\b",
            r"\blịch sử\b",
            r"\bchùa\b",
            r"\bdi tích\b",
            r"\bbảo tàng\b",
        ],
    ),
    (
        "RELAX",
        [
            r"\bnghỉ dưỡng\b",
            r"\brelax\b",
            r"\bchill\b",
            r"\byên tĩnh\b",
            r"\bthư giãn\b",
        ],
    ),
    (
        "CHECKIN",
        [
            r"\bcheckin\b",
            r"\bcheck-in\b",
            r"\bsống ảo\b",
            r"\bchụp ảnh\b",
            r"\bảnh đẹp\b",
        ],
    ),
    ("BEACH", [r"\bbiển\b", r"\btắm biển\b", r"\bbãi biển\b"]),
]

TRAVEL_KEYWORDS = [
    r"\bdu lịch\b",
    r"\blịch trình\b",
    r"\btour\b",
    r"\bchuyến đi\b",
    r"\bphượt\b",
    r"\btham quan\b",
]

GREETING_PATTERNS = [
    r"^xin chào[!. ]*$",
    r"^chào bạn[!. ]*$",
    r"^hello[!. ]*$",
    r"^hi[!. ]*$",
    r"^tạm biệt[!. ]*$",
]

# Deterministic negation guard. The semantic LLM is never allowed to turn an
# explicitly negative user preference into a positive preference.
NEGATION_PATTERNS = [
    r"\bkhông\b",
    r"\bko\b",
    r"\bchẳng\b",
    r"\bchả\b",
    r"\bđừng\b",
    r"\btránh\b",
    r"\bné\b",
    r"\bhạn chế\b",
    r"\bkhông thích\b",
    r"\bkhông muốn\b",
    r"\bkhông cần\b",
    r"\bkhông ưu tiên\b",
]
NEGATION_WINDOW_CHARS = 36


class SupervisorAgent:
    def __init__(self, semantic_parser: Optional[GeminiSemanticParser] = None) -> None:
        self.semantic_parser = semantic_parser or GeminiSemanticParser()

    def parse(
        self,
        raw_prompt: str,
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> SupervisorParseResult:
        text = raw_prompt.strip().lower()

        destination = self._extract_destination(text)
        days = self._extract_days(text)
        travelers = self._extract_travelers(text)
        budget = self._extract_budget(text)
        blocked_interests = self._extract_negated_interest_codes(text)
        interests = [
            code for code in self._extract_interests(text)
            if code not in blocked_interests
        ]
        travel_style, travel_style_explicit = self._extract_travel_style(text)
        travel_pace, travel_pace_explicit = self._extract_travel_pace(text)
        hotel_pref = self._extract_hotel_preference(text)
        start_date = self._extract_start_date(text)

        blocked_styles = self._extract_negated_styles(text)
        blocked_paces = self._extract_negated_paces(text)
        hotel_negated = self._has_negated_hotel_signal(text)

        semantic_style_found = False
        semantic_pace_found = False
        semantic_interests_found = False
        semantic_hotel_found = False

        explicit_travel_signal = any(re.search(pattern, text) for pattern in TRAVEL_KEYWORDS)
        structured_count = sum(
            value is not None
            for value in (destination, days, travelers, budget)
        )

        # Optional Gemini semantic enrichment. Required fields remain deterministic.
        if (
            self.semantic_parser.available
            and not self._is_greeting_only(text)
            and (destination is not None or explicit_travel_signal or structured_count >= 2)
        ):
            semantic = self.semantic_parser.parse(raw_prompt) or {}

            if not interests:
                semantic_interests = [
                    code
                    for code in self._coerce_interests(semantic.get("interests"))
                    if code not in blocked_interests
                ]
                if semantic_interests:
                    interests = semantic_interests
                    semantic_interests_found = True

            if not travel_style_explicit:
                semantic_style = str(semantic.get("travel_style") or "").upper()
                if (
                    semantic_style in {"BUDGET", "BALANCED", "LUXURY"}
                    and semantic_style not in blocked_styles
                ):
                    travel_style = semantic_style  # type: ignore[assignment]
                    semantic_style_found = True

            if not travel_pace_explicit:
                semantic_pace = str(semantic.get("travel_pace") or "").upper()
                if (
                    semantic_pace in {"RELAXED", "MODERATE", "FAST"}
                    and semantic_pace not in blocked_paces
                ):
                    travel_pace = semantic_pace  # type: ignore[assignment]
                    semantic_pace_found = True

            if hotel_pref is None and not hotel_negated:
                semantic_hotel = semantic.get("hotel_preference")
                if isinstance(semantic_hotel, str) and semantic_hotel.strip():
                    hotel_pref = semantic_hotel.strip()
                    semantic_hotel_found = True

        # Saved preferences are a fallback only. Explicit prompt intent wins.
        if user_preferences:
            if not interests and not semantic_interests_found:
                interests = [
                    code
                    for code in self._coerce_interests(user_preferences.get("interests"))
                    if code not in blocked_interests
                ]

            if not travel_style_explicit and not semantic_style_found:
                pref_style = str(user_preferences.get("travel_style") or "").upper()
                if (
                    pref_style in {"BUDGET", "BALANCED", "LUXURY"}
                    and pref_style not in blocked_styles
                ):
                    travel_style = pref_style  # type: ignore[assignment]

            if not travel_pace_explicit and not semantic_pace_found:
                pref_pace = str(user_preferences.get("travel_pace") or "").upper()
                if (
                    pref_pace in {"RELAXED", "MODERATE", "FAST"}
                    and pref_pace not in blocked_paces
                ):
                    travel_pace = pref_pace  # type: ignore[assignment]

            if hotel_pref is None and not semantic_hotel_found and not hotel_negated:
                pref_hotel = user_preferences.get("hotel_preference")
                if isinstance(pref_hotel, str) and pref_hotel.strip():
                    hotel_pref = pref_hotel.strip()

            if start_date is None:
                start_date = self._coerce_date(user_preferences.get("start_date"))

        structured_travel_signal = structured_count >= 2
        interest_signal = bool(interests) and destination is not None

        if self._is_greeting_only(text):
            return self._general_chat_result(
                "Xin chào! Mình có thể giúp bạn lập kế hoạch du lịch theo điểm đến, số ngày, số người và ngân sách."
            )

        if not (explicit_travel_signal or structured_travel_signal or interest_signal):
            return self._general_chat_result(
                "Mình là ViVu AI, tập trung hỗ trợ lập kế hoạch du lịch. "
                "Nếu bạn muốn tạo chuyến đi, hãy cho mình biết điểm đến, số ngày, số người và ngân sách."
            )

        missing_fields: List[str] = []
        if destination is None:
            missing_fields.append("destination_city")
        if days is None:
            missing_fields.append("duration_days")
        if travelers is None:
            missing_fields.append("num_travelers")
        if budget is None:
            missing_fields.append("total_budget")

        intent: SupervisorIntent = (
            "CLARIFICATION_NEEDED" if missing_fields else "CREATE_PLAN"
        )
        question = (
            self._generate_clarification_question(missing_fields, destination)
            if missing_fields
            else None
        )

        return SupervisorParseResult(
            intent=intent,
            destination_city=destination,
            duration_days=days,
            num_travelers=travelers,
            total_budget=budget,
            interests=interests,
            travel_style=travel_style,
            travel_pace=travel_pace,
            travel_style_explicit=travel_style_explicit,
            travel_pace_explicit=travel_pace_explicit,
            hotel_preference=hotel_pref,
            start_date=start_date,
            missing_fields=missing_fields,
            clarification_question=question,
        )

    def to_parsed_user_request(
        self,
        result: SupervisorParseResult,
    ) -> Optional[ParsedUserRequest]:
        if result.intent != "CREATE_PLAN":
            return None
        if any(
            value is None
            for value in (
                result.destination_city,
                result.duration_days,
                result.num_travelers,
                result.total_budget,
            )
        ):
            return None
        return ParsedUserRequest(
            destination_city=result.destination_city,
            duration_days=result.duration_days,
            num_travelers=result.num_travelers,
            total_budget=result.total_budget,
            interests=result.interests,
            travel_style=result.travel_style,
            travel_pace=result.travel_pace,
            hotel_preference=result.hotel_preference,
            start_date=result.start_date,
        )

    def _general_chat_result(self, response_text: str) -> SupervisorParseResult:
        return SupervisorParseResult(
            intent="GENERAL_CHAT",
            response_text=response_text,
        )

    def _is_greeting_only(self, text: str) -> bool:
        return any(re.search(pattern, text) for pattern in GREETING_PATTERNS)

    def _extract_destination(self, text: str) -> Optional[str]:
        for city_name, patterns in CITY_MAPPINGS:
            if any(re.search(pattern, text) for pattern in patterns):
                return city_name
        return None

    def _extract_days(self, text: str) -> Optional[int]:
        patterns = [
            r"(\d+)\s*[nN](?=\s*\d+\s*[dD]\b)",
            r"(\d+)\s*(?:ngày|ngay)\s*\d+\s*(?:đêm|dem)",
            r"(\d+)\s*(?:ngày|ngay|days?|d\b)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = int(match.group(1))
                if 1 <= value <= 14:
                    return value
        return None

    def _extract_travelers(self, text: str) -> Optional[int]:
        if re.search(r"\b(?:1 mình|một mình|độc hành)\b", text):
            return 1
        if re.search(r"\b(?:2 vợ chồng|hai vợ chồng|cặp đôi)\b", text):
            return 2
        match = re.search(
            r"(\d+)\s*(?:người|nguoi|ng\b|pax|khách|thành viên|bạn(?:\s+bè)?)",
            text,
        )
        if match:
            value = int(match.group(1))
            if 1 <= value <= 50:
                return value
        return None

    def _extract_budget(self, text: str) -> Optional[int]:
        match = re.search(
            r"(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr\b|củ|cu\b|m\b)",
            text,
        )
        if match:
            value = match.group(1).replace(",", ".")
            return int(float(value) * 1_000_000)

        match = re.search(
            r"(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|vnđ|dong|đồng)?\b",
            text,
        )
        if match:
            return int(re.sub(r"[.,]", "", match.group(1)))

        match = re.search(r"(\d+)\s*(?:k\b|nghìn|ngàn|ngan)", text)
        if match:
            return int(match.group(1)) * 1_000

        match = re.search(r"(\d{5,10})\s*(?:đ|vnd|vnđ|dong|đồng)\b", text)
        if match:
            return int(match.group(1))

        context = re.search(
            r"(?:ngân sách|budget|tầm|khoảng)\D{0,20}(\d{5,10})\b",
            text,
        )
        if context:
            return int(context.group(1))
        return None

    def _extract_interests(self, text: str) -> List[str]:
        found: List[str] = []
        for code, patterns in INTEREST_KEYWORDS:
            positive = False
            for pattern in patterns:
                for match in re.finditer(pattern, text):
                    if not self._is_negated_before(text, match.start()):
                        positive = True
                        break
                if positive:
                    break
            if positive:
                found.append(code)
        return found

    def _extract_negated_interest_codes(self, text: str) -> List[str]:
        blocked: List[str] = []
        for code, patterns in INTEREST_KEYWORDS:
            for pattern in patterns:
                if any(
                    self._is_negated_before(text, match.start())
                    for match in re.finditer(pattern, text)
                ):
                    blocked.append(code)
                    break
        return list(dict.fromkeys(blocked))

    def _extract_travel_style(self, text: str) -> tuple[str, bool]:
        style_patterns = {
            "BUDGET": r"\b(?:tiết kiệm|giá rẻ|bình dân|budget|sinh viên)\b",
            "LUXURY": r"\b(?:sang chảnh|cao cấp|luxury|5 sao|resort|xa hoa|xa xỉ)\b",
            "BALANCED": r"\b(?:cân bằng|vừa phải|balanced)\b",
        }
        for style, pattern in style_patterns.items():
            for match in re.finditer(pattern, text):
                if not self._is_negated_before(text, match.start()):
                    return style, True
        return "BALANCED", False

    def _extract_travel_pace(self, text: str) -> tuple[str, bool]:
        pace_patterns = {
            "RELAXED": r"\b(?:thong thả|thư thả|nhẹ nhàng|chill|relax|chậm rãi)\b",
            "FAST": r"\b(?:dày đặc|nhanh|nhiều nơi|khám phá tối đa|fast)\b",
            "MODERATE": r"\b(?:vừa phải|moderate)\b",
        }
        for pace, pattern in pace_patterns.items():
            for match in re.finditer(pattern, text):
                if not self._is_negated_before(text, match.start()):
                    return pace, True
        return "MODERATE", False

    def _extract_hotel_preference(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:khách sạn|khach san|hotel|resort)\s+([a-zA-Z0-9\s\u00C0-\u1EF9&.-]+?)(?=\s*(?:,|;|\.|và|cho|với|tầm|giá|ngân sách|$))",
            r"\bở\s+([a-zA-Z0-9\s\u00C0-\u1EF9&.-]+?\b(?:hotel|resort))\b",
        ]
        stop_words = {
            "nào",
            "gì",
            "sao",
            "bình dân",
            "tiết kiệm",
            "sang chảnh",
            "cao cấp",
            "đẹp",
            "tốt",
            "rẻ",
        }
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            if self._is_negated_before(text, match.start()):
                continue
            candidate = " ".join(match.group(1).split()).strip(" ,.-")
            if len(candidate) >= 3 and candidate.lower() not in stop_words:
                return candidate
        return None

    def _extract_negated_styles(self, text: str) -> set[str]:
        patterns = {
            "BUDGET": r"\b(?:tiết kiệm|giá rẻ|bình dân|budget|sinh viên)\b",
            "LUXURY": r"\b(?:sang chảnh|cao cấp|luxury|5 sao|resort|xa hoa|xa xỉ)\b",
            "BALANCED": r"\b(?:cân bằng|vừa phải|balanced)\b",
        }
        return {
            style
            for style, pattern in patterns.items()
            if any(
                self._is_negated_before(text, match.start())
                for match in re.finditer(pattern, text)
            )
        }

    def _extract_negated_paces(self, text: str) -> set[str]:
        patterns = {
            "RELAXED": r"\b(?:thong thả|thư thả|nhẹ nhàng|chill|relax|chậm rãi)\b",
            "FAST": r"\b(?:dày đặc|nhanh|nhiều nơi|khám phá tối đa|fast)\b",
            "MODERATE": r"\b(?:vừa phải|moderate)\b",
        }
        return {
            pace
            for pace, pattern in patterns.items()
            if any(
                self._is_negated_before(text, match.start())
                for match in re.finditer(pattern, text)
            )
        }

    def _has_negated_hotel_signal(self, text: str) -> bool:
        hotel_pattern = r"\b(?:khách sạn|khach san|hotel|resort)\b"
        return any(
            self._is_negated_before(text, match.start())
            for match in re.finditer(hotel_pattern, text)
        )

    @staticmethod
    def _is_negated_before(text: str, match_start: int) -> bool:
        """Detect a nearby negation without leaking across an adversative clause.

        Example:
            "không thích cà phê nhưng thích thiên nhiên"
        must block CAFE but keep NATURE positive.
        """
        prefix = text[max(0, match_start - NEGATION_WINDOW_CHARS):match_start]

        # A new adversative clause resets the previous negation scope.
        reset_pattern = r"\b(?:nhưng|tuy nhiên|trong khi|mà)\b"
        reset_positions = [match.end() for match in re.finditer(reset_pattern, prefix)]
        if reset_positions:
            prefix = prefix[max(reset_positions):]

        return any(re.search(pattern, prefix) for pattern in NEGATION_PATTERNS)

    def _extract_start_date(self, text: str) -> Optional[date]:
        patterns = [
            r"\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b",
            r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b",
        ]
        for index, pattern in enumerate(patterns):
            match = re.search(pattern, text)
            if not match:
                continue
            try:
                if index == 0:
                    day, month, year = map(int, match.groups())
                else:
                    year, month, day = map(int, match.groups())
                return date(year, month, day)
            except ValueError:
                continue
        return None

    @staticmethod
    def _coerce_date(value: Any) -> Optional[date]:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _coerce_interests(value: Any) -> List[str]:
        if isinstance(value, str):
            values = [item.strip().upper() for item in value.split(",")]
        elif isinstance(value, list):
            values = [str(item).strip().upper() for item in value]
        else:
            return []
        allowed = {code for code, _ in INTEREST_KEYWORDS}
        return list(dict.fromkeys(item for item in values if item in allowed))

    def _generate_clarification_question(
        self,
        missing_fields: List[str],
        destination: Optional[str],
    ) -> str:
        if len(missing_fields) == 1:
            field = missing_fields[0]
            if field == "total_budget":
                suffix = f" đi {destination}" if destination else ""
                return (
                    f"Bạn dự kiến tổng ngân sách cho chuyến đi{suffix} khoảng bao nhiêu tiền "
                    f"(ví dụ: 5 triệu)?"
                )
            if field == "num_travelers":
                return "Chuyến đi này dự kiến có bao nhiêu người tham gia?"
            if field == "duration_days":
                return "Bạn muốn lên lịch trình trong bao nhiêu ngày?"
            if field == "destination_city":
                return "Bạn dự định đi du lịch ở thành phố hoặc địa điểm nào?"

        labels = {
            "destination_city": "điểm đến",
            "duration_days": "số ngày đi",
            "num_travelers": "số người",
            "total_budget": "ngân sách",
        }
        fields = ", ".join(labels[field] for field in missing_fields)
        return f"Để lên kế hoạch chính xác, bạn vui lòng bổ sung: {fields}."
```

---

# `app/graph/nodes.py`

```python
from __future__ import annotations

import logging
import math
from datetime import timedelta
from time import perf_counter
from typing import Any, Dict, List, Optional, Sequence

from app.agents.budget import BudgetAgent
from app.agents.destination import DestinationAgent
from app.agents.itinerary import ItineraryAgent, SLOT_TEMPLATES
from app.agents.supervisor import SupervisorAgent
from app.models.state import MAX_OPTIMIZATION_LOOPS, TerminationReason, TravelPlanState
from app.schemas.budget import OptimizationContext, OptimizationTarget
from app.schemas.common import AgentError, AgentTraceLog
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.schemas.travel_plan import FinalTripPlan
from app.tools.routes import haversine_km
from app.tools.validation import MAX_SEGMENT_DISTANCE_KM

logger = logging.getLogger(__name__)

supervisor_agent = SupervisorAgent()
destination_agent = DestinationAgent()
itinerary_agent = ItineraryAgent()
budget_agent = BudgetAgent()


TERMINAL_OPTIMIZATION_REASONS = {"MAX_LOOPS", "NO_PROGRESS", "NO_TARGETS"}


def _fatal_errors(errors: List[AgentError]) -> bool:
    return any(not error.recoverable for error in errors)


def _clone_days(days: Optional[List[Any]]) -> Optional[List[Any]]:
    if days is None:
        return None
    return [day.model_copy(deep=True) for day in days]


def _clone_place(place: Optional[PlaceCandidate]) -> Optional[PlaceCandidate]:
    return place.model_copy(deep=True) if place is not None else None


def supervisor_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))
    started = perf_counter()

    try:
        result = supervisor_agent.parse(
            state.get("raw_prompt", ""),
            state.get("user_preferences"),
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="Supervisor",
                stage="PARSE_PROMPT",
                status="COMPLETED",
                message=f"Intent: {result.intent}; missing={result.missing_fields}",
                duration_ms=int((perf_counter() - started) * 1000),
            )
        )
    except Exception as exc:
        logger.exception("Supervisor parse failed")
        errors.append(
            AgentError(
                agent_name="Supervisor",
                error_code="SUPERVISOR_PARSE_FAILED",
                message=str(exc),
                recoverable=False,
            )
        )
        return {
            "intent": "GENERAL_CHAT",
            "final_response_text": "Hệ thống gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau.",
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
            "termination_reason": "NON_RECOVERABLE_ERROR",
        }

    if result.intent == "CREATE_PLAN":
        parsed = supervisor_agent.to_parsed_user_request(result)
        if parsed is None:
            errors.append(
                AgentError(
                    agent_name="Supervisor",
                    error_code="PARSED_REQUEST_CONTRACT_VIOLATION",
                    message="Không thể tạo ParsedUserRequest từ intent CREATE_PLAN.",
                    recoverable=False,
                )
            )
            return {
                "intent": "GENERAL_CHAT",
                "parsed_request": None,
                "final_response_text": "Hệ thống không thể tạo yêu cầu chuyến đi hợp lệ từ thông tin đã nhận.",
                "trace_logs": trace_logs,
                "warnings": warnings,
                "errors": errors,
                "termination_reason": "NON_RECOVERABLE_ERROR",
            }

        return {
            "intent": result.intent,
            "parsed_request": parsed,
            "clarification_question": None,
            "final_response_text": None,
            "loop_count": 0,
            "max_loops": MAX_OPTIMIZATION_LOOPS,
            "optimization_exhausted": False,
            "optimization_stalled": False,
            "termination_reason": None,
            "optimization_targets": [],
            "optimization_context": None,
            "best_itinerary_days": None,
            "best_budget_breakdown": None,
            "best_selected_hotel": None,
            "best_selected_place_ids": [],
            "best_over_amount": 10**18,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    if result.intent == "CLARIFICATION_NEEDED":
        return {
            "intent": result.intent,
            "parsed_request": None,
            "clarification_question": result.clarification_question,
            "final_response_text": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    return {
        "intent": "GENERAL_CHAT",
        "parsed_request": None,
        "clarification_question": None,
        "final_response_text": result.response_text or "Xin chào! Mình là ViVu AI.",
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }


def clarification_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    question = state.get("clarification_question") or (
        "Bạn có thể cung cấp thêm thông tin cho chuyến đi không?"
    )
    trace_logs.append(
        AgentTraceLog(
            agent_name="Supervisor",
            stage="REQUEST_CLARIFICATION",
            status="COMPLETED",
            message=question,
        )
    )
    return {"final_response_text": question, "trace_logs": trace_logs}


def general_chat_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    response = state.get("final_response_text") or "Xin chào! Mình là ViVu AI."
    trace_logs.append(
        AgentTraceLog(
            agent_name="Supervisor",
            stage="RESPOND_GENERAL_CHAT",
            status="COMPLETED",
            message=response,
        )
    )
    return {"final_response_text": response, "trace_logs": trace_logs}


def destination_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))
    started = perf_counter()

    if parsed is None:
        return {"candidate_pool": [], "selected_hotel": None, "trace_logs": trace_logs}

    try:
        candidates = destination_agent.process(parsed)
        selected_hotel = destination_agent.select_hotel(candidates)
    except Exception as exc:
        logger.exception("Destination agent failed")
        candidates, selected_hotel = [], None
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="DESTINATION_PROCESS_FAILED",
                message=str(exc),
                recoverable=True,
            )
        )

    counts = {
        category: sum(
            (candidate.category or "").upper() == category
            for candidate in candidates
        )
        for category in DestinationAgent.CATEGORIES
    }

    status = "COMPLETED" if candidates else "FAILED"
    trace_logs.append(
        AgentTraceLog(
            agent_name="DestinationAgent",
            stage="FETCH_AND_SCORE_CANDIDATES",
            status=status,
            message=f"Found {len(candidates)} candidates; categories={counts}",
            duration_ms=int((perf_counter() - started) * 1000),
        )
    )

    if not candidates and not errors:
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="NO_CANDIDATES_FOUND",
                message=f"Không tìm thấy candidate hợp lệ cho {parsed.destination_city}.",
                recoverable=False,
            )
        )

    return {
        "candidate_pool": candidates,
        "selected_hotel": selected_hotel,
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }


def _candidate_cost_for_optimization(
    place: PlaceCandidate,
    num_travelers: int,
) -> Optional[int]:
    category = (place.category or "").upper()
    if category == "ATTRACTION":
        if place.ticket_price is None or place.ticket_price <= 0:
            return None
        return place.ticket_price * num_travelers
    if category in {"RESTAURANT", "CAFE"}:
        if place.estimated_cost_per_person is None or place.estimated_cost_per_person <= 0:
            return None
        return place.estimated_cost_per_person * num_travelers
    return None


def _hotel_replacement_is_distance_feasible(
    hotel: PlaceCandidate,
    itinerary_days: Sequence[DayItinerary],
    candidate_pool: Sequence[PlaceCandidate],
) -> bool:
    """Check hotel round-trip legs against the canonical hard distance cap."""
    place_map = {place.place_id: place for place in candidate_pool}
    for day in itinerary_days:
        slots = day.time_slots
        if not slots:
            continue

        first = place_map.get(slots[0].place_id)
        last = place_map.get(slots[-1].place_id)
        if first is None or last is None:
            return False

        if (
            haversine_km(hotel.latitude, hotel.longitude, first.latitude, first.longitude)
            > MAX_SEGMENT_DISTANCE_KM
        ):
            return False
        if (
            haversine_km(last.latitude, last.longitude, hotel.latitude, hotel.longitude)
            > MAX_SEGMENT_DISTANCE_KM
        ):
            return False
    return True


def _find_reasonable_cheaper_replacement(
    *,
    current: PlaceCandidate,
    candidate_pool: List[PlaceCandidate],
    request: ParsedUserRequest,
    itinerary_days: Sequence[DayItinerary],
    target: OptimizationTarget,
    selected_hotel: Optional[PlaceCandidate],
    reserved_replacements: set[str],
) -> Optional[PlaceCandidate]:
    """Find a cheaper same-category replacement that is locally feasible.

    A replacement is not considered valid merely because it is cheaper. It must
    also fit the target slot's opening hours, avoid duplicates, respect the hard
    20km segment constraint and fit the time gaps according to the same
    deterministic travel-duration heuristic used by ItineraryAgent.
    """
    current_cost = _candidate_cost_for_optimization(current, request.num_travelers)
    if current_cost is None or target.day_number is None or target.slot_index is None:
        return None

    day = next(
        (item for item in itinerary_days if item.day_number == target.day_number),
        None,
    )
    if day is None or not (0 <= target.slot_index < len(day.time_slots)):
        return None

    slot = day.time_slots[target.slot_index]
    templates = SLOT_TEMPLATES.get(
        str(request.travel_pace or "MODERATE").upper(),
        SLOT_TEMPLATES["MODERATE"],
    )
    # slot_index refers to the compact list of selected slots, not necessarily
    # the original template index because a template can be skipped when no
    # feasible candidate exists. Match the exact slot type/time instead.
    template = next(
        (
            candidate_template
            for candidate_template in templates
            if candidate_template.slot_type == slot.slot_type
            and candidate_template.start_time == slot.start_time
            and candidate_template.end_time == slot.end_time
        ),
        None,
    )
    if template is None:
        return None

    place_map = {place.place_id: place for place in candidate_pool}
    # A replacement already used anywhere in the trip would introduce a
    # cross-day duplicate, so all currently selected POIs are reserved.
    used_ids = {
        item.place_id
        for trip_day in itinerary_days
        for item in trip_day.time_slots
    }
    used_ids.discard(current.place_id)

    current_date = None
    if getattr(request, "start_date", None) is not None:
        current_date = request.start_date + timedelta(days=target.day_number - 1)

    previous_place: Optional[PlaceCandidate] = None
    previous_end: Optional[str] = None
    if target.slot_index > 0:
        previous_slot = day.time_slots[target.slot_index - 1]
        previous_place = place_map.get(previous_slot.place_id)
        previous_end = previous_slot.end_time
    elif selected_hotel is not None:
        previous_place = selected_hotel
        previous_end = None

    next_place: Optional[PlaceCandidate] = None
    if target.slot_index + 1 < len(day.time_slots):
        next_place = place_map.get(day.time_slots[target.slot_index + 1].place_id)

    candidates: list[tuple[float, PlaceCandidate]] = []
    current_score = current.score or 0.0
    category = (current.category or "").upper()

    for candidate in candidate_pool:
        if candidate.place_id == current.place_id:
            continue
        if candidate.place_id in used_ids or candidate.place_id in reserved_replacements:
            continue
        if (candidate.category or "").upper() != category:
            continue
        if candidate.business_status in {"CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY", "FUTURE_OPENING"}:
            continue

        candidate_cost = _candidate_cost_for_optimization(candidate, request.num_travelers)
        if candidate_cost is None or candidate_cost >= current_cost:
            continue

        candidate_score = candidate.score or 0.0
        if candidate_score < max(0.35, current_score - 0.25):
            continue

        if not itinerary_agent._opening_hours_compatible(
            candidate,
            template.start_time,
            template.end_time,
            current_date,
        ):
            continue

        if previous_place is not None:
            prev_distance = haversine_km(
                previous_place.latitude,
                previous_place.longitude,
                candidate.latitude,
                candidate.longitude,
            )
            if prev_distance > MAX_SEGMENT_DISTANCE_KM:
                continue
            if not itinerary_agent._candidate_travel_gap_is_feasible(
                previous_place,
                candidate,
                previous_end,
                template.start_time,
            ):
                continue

        if next_place is not None:
            next_distance = haversine_km(
                candidate.latitude,
                candidate.longitude,
                next_place.latitude,
                next_place.longitude,
            )
            if next_distance > MAX_SEGMENT_DISTANCE_KM:
                continue
            if not itinerary_agent._candidate_travel_gap_is_feasible(
                candidate,
                next_place,
                template.end_time,
                day.time_slots[target.slot_index + 1].start_time,
            ):
                continue

        neighbor_distance = 0.0
        if previous_place is not None:
            neighbor_distance += haversine_km(
                previous_place.latitude,
                previous_place.longitude,
                candidate.latitude,
                candidate.longitude,
            )
        if next_place is not None:
            neighbor_distance += haversine_km(
                candidate.latitude,
                candidate.longitude,
                next_place.latitude,
                next_place.longitude,
            )

        # Lower cost first, then preserve score, then minimize local travel.
        replacement_score = (
            float(candidate_cost)
            - (candidate_score * 10_000.0)
            + (neighbor_distance * 100.0)
        )
        candidates.append((replacement_score, candidate))

    if not candidates:
        return None
    candidates.sort(key=lambda item: (item[0], -(item[1].score or 0.0)))
    return candidates[0][1]

def itinerary_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    candidate_pool = list(state.get("candidate_pool") or [])
    selected_hotel = state.get("selected_hotel")
    optimization_targets = list(state.get("optimization_targets") or [])
    optimization_context = state.get("optimization_context")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))
    started = perf_counter()

    if parsed is None or not candidate_pool:
        if parsed is not None and not candidate_pool and not errors:
            errors.append(
                AgentError(
                    agent_name="ItineraryAgent",
                    error_code="NO_CANDIDATES_FOR_ITINERARY",
                    message="Không có candidate pool để lập lịch trình.",
                    recoverable=False,
                )
            )
        return {
            "itinerary_days": [],
            "selected_place_ids": [],
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    is_replan = (
        optimization_context is not None and len(optimization_targets) > 0
    )

    effective_pool = list(candidate_pool)
    effective_hotel = selected_hotel
    stage = "REPLANNING" if is_replan else "BUILD_ITINERARY"

    if is_replan:
        excluded_place_ids: set[str] = set()
        reserved_replacement_ids: set[str] = set()
        changes_applied = 0

        for target in optimization_targets:
            # Hotel: only swap to a strictly cheaper operational hotel. The
            # itinerary is rebuilt afterwards so every hotel leg is recalculated.
            if target.target_category == "HOTEL" and selected_hotel is not None:
                hotels = [
                    place
                    for place in candidate_pool
                    if (place.category or "").upper() == "HOTEL"
                    and place.place_id != selected_hotel.place_id
                    and place.place_id not in reserved_replacement_ids
                    and place.business_status not in {"CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY", "FUTURE_OPENING"}
                    and place.estimated_room_cost_per_night is not None
                    and place.estimated_room_cost_per_night
                    < (selected_hotel.estimated_room_cost_per_night or math.inf)
                    and _hotel_replacement_is_distance_feasible(
                        place,
                        list(state.get("itinerary_days") or []),
                        candidate_pool,
                    )
                ]
                hotels.sort(
                    key=lambda hotel: (
                        hotel.estimated_room_cost_per_night or math.inf,
                        -(hotel.score or 0.0),
                    )
                )
                if hotels:
                    effective_hotel = hotels[0]
                    excluded_place_ids.add(selected_hotel.place_id)
                    reserved_replacement_ids.add(effective_hotel.place_id)
                    changes_applied += 1
                    warnings.append(
                        f"Đã đổi khách sạn từ {selected_hotel.name} sang "
                        f"{effective_hotel.name} để giảm chi phí."
                    )
                continue

            if not target.current_place_id:
                continue

            current = next(
                (
                    place
                    for place in candidate_pool
                    if place.place_id == target.current_place_id
                ),
                None,
            )
            if current is None:
                continue

            category = (current.category or "").upper()
            replacement = _find_reasonable_cheaper_replacement(
                current=current,
                candidate_pool=candidate_pool,
                request=parsed,
                itinerary_days=list(state.get("itinerary_days") or []),
                target=target,
                selected_hotel=effective_hotel,
                reserved_replacements=reserved_replacement_ids,
            )

            if replacement is not None:
                excluded_place_ids.add(current.place_id)
                reserved_replacement_ids.add(replacement.place_id)
                changes_applied += 1
                warnings.append(
                    f"Đã đánh dấu thay thế {current.name} bằng một lựa chọn "
                    f"rẻ hơn cùng nhóm để giảm chi phí."
                )
                continue

            # Cafe is explicitly optional. It may be dropped when there is no
            # feasible cheaper same-category replacement. A restaurant is a meal
            # requirement, so NEVER delete it blindly without a feasible replacement.
            if category == "CAFE":
                excluded_place_ids.add(current.place_id)
                changes_applied += 1
                warnings.append(
                    f"Đã bỏ điểm cafe tùy chọn {current.name} vì không có "
                    "phương án thay thế rẻ hơn nhưng vẫn hợp lệ."
                )

        if changes_applied == 0:
            warnings.append(
                "Vòng re-plan hiện tại không có thay đổi khả thi; giữ nguyên itinerary để BudgetAgent kích hoạt NO_PROGRESS."
            )

        effective_pool = [
            place
            for place in candidate_pool
            if place.place_id not in excluded_place_ids
        ]

        if not effective_pool:
            errors.append(
                AgentError(
                    agent_name="ItineraryAgent",
                    error_code="REPLAN_EMPTY_CANDIDATE_POOL",
                    message="Optimization đã loại hết candidate hợp lệ.",
                    recoverable=False,
                )
            )
            return {
                "itinerary_days": [],
                "selected_place_ids": [],
                "trace_logs": trace_logs,
                "warnings": warnings,
                "errors": errors,
            }

    try:
        days, selected_ids, extra_warnings = itinerary_agent.process(
            parsed,
            effective_pool,
            effective_hotel,
        )
        warnings.extend(extra_warnings)
        status = "COMPLETED" if days else "FAILED"

        trace_logs.append(
            AgentTraceLog(
                agent_name="ItineraryAgent",
                stage=stage,
                status="OPTIMIZING" if is_replan and days else status,
                message=f"Lập lịch {len(days)} ngày; replan={is_replan}.",
                duration_ms=int((perf_counter() - started) * 1000),
            )
        )

        if not days and not any(
            error.agent_name == "ItineraryAgent" and not error.recoverable
            for error in errors
        ):
            errors.append(
                AgentError(
                    agent_name="ItineraryAgent",
                    error_code="ITINERARY_NOT_VALID",
                    message="Không tạo được itinerary đáp ứng các hard constraints.",
                    recoverable=False,
                )
            )

        return {
            "itinerary_days": days,
            "selected_place_ids": selected_ids,
            "selected_hotel": effective_hotel,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }
    except Exception as exc:
        logger.exception("Itinerary Agent execution failed")
        errors.append(
            AgentError(
                agent_name="ItineraryAgent",
                error_code="ITINERARY_BUILD_FAILED",
                message=str(exc),
                recoverable=True,
            )
        )
        return {
            "itinerary_days": [],
            "selected_place_ids": [],
            "selected_hotel": effective_hotel,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }


def budget_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    itinerary_days = list(state.get("itinerary_days") or [])
    candidate_pool = list(state.get("candidate_pool") or [])
    selected_hotel = state.get("selected_hotel")
    loop_count = state.get("loop_count", 0)
    previous_context = state.get("optimization_context")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))
    started = perf_counter()

    if parsed is None or not itinerary_days:
        if parsed is not None and not itinerary_days and not errors:
            errors.append(
                AgentError(
                    agent_name="BudgetAgent",
                    error_code="NO_ITINERARY_FOR_BUDGET",
                    message="Không có itinerary hợp lệ để tính ngân sách.",
                    recoverable=False,
                )
            )
        return {
            "budget_breakdown": None,
            "optimization_targets": [],
            "optimization_context": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
            "termination_reason": "BUDGET_UNAVAILABLE",
        }

    try:
        breakdown, targets, base_context = budget_agent.process(
            request=parsed,
            itinerary_days=itinerary_days,
            candidate_pool=candidate_pool,
            selected_hotel=selected_hotel,
        )
    except Exception as exc:
        logger.exception("Budget Agent execution failed")
        errors.append(
            AgentError(
                agent_name="BudgetAgent",
                error_code="BUDGET_CALCULATION_FAILED",
                message=str(exc),
                recoverable=False,
            )
        )
        return {
            "budget_breakdown": None,
            "optimization_targets": [],
            "optimization_context": None,
            "errors": errors,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "termination_reason": "NON_RECOVERABLE_ERROR",
        }

    warnings.extend(
        budget_agent.collect_data_quality_warnings(
            request=parsed,
            itinerary_days=itinerary_days,
            candidate_pool=candidate_pool,
            selected_hotel=selected_hotel,
        )
    )

    trace_logs.append(
        AgentTraceLog(
            agent_name="BudgetAgent",
            stage=breakdown.status,
            status="COMPLETED",
            message=(
                f"total={breakdown.total_calculated:,} / "
                f"budget={breakdown.max_budget:,}; "
                f"status={breakdown.status}; loop={loop_count}"
            ),
            duration_ms=int((perf_counter() - started) * 1000),
        )
    )

    previous_total = (
        previous_context.previous_total
        if previous_context is not None and loop_count > 0
        else None
    )

    progress_made: Optional[bool]
    optimization_stalled = False
    termination_reason: Optional[TerminationReason] = None

    if breakdown.status == "BUDGET_OK":
        progress_made = previous_total is None or breakdown.total_calculated < previous_total
        termination_reason = "BUDGET_OK"
    else:
        progress_made = (
            None
            if previous_total is None
            else breakdown.total_calculated < previous_total
        )
        if previous_total is not None and not progress_made:
            optimization_stalled = True
            termination_reason = "NO_PROGRESS"
        elif not targets:
            termination_reason = "NO_TARGETS"
        elif loop_count >= MAX_OPTIMIZATION_LOOPS:
            termination_reason = "MAX_LOOPS"

    context = base_context.model_copy(
        update={
            "progress_made": progress_made,
            "termination_reason": termination_reason,
        }
    )

    best_itinerary = state.get("best_itinerary_days")
    best_breakdown = state.get("best_budget_breakdown")
    best_selected_hotel = state.get("best_selected_hotel")
    best_selected_place_ids = list(state.get("best_selected_place_ids") or [])
    best_over = float(state.get("best_over_amount", 10**18))

    current_over = breakdown.over_amount if breakdown.status == "OVER_BUDGET" else 0
    if current_over < best_over:
        best_itinerary = _clone_days(itinerary_days)
        best_breakdown = breakdown.model_copy(deep=True)
        best_selected_hotel = _clone_place(selected_hotel)
        best_selected_place_ids = list(state.get("selected_place_ids") or [])
        best_over = current_over

    if breakdown.status == "OVER_BUDGET" and termination_reason is None:
        warnings.append(
            f"Vượt ngân sách {breakdown.over_amount:,} VND. "
            f"Bắt đầu tối ưu lần {loop_count + 1}."
        )

    if optimization_stalled:
        warnings.append(
            "Dừng tối ưu vì phương án mới không làm giảm tổng chi phí so với vòng trước."
        )
    elif termination_reason == "NO_TARGETS":
        warnings.append(
            "Không tìm thấy thay đổi an toàn nào có thể giảm tiếp ngân sách."
        )

    return {
        "budget_breakdown": breakdown,
        "optimization_targets": targets,
        "optimization_context": context,
        "best_itinerary_days": best_itinerary,
        "best_budget_breakdown": best_breakdown,
        "best_selected_hotel": best_selected_hotel,
        "best_selected_place_ids": best_selected_place_ids,
        "best_over_amount": best_over,
        "optimization_stalled": optimization_stalled,
        "termination_reason": termination_reason,
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }


def optimization_node(state: TravelPlanState) -> Dict[str, Any]:
    loop_count = state.get("loop_count", 0) + 1
    trace_logs = list(state.get("trace_logs", []))
    trace_logs.append(
        AgentTraceLog(
            agent_name="GraphOrchestrator",
            stage="OPTIMIZING",
            status="OPTIMIZING",
            message=f"Kích hoạt replan lần {loop_count}/{MAX_OPTIMIZATION_LOOPS}.",
        )
    )
    return {
        "loop_count": loop_count,
        "optimization_stalled": False,
        "trace_logs": trace_logs,
    }


def exhausted_node(state: TravelPlanState) -> Dict[str, Any]:
    warnings = list(state.get("warnings", []))
    trace_logs = list(state.get("trace_logs", []))
    errors = list(state.get("errors", []))
    reason = state.get("termination_reason")

    if reason is None:
        if _fatal_errors(errors):
            reason = "NON_RECOVERABLE_ERROR"
        elif state.get("optimization_stalled"):
            reason = "NO_PROGRESS"
        elif state.get("loop_count", 0) >= MAX_OPTIMIZATION_LOOPS:
            reason = "MAX_LOOPS"
        elif not state.get("optimization_targets"):
            reason = "NO_TARGETS"
        else:
            reason = "BUDGET_UNAVAILABLE"

    if reason == "MAX_LOOPS":
        warnings.append(
            f"Đã đạt giới hạn {MAX_OPTIMIZATION_LOOPS} vòng tối ưu. "
            "Trả về phương án tốt nhất tìm được."
        )
    elif reason == "NO_PROGRESS":
        warnings.append(
            "Tối ưu đã dừng vì vòng mới không cải thiện tổng chi phí. "
            "Trả về phương án tốt nhất tìm được."
        )
    elif reason == "NO_TARGETS":
        warnings.append(
            "Không còn target tối ưu hóa an toàn. Trả về phương án tốt nhất tìm được."
        )

    trace_logs.append(
        AgentTraceLog(
            agent_name="GraphOrchestrator",
            stage="OPTIMIZATION_TERMINATED",
            status="COMPLETED",
            message=f"Optimization terminated with reason={reason}.",
        )
    )

    best_itinerary = state.get("best_itinerary_days") or state.get("itinerary_days")
    best_breakdown = state.get("best_budget_breakdown") or state.get("budget_breakdown")
    best_hotel = (
        state.get("best_selected_hotel")
        if state.get("best_selected_hotel") is not None
        else state.get("selected_hotel")
    )
    best_place_ids = list(
        state.get("best_selected_place_ids")
        or state.get("selected_place_ids")
        or []
    )

    optimization_exhausted = reason in TERMINAL_OPTIMIZATION_REASONS

    return {
        "itinerary_days": _clone_days(best_itinerary) or [],
        "budget_breakdown": (
            best_breakdown.model_copy(deep=True)
            if best_breakdown is not None
            else None
        ),
        "selected_hotel": _clone_place(best_hotel),
        "selected_place_ids": best_place_ids,
        "optimization_exhausted": optimization_exhausted,
        "termination_reason": reason,
        "warnings": warnings,
        "trace_logs": trace_logs,
    }


def finalize_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    itinerary_days = list(state.get("itinerary_days") or [])
    budget_breakdown = state.get("budget_breakdown")
    selected_hotel = state.get("selected_hotel")
    optimization_exhausted = state.get("optimization_exhausted", False)
    termination_reason = state.get("termination_reason")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    if _fatal_errors(errors):
        trace_logs.append(
            AgentTraceLog(
                agent_name="Finalize",
                stage="FINALIZE",
                status="FAILED",
                message="Không finalize vì còn non-recoverable error.",
            )
        )
        return {
            "final_plan": None,
            "final_response_text": (
                "Không thể hoàn tất kế hoạch do hệ thống gặp lỗi không thể tự khắc phục."
            ),
            "trace_logs": trace_logs,
            "warnings": warnings,
        }

    if parsed is None or budget_breakdown is None or not itinerary_days:
        return {
            "final_plan": None,
            "final_response_text": "Không thể hoàn tất kế hoạch du lịch.",
            "trace_logs": trace_logs,
            "warnings": warnings,
        }

    final_plan = FinalTripPlan(
        destination_city=parsed.destination_city,
        duration_days=parsed.duration_days,
        num_travelers=parsed.num_travelers,
        total_budget=parsed.total_budget,
        itinerary_days=itinerary_days,
        budget_breakdown=budget_breakdown,
        selected_hotel=selected_hotel,
    )

    if budget_breakdown.status == "BUDGET_OK":
        response_text = (
            f"✅ Kế hoạch {parsed.duration_days} ngày tại {parsed.destination_city} "
            f"dành cho {parsed.num_travelers} người đã sẵn sàng! "
            f"Tổng chi phí dự tính: {budget_breakdown.total_calculated:,} VND "
            f"(còn dư {budget_breakdown.remaining:,} VND)."
        )
    elif optimization_exhausted:
        reason_text = {
            "MAX_LOOPS": f"đã thử tối đa {MAX_OPTIMIZATION_LOOPS} vòng",
            "NO_PROGRESS": "không còn tạo được vòng tối ưu có tiến bộ",
            "NO_TARGETS": "không còn target giảm chi phí an toàn",
        }.get(
            termination_reason,
            "đã kết thúc quá trình tối ưu",
        )
        response_text = (
            f"⚠️ Kế hoạch {parsed.duration_days} ngày tại {parsed.destination_city} "
            f"đã được lập nhưng vẫn vượt ngân sách {budget_breakdown.over_amount:,} VND; "
            f"{reason_text}. "
            "Hệ thống trả về phương án có chi phí thấp nhất trong các phương án hợp lệ đã thử."
        )
    else:
        response_text = (
            f"Kế hoạch {parsed.duration_days} ngày tại {parsed.destination_city} hoàn thành "
            f"nhưng vượt ngân sách {budget_breakdown.over_amount:,} VND."
        )

    if warnings:
        response_text += " Có một số cảnh báo cần xem lại trong chi tiết kế hoạch."

    trace_logs.append(
        AgentTraceLog(
            agent_name="Finalize",
            stage="FINALIZE",
            status="COMPLETED",
            message=f"FinalTripPlan ready; status={budget_breakdown.status}",
        )
    )

    return {
        "final_plan": final_plan,
        "final_response_text": response_text,
        "trace_logs": trace_logs,
        "warnings": warnings,
    }
```

---

# `app/graph/travel_graph.py`

```python
"""LangGraph travel planning graph — điều phối 4 agent và bounded optimization loop."""
from __future__ import annotations

from typing import Literal

from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    budget_node,
    clarification_node,
    destination_node,
    exhausted_node,
    finalize_node,
    general_chat_node,
    itinerary_node,
    optimization_node,
    supervisor_node,
)
from app.models.state import MAX_OPTIMIZATION_LOOPS, TravelPlanState

SupervisorRoute = Literal["destination", "clarification", "general_chat"]
BudgetRoute = Literal["finalize", "optimize", "exhausted"]


def route_supervisor_intent(state: TravelPlanState) -> SupervisorRoute:
    intent = state.get("intent")
    if intent == "CREATE_PLAN":
        return "destination"
    if intent == "CLARIFICATION_NEEDED":
        return "clarification"
    return "general_chat"


def route_budget_result(state: TravelPlanState) -> BudgetRoute:
    errors = list(state.get("errors", []))
    if any(not error.recoverable for error in errors):
        return "exhausted"

    breakdown = state.get("budget_breakdown")
    if breakdown is None:
        return "exhausted"

    if breakdown.status == "BUDGET_OK":
        return "finalize"

    # Không được loop nếu vòng vừa rồi không cải thiện.
    if state.get("optimization_stalled"):
        return "exhausted"

    # Không có action target -> không có lý do để gọi lại itinerary.
    if not state.get("optimization_targets"):
        return "exhausted"

    if state.get("loop_count", 0) < MAX_OPTIMIZATION_LOOPS:
        return "optimize"

    return "exhausted"


def build_travel_graph():
    graph = StateGraph(TravelPlanState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("clarification", clarification_node)
    graph.add_node("general_chat", general_chat_node)
    graph.add_node("destination", destination_node)
    graph.add_node("itinerary", itinerary_node)
    graph.add_node("budget", budget_node)
    graph.add_node("optimize", optimization_node)
    graph.add_node("exhausted", exhausted_node)
    graph.add_node("finalize", finalize_node)

    graph.set_entry_point("supervisor")

    graph.add_conditional_edges(
        "supervisor",
        route_supervisor_intent,
        {
            "destination": "destination",
            "clarification": "clarification",
            "general_chat": "general_chat",
        },
    )

    graph.add_edge("clarification", END)
    graph.add_edge("general_chat", END)

    graph.add_edge("destination", "itinerary")
    graph.add_edge("itinerary", "budget")

    graph.add_conditional_edges(
        "budget",
        route_budget_result,
        {
            "finalize": "finalize",
            "optimize": "optimize",
            "exhausted": "exhausted",
        },
    )

    graph.add_edge("optimize", "itinerary")
    graph.add_edge("exhausted", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()


travel_graph = build_travel_graph()
```

---

# `app/models/state.py`

```python
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict

from app.schemas.budget import BudgetBreakdown, OptimizationContext, OptimizationTarget
from app.schemas.common import AgentError, AgentTraceLog
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.schemas.travel_plan import FinalTripPlan


MAX_OPTIMIZATION_LOOPS = 3

TerminationReason = Literal[
    "BUDGET_OK",
    "MAX_LOOPS",
    "NO_PROGRESS",
    "NO_TARGETS",
    "NON_RECOVERABLE_ERROR",
    "BUDGET_UNAVAILABLE",
]


class TravelPlanState(TypedDict):
    # 1. INPUT
    session_id: str
    user_id: Optional[str]
    raw_prompt: str
    user_preferences: Optional[Dict[str, Any]]

    # 2. SUPERVISOR
    intent: Optional[Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]]
    clarification_question: Optional[str]
    parsed_request: Optional[ParsedUserRequest]

    # 3. DESTINATION
    candidate_pool: List[PlaceCandidate]
    selected_place_ids: List[str]
    selected_hotel: Optional[PlaceCandidate]

    # 4. ITINERARY
    itinerary_days: List[DayItinerary]

    # 5. BUDGET
    budget_breakdown: Optional[BudgetBreakdown]

    # 6. OPTIMIZATION CONTROL
    optimization_targets: List[OptimizationTarget]
    optimization_context: Optional[OptimizationContext]
    loop_count: int
    max_loops: int
    optimization_exhausted: bool
    optimization_stalled: bool
    termination_reason: Optional[TerminationReason]

    # Best-plan snapshot: các field này phải restore cùng nhau.
    best_itinerary_days: Optional[List[DayItinerary]]
    best_budget_breakdown: Optional[BudgetBreakdown]
    best_selected_hotel: Optional[PlaceCandidate]
    best_selected_place_ids: List[str]
    best_over_amount: float

    # 7. OBSERVABILITY / RESILIENCE
    trace_logs: List[AgentTraceLog]
    warnings: List[str]
    errors: List[AgentError]

    # 8. FINAL
    final_plan: Optional[FinalTripPlan]
    final_response_text: Optional[str]
```

---

# `app/schemas/budget.py`

```python
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class BudgetBreakdown(BaseModel):
    hotel_cost: int = Field(default=0, ge=0)
    food_cost: int = Field(default=0, ge=0)
    ticket_cost: int = Field(default=0, ge=0)
    transport_cost: int = Field(default=0, ge=0)
    subtotal: int = Field(default=0, ge=0)
    misc_cost: int = Field(default=0, ge=0)
    total_calculated: int = Field(default=0, ge=0)
    max_budget: int = Field(default=0, ge=0)
    remaining: int = Field(default=0, ge=0)
    status: Literal["BUDGET_OK", "OVER_BUDGET"]
    over_amount: int = Field(default=0, ge=0)


class OptimizationTarget(BaseModel):
    target_category: Literal["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"]
    day_number: Optional[int] = Field(default=None, ge=1)
    slot_index: Optional[int] = Field(default=None, ge=0)
    current_place_id: str = Field(..., min_length=1)
    current_cost: int = Field(..., ge=0)
    target_reduction: int = Field(..., ge=0)
    reason: str = Field(..., min_length=1)


class OptimizationContext(BaseModel):
    previous_total: int = Field(default=0, ge=0)
    target_reduction_total: int = Field(default=0, ge=0)
    affected_days: List[int] = Field(default_factory=list)
    iteration_summary: str = ""
    progress_made: Optional[bool] = None
    termination_reason: Optional[
        Literal[
            "BUDGET_OK",
            "MAX_LOOPS",
            "NO_PROGRESS",
            "NO_TARGETS",
            "NON_RECOVERABLE_ERROR",
            "BUDGET_UNAVAILABLE",
        ]
    ] = None
```

---

# `app/schemas/common.py`

```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Provenance(BaseModel):
    """
    Nguồn gốc bản ghi.

    is_estimate=True chỉ có nghĩa bản ghi chứa ít nhất một trường ước tính
    (ví dụ priceLevel -> estimated cost), không có nghĩa tên/tọa độ/rating là giả lập.
    """

    source: Literal[
        "GOOGLE_PLACES",
        "GOOGLE_ROUTES",
        "INTERNAL_DATABASE",
        "INTERNAL_ESTIMATE",
        "USER_INPUT",
    ]
    source_id: Optional[str] = None
    retrieved_at: str = Field(default_factory=utc_now_iso)
    is_estimate: bool = False


class AgentError(BaseModel):
    agent_name: Literal[
        "Supervisor",
        "DestinationAgent",
        "ItineraryAgent",
        "BudgetAgent",
        "GraphOrchestrator",
    ]
    error_code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    timestamp: str = Field(default_factory=utc_now_iso)
    recoverable: bool = True


class AgentTraceLog(BaseModel):
    agent_name: str
    stage: str
    status: Literal[
        "STARTED",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "OPTIMIZING",
        "SKIPPED",
    ]
    message: str
    duration_ms: Optional[int] = Field(default=None, ge=0)
    timestamp: str = Field(default_factory=utc_now_iso)
```

---

# `app/schemas/itinerary.py`

```python
from __future__ import annotations

from datetime import time
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import Provenance


class TimeSlot(BaseModel):
    slot_type: Literal["MORNING", "LUNCH", "AFTERNOON", "DINNER", "EVENING"]
    start_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    place_id: str = Field(..., min_length=1)
    place_name: str = Field(..., min_length=1)
    activity_description: str = ""
    reason_codes: List[str] = Field(default_factory=list)
    estimated_cost: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_time_range(self) -> "TimeSlot":
        start = time.fromisoformat(self.start_time)
        end = time.fromisoformat(self.end_time)
        if end <= start:
            raise ValueError("end_time phải lớn hơn start_time trong cùng một ngày")
        return self


class RouteSegment(BaseModel):
    from_place_id: str = Field(..., min_length=1)
    to_place_id: str = Field(..., min_length=1)
    distance_km: float = Field(default=0.0, ge=0.0)
    duration_minutes: int = Field(default=0, ge=0)
    provenance: Provenance


class DayItinerary(BaseModel):
    day_number: int = Field(..., ge=1)
    date_label: Optional[str] = None
    time_slots: List[TimeSlot] = Field(default_factory=list)
    route_segments: List[RouteSegment] = Field(default_factory=list)
    total_travel_distance_km: float = Field(default=0.0, ge=0.0)
    total_travel_time_minutes: int = Field(default=0, ge=0)
    daily_cost: int = Field(default=0, ge=0)
```

---

# `app/schemas/place.py`

```python
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import Provenance


BusinessStatus = Literal[
    "OPERATIONAL",
    "CLOSED_TEMPORARILY",
    "CLOSED_PERMANENTLY",
    "FUTURE_OPENING",
]


class PlaceCandidate(BaseModel):
    place_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    category: Literal["ATTRACTION", "CAFE", "RESTAURANT", "HOTEL"]
    interests: List[str] = Field(default_factory=list)
    rating: Optional[float] = Field(default=None, ge=0.0, le=5.0)
    user_ratings_total: int = Field(default=0, ge=0)
    address: str = ""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    opening_hours: Optional[Dict[str, Any]] = None
    # Google currentOpeningHours: 7-day window including special-day adjustments.
    current_opening_hours: Optional[Dict[str, Any]] = None
    business_status: Optional[BusinessStatus] = None

    estimated_cost_per_person: Optional[int] = Field(
        default=None,
        ge=0,
        description=(
            "Chi phí ước tính theo người/lượt. None nghĩa là chưa biết; "
            "0 chỉ dùng khi xác định là miễn phí."
        ),
    )
    ticket_price: Optional[int] = Field(
        default=None,
        ge=0,
        description="Giá vé/admission theo người. None nghĩa là provider không cung cấp/không xác định.",
    )
    estimated_room_cost_per_night: Optional[int] = Field(
        default=None,
        ge=0,
        description="Giá phòng ước tính/phòng/đêm; None nếu chưa xác định.",
    )

    provenance: Provenance
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    reason_codes: List[str] = Field(default_factory=list)
```

---

# `app/schemas/request.py`

```python
from __future__ import annotations

from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ParsedUserRequest(BaseModel):
    destination_city: str
    duration_days: int = Field(ge=1, le=14)
    num_travelers: int = Field(ge=1, le=50)
    total_budget: int = Field(ge=0, description="Tổng ngân sách chuyến đi tính bằng VND nguyên")
    interests: List[str] = Field(default_factory=list)
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED"
    travel_pace: Literal["RELAXED", "MODERATE", "FAST"] = "MODERATE"
    hotel_preference: Optional[str] = None
    start_date: Optional[date] = None
```

---

# `app/schemas/supervisor.py`

```python
from __future__ import annotations

from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


SupervisorIntent = Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]


class SupervisorParseResult(BaseModel):
    intent: SupervisorIntent
    destination_city: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=14)
    num_travelers: Optional[int] = Field(default=None, ge=1, le=50)
    total_budget: Optional[int] = Field(default=None, ge=0)
    interests: List[str] = Field(default_factory=list)
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED"
    travel_pace: Literal["RELAXED", "MODERATE", "FAST"] = "MODERATE"
    travel_style_explicit: bool = False
    travel_pace_explicit: bool = False
    hotel_preference: Optional[str] = None
    start_date: Optional[date] = None
    missing_fields: List[str] = Field(default_factory=list)
    clarification_question: Optional[str] = None
    response_text: Optional[str] = None
```

---

# `app/schemas/travel_plan.py`

```python
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.budget import BudgetBreakdown
from app.schemas.common import utc_now_iso
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate


class FinalTripPlan(BaseModel):
    destination_city: str
    duration_days: int
    num_travelers: int
    total_budget: int
    itinerary_days: List[DayItinerary] = Field(default_factory=list)
    budget_breakdown: BudgetBreakdown
    selected_hotel: Optional[PlaceCandidate] = None
    generated_at: str = Field(default_factory=utc_now_iso)
```

---

# `app/tools/cost.py`

```python
from __future__ import annotations

from typing import Dict, Literal, Optional

from app.schemas.budget import BudgetBreakdown


COST_TABLE: Dict[str, Dict[str, int]] = {
    "BUDGET": {
        "hotel_per_room": 300_000,
        "meal_per_person_day": 180_000,
    },
    "BALANCED": {
        "hotel_per_room": 700_000,
        "meal_per_person_day": 350_000,
    },
    "LUXURY": {
        "hotel_per_room": 1_500_000,
        "meal_per_person_day": 750_000,
    },
}

DEFAULT_TRANSPORT_RATE_PER_KM = 10_000
MISC_CONTINGENCY_PERCENT = 10


def calculate_rooms(num_travelers: int) -> int:
    if num_travelers <= 0:
        raise ValueError("num_travelers phải lớn hơn 0")
    return (num_travelers + 1) // 2


def calculate_budget(
    *,
    num_travelers: int,
    num_days: int,
    num_nights: int,
    max_budget: int,
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED",
    ticket_cost: int = 0,
    transport_cost: int = 0,
    explicit_hotel_cost: Optional[int] = None,
    explicit_food_cost: Optional[int] = None,
) -> BudgetBreakdown:
    if travel_style not in COST_TABLE:
        raise ValueError(f"travel_style không hợp lệ: {travel_style!r}")
    if num_travelers <= 0:
        raise ValueError("num_travelers phải lớn hơn 0")
    if num_days <= 0:
        raise ValueError("num_days phải lớn hơn 0")
    if num_nights < 0 or num_nights > num_days - 1:
        raise ValueError("num_nights phải nằm trong khoảng 0..num_days-1")

    numeric_values = {
        "max_budget": max_budget,
        "ticket_cost": ticket_cost,
        "transport_cost": transport_cost,
    }
    if explicit_hotel_cost is not None:
        numeric_values["explicit_hotel_cost"] = explicit_hotel_cost
    if explicit_food_cost is not None:
        numeric_values["explicit_food_cost"] = explicit_food_cost

    for name, value in numeric_values.items():
        if value < 0:
            raise ValueError(f"{name} không được âm")

    rates = COST_TABLE[travel_style]
    rooms = calculate_rooms(num_travelers)

    hotel_cost = (
        explicit_hotel_cost
        if explicit_hotel_cost is not None
        else rooms * num_nights * rates["hotel_per_room"]
    )
    food_cost = (
        explicit_food_cost
        if explicit_food_cost is not None
        else num_travelers * num_days * rates["meal_per_person_day"]
    )

    subtotal = hotel_cost + food_cost + ticket_cost + transport_cost
    misc_cost = subtotal * MISC_CONTINGENCY_PERCENT // 100
    total_calculated = subtotal + misc_cost
    is_ok = total_calculated <= max_budget

    return BudgetBreakdown(
        hotel_cost=hotel_cost,
        food_cost=food_cost,
        ticket_cost=ticket_cost,
        transport_cost=transport_cost,
        subtotal=subtotal,
        misc_cost=misc_cost,
        total_calculated=total_calculated,
        max_budget=max_budget,
        remaining=max(0, max_budget - total_calculated),
        status="BUDGET_OK" if is_ok else "OVER_BUDGET",
        over_amount=max(0, total_calculated - max_budget),
    )
```

---

# `app/tools/places.py`

```python
from __future__ import annotations

from abc import ABC, abstractmethod
import logging
import re
from typing import Any, List, Optional

import httpx

from app.core.config import settings
from app.data.offline_places import OFFLINE_PLACES_DATA
from app.schemas.common import Provenance, utc_now_iso
from app.schemas.place import BusinessStatus, PlaceCandidate

logger = logging.getLogger(__name__)


class PlacesProvider(ABC):
    @abstractmethod
    def search_places(
        self,
        city: str,
        categories: Optional[List[str]] = None,
    ) -> List[PlaceCandidate]:
        raise NotImplementedError

    def search_places_for_capacity(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        max_results: Optional[int] = None,
    ) -> List[PlaceCandidate]:
        """Capacity-aware API with backward-compatible default behavior.

        Providers that support pagination can override this method. A custom test
        provider only needs the original search_places method and automatically
        remains compatible with DestinationAgent.
        """
        results = self.search_places(city, categories)
        if max_results is None or max_results <= 0:
            return results
        return results[:max_results]


class OfflinePlacesProvider(PlacesProvider):
    def search_places(
        self,
        city: str,
        categories: Optional[List[str]] = None,
    ) -> List[PlaceCandidate]:
        matched_city = next(
            (
                key
                for key in OFFLINE_PLACES_DATA
                if key.casefold() == city.casefold()
                or key.casefold() in city.casefold()
                or city.casefold() in key.casefold()
            ),
            None,
        )
        if not matched_city:
            logger.warning("Offline catalog không có dữ liệu cho %s", city)
            return []

        candidates = OFFLINE_PLACES_DATA[matched_city]
        if categories:
            allowed = {category.upper() for category in categories}
            candidates = [
                candidate
                for candidate in candidates
                if (candidate.category or "").upper() in allowed
            ]
        return [candidate.model_copy(deep=True) for candidate in candidates]

    def search_places_for_capacity(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        max_results: Optional[int] = None,
    ) -> List[PlaceCandidate]:
        results = self.search_places(city, categories)
        if max_results is None or max_results <= 0:
            return results
        return results[:max_results]


class GooglePlacesProvider(PlacesProvider):
    PLACES_API_NEW_URL = "https://places.googleapis.com/v1/places:searchText"
    FIELD_MASK = (
        "places.id,places.displayName,places.formattedAddress,"
        "places.location,places.rating,places.userRatingCount,"
        "places.priceLevel,places.primaryType,places.types,"
        "places.regularOpeningHours,places.currentOpeningHours,"
        "places.businessStatus,nextPageToken"
    )

    TYPE_MAP = {
        "HOTEL": "lodging",
        "RESTAURANT": "restaurant",
        "CAFE": "cafe",
        "ATTRACTION": "tourist_attraction",
    }

    MAX_API_PAGES = 3
    API_PAGE_SIZE = 20

    def __init__(
        self,
        fallback_provider: Optional[PlacesProvider] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.fallback = fallback_provider or OfflinePlacesProvider()
        self.api_key = settings.google_maps_api_key
        self._http_client = http_client

    def search_places(
        self,
        city: str,
        categories: Optional[List[str]] = None,
    ) -> List[PlaceCandidate]:
        return self.search_places_for_capacity(
            city=city,
            categories=categories,
            max_results=self.API_PAGE_SIZE,
        )

    def search_places_for_capacity(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        max_results: Optional[int] = None,
    ) -> List[PlaceCandidate]:
        requested_capacity = self.API_PAGE_SIZE if max_results is None else max_results
        requested_capacity = max(1, min(int(requested_capacity), 60))

        if not self.api_key:
            return self.fallback.search_places_for_capacity(
                city,
                categories,
                requested_capacity,
            )

        query = self._build_query(city, categories)
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK,
        }

        normalized: List[PlaceCandidate] = []
        seen: set[str] = set()
        page_token: Optional[str] = None

        for page_index in range(self.MAX_API_PAGES):
            remaining = requested_capacity - len(normalized)
            if remaining <= 0:
                break

            body: dict[str, Any] = {
                "textQuery": query,
                "languageCode": "vi",
                "pageSize": min(self.API_PAGE_SIZE, remaining),
            }

            if categories and len(categories) == 1:
                included_type = self.TYPE_MAP.get(categories[0].upper())
                if included_type:
                    body["includedType"] = included_type
                    body["strictTypeFiltering"] = True

            if page_token:
                body["pageToken"] = page_token

            response_json: Optional[dict[str, Any]] = None
            last_error: Optional[Exception] = None

            for attempt in range(2):
                try:
                    response = self._post(body, headers)
                    if response.status_code != 200:
                        raise RuntimeError(
                            f"Google Places HTTP {response.status_code}"
                        )
                    response_json = response.json()
                    break
                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_error = exc
                    logger.warning(
                        "Google Places timeout/transport page=%s attempt=%s/2",
                        page_index + 1,
                        attempt + 1,
                    )
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "Google Places lỗi page=%s attempt=%s/2: %s",
                        page_index + 1,
                        attempt + 1,
                        exc,
                    )
                    break

            if response_json is None:
                if last_error:
                    logger.warning("Google Places fallback offline: %s", last_error)
                break

            places_raw = response_json.get("places", []) or []
            for item in places_raw:
                candidate = self._normalize_google_place(item)
                if candidate is None or candidate.place_id in seen:
                    continue
                if categories and (candidate.category or "").upper() not in {
                    category.upper() for category in categories
                }:
                    continue
                seen.add(candidate.place_id)
                normalized.append(candidate)
                if len(normalized) >= requested_capacity:
                    break

            if len(normalized) >= requested_capacity:
                break

            page_token = response_json.get("nextPageToken")
            if not page_token:
                break

        if normalized:
            return normalized[:requested_capacity]

        logger.warning(
            "Google Places không có candidate usable cho %s; dùng offline fallback",
            city,
        )
        return self.fallback.search_places_for_capacity(
            city,
            categories,
            requested_capacity,
        )

    def _post(
        self,
        body: dict[str, Any],
        headers: dict[str, str],
    ) -> httpx.Response:
        timeout = settings.google_places_timeout_seconds
        if self._http_client:
            return self._http_client.post(
                self.PLACES_API_NEW_URL,
                headers=headers,
                json=body,
                timeout=timeout,
            )
        with httpx.Client(timeout=timeout) as client:
            return client.post(
                self.PLACES_API_NEW_URL,
                headers=headers,
                json=body,
            )

    def _build_query(self, city: str, categories: Optional[List[str]]) -> str:
        if categories and len(categories) == 1:
            category = categories[0].upper()
            mapping = {
                "HOTEL": f"hotels in {city} Vietnam",
                "RESTAURANT": f"restaurants in {city} Vietnam",
                "CAFE": f"cafes in {city} Vietnam",
                "ATTRACTION": f"tourist attractions in {city} Vietnam",
            }
            if category in mapping:
                return mapping[category]
        return f"places to visit in {city} Vietnam"

    def _normalize_google_place(self, item: dict[str, Any]) -> Optional[PlaceCandidate]:
        try:
            location = item.get("location") or item.get("geometry", {}).get("location", {})
            lat = location.get("latitude") if "latitude" in location else location.get("lat")
            lng = location.get("longitude") if "longitude" in location else location.get("lng")
            if lat is None or lng is None:
                return None
            if float(lat) == 0.0 and float(lng) == 0.0:
                return None

            place_id = item.get("id") or item.get("place_id")
            display_name = item.get("displayName")
            name = (
                display_name.get("text")
                if isinstance(display_name, dict)
                else item.get("name")
            )
            if not place_id or not name:
                return None

            primary_type = item.get("primaryType")
            types = item.get("types", []) or []
            category = (
                self._map_primary_type_to_category(primary_type)
                if primary_type
                else None
            )
            category = category or self._map_google_types_to_category(types)
            if category is None:
                return None

            price_level = (
                item.get("priceLevel")
                if "priceLevel" in item
                else item.get("price_level")
            )
            estimate = self._map_price_level_to_estimated_cost(price_level)
            room_cost = (
                self._map_hotel_price_level_to_room_cost(price_level)
                if category == "HOTEL"
                else None
            )
            has_estimate = estimate is not None or room_cost is not None

            rating_raw = item.get("rating")
            reviews_raw = (
                item.get("userRatingCount")
                if "userRatingCount" in item
                else item.get("user_ratings_total")
            )

            business_status = item.get("businessStatus")
            if business_status not in {
                "OPERATIONAL",
                "CLOSED_TEMPORARILY",
                "CLOSED_PERMANENTLY",
                "FUTURE_OPENING",
                None,
            }:
                business_status = None

            return PlaceCandidate(
                place_id=str(place_id),
                name=str(name),
                category=category,
                interests=self._extract_interests_from_types(types),
                rating=float(rating_raw) if rating_raw is not None else None,
                user_ratings_total=int(reviews_raw) if reviews_raw is not None else 0,
                address=item.get("formattedAddress") or item.get("formatted_address", ""),
                latitude=float(lat),
                longitude=float(lng),
                opening_hours=item.get("regularOpeningHours"),
                current_opening_hours=item.get("currentOpeningHours"),
                business_status=business_status,
                estimated_cost_per_person=(
                    None if category == "HOTEL" else estimate
                ),
                ticket_price=None,
                estimated_room_cost_per_night=room_cost,
                provenance=Provenance(
                    source="GOOGLE_PLACES",
                    source_id=str(place_id),
                    retrieved_at=utc_now_iso(),
                    is_estimate=has_estimate,
                ),
            )
        except (TypeError, ValueError, AttributeError):
            logger.debug(
                "Bỏ qua Google Place có format không hợp lệ",
                exc_info=True,
            )
            return None

    def _map_price_level_to_estimated_cost(self, value: Any) -> Optional[int]:
        new_map = {
            "PRICE_LEVEL_FREE": 0,
            "PRICE_LEVEL_INEXPENSIVE": 70_000,
            "PRICE_LEVEL_MODERATE": 180_000,
            "PRICE_LEVEL_EXPENSIVE": 400_000,
            "PRICE_LEVEL_VERY_EXPENSIVE": 900_000,
        }
        legacy_map = {0: 0, 1: 70_000, 2: 180_000, 3: 400_000, 4: 900_000}
        if isinstance(value, str):
            return new_map.get(value)
        if isinstance(value, int):
            return legacy_map.get(value)
        return None

    def _map_hotel_price_level_to_room_cost(self, value: Any) -> Optional[int]:
        new_map = {
            "PRICE_LEVEL_INEXPENSIVE": 500_000,
            "PRICE_LEVEL_MODERATE": 900_000,
            "PRICE_LEVEL_EXPENSIVE": 1_800_000,
            "PRICE_LEVEL_VERY_EXPENSIVE": 3_500_000,
        }
        legacy_map = {1: 500_000, 2: 900_000, 3: 1_800_000, 4: 3_500_000}
        if isinstance(value, str):
            return new_map.get(value)
        if isinstance(value, int):
            return legacy_map.get(value)
        return None

    def _map_primary_type_to_category(self, primary_type: str) -> Optional[str]:
        p = primary_type.lower()
        exact = {
            "lodging": "HOTEL",
            "hotel": "HOTEL",
            "resort_hotel": "HOTEL",
            "bed_and_breakfast": "HOTEL",
            "guest_house": "HOTEL",
            "hostel": "HOTEL",
            "motel": "HOTEL",
            "inn": "HOTEL",
            "cafe": "CAFE",
            "coffee_shop": "CAFE",
            "tea_house": "CAFE",
            "restaurant": "RESTAURANT",
            "meal_takeaway": "RESTAURANT",
            "meal_delivery": "RESTAURANT",
            "bakery": "RESTAURANT",
            "bar": "RESTAURANT",
            "food": "RESTAURANT",
            "food_court": "RESTAURANT",
            "tourist_attraction": "ATTRACTION",
            "amusement_park": "ATTRACTION",
            "aquarium": "ATTRACTION",
            "art_gallery": "ATTRACTION",
            "beach": "ATTRACTION",
            "campground": "ATTRACTION",
            "church": "ATTRACTION",
            "hindu_temple": "ATTRACTION",
            "museum": "ATTRACTION",
            "national_park": "ATTRACTION",
            "natural_feature": "ATTRACTION",
            "park": "ATTRACTION",
            "place_of_worship": "ATTRACTION",
            "point_of_interest": "ATTRACTION",
            "stadium": "ATTRACTION",
            "zoo": "ATTRACTION",
            "historical_landmark": "ATTRACTION",
            "monument": "ATTRACTION",
            "botanical_garden": "ATTRACTION",
            "scenic_viewpoint": "ATTRACTION",
        }
        if p in exact:
            return exact[p]
        if p.endswith("_restaurant"):
            return "RESTAURANT"
        if p.endswith("_cafe") or p.endswith("_coffee_shop"):
            return "CAFE"
        if p.endswith("_hotel") or p.endswith("_resort") or p.endswith("_lodging"):
            return "HOTEL"
        if p.endswith("_park") or p.endswith("_museum") or p.endswith("_garden"):
            return "ATTRACTION"
        return None

    def _map_google_types_to_category(self, types: List[str]) -> Optional[str]:
        types_set = {t.lower() for t in types}
        if types_set & {
            "lodging",
            "hotel",
            "resort",
            "resort_hotel",
            "bed_and_breakfast",
            "guest_house",
            "hostel",
            "motel",
            "inn",
        }:
            return "HOTEL"
        if types_set & {"cafe", "coffee_shop", "tea_house"}:
            return "CAFE"
        if types_set & {
            "restaurant",
            "food",
            "meal_takeaway",
            "meal_delivery",
            "bakery",
            "bar",
            "food_court",
        }:
            return "RESTAURANT"
        if types_set & {
            "tourist_attraction",
            "point_of_interest",
            "park",
            "natural_feature",
            "museum",
            "art_gallery",
            "amusement_park",
            "aquarium",
            "zoo",
            "beach",
            "church",
            "hindu_temple",
            "place_of_worship",
            "campground",
            "stadium",
            "national_park",
            "historical_landmark",
            "monument",
            "botanical_garden",
            "scenic_viewpoint",
        }:
            return "ATTRACTION"
        return None

    def _extract_interests_from_types(self, types: List[str]) -> List[str]:
        values = {t.lower() for t in types}
        interests: List[str] = []
        if values & {"cafe", "coffee_shop", "tea_house"}:
            interests.append("CAFE")
        if values & {
            "park",
            "natural_feature",
            "campground",
            "national_park",
            "beach",
        }:
            interests.append("NATURE")
        if values & {"restaurant", "food", "bakery"}:
            interests.append("FOOD")
        if values & {
            "museum",
            "art_gallery",
            "church",
            "hindu_temple",
            "place_of_worship",
            "historical_landmark",
        }:
            interests.append("CULTURE")
        if values & {
            "tourist_attraction",
            "point_of_interest",
            "amusement_park",
            "aquarium",
            "zoo",
            "scenic_viewpoint",
        }:
            interests.append("CHECKIN")
        if values & {"spa", "lodging", "resort_hotel"}:
            interests.append("RELAX")
        if "beach" in values:
            interests.append("BEACH")
        return interests


def get_default_places_provider() -> PlacesProvider:
    return GooglePlacesProvider()
```

---

# `app/tools/prompting.py`

```python
"""Optional Gemini semantic helper.

Phase 3-4 correctness không phụ thuộc LLM. Module này chỉ cung cấp optional
semantic enrichment cho Supervisor (interest/style/pace/hotel), không được
phép trở thành nguồn sự thật cho budget/route/DB entities.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

SUPERVISOR_SEMANTIC_SYSTEM_PROMPT = """
Bạn là bộ semantic parser cho ViVu AI.
Chỉ trích xuất các preference mà người dùng thực sự thể hiện hoặc nói rõ.
Không được tự đoán điểm đến, số ngày, số người hay ngân sách.
Trả về JSON với các field:
{
  "interests": string[],
  "travel_style": "BUDGET|BALANCED|LUXURY|null",
  "travel_pace": "RELAXED|MODERATE|FAST|null",
  "hotel_preference": string|null
}
Nếu không chắc hoặc người dùng không nói, dùng null / [].
""".strip()


class GeminiSemanticParser:
    """Optional, fail-safe semantic enrichment layer."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or getattr(settings, "gemini_api_key", None)
        self.model = model or getattr(settings, "gemini_model", "gemini-2.5-flash")
        self._client = None

        if not self.api_key:
            return

        try:
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        except Exception:
            logger.warning(
                "Không khởi tạo được Gemini client; semantic enrichment disabled.",
                exc_info=True,
            )
            self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    def parse(self, raw_prompt: str) -> Optional[Dict[str, Any]]:
        if not self.available:
            return None
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=(
                    SUPERVISOR_SEMANTIC_SYSTEM_PROMPT
                    + "\n\nUSER:\n"
                    + raw_prompt
                ),
            )
            text = getattr(response, "text", None)
            if not text:
                return None
            if "```" in text:
                text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            return data if isinstance(data, dict) else None
        except Exception:
            logger.warning(
                "Gemini semantic parsing failed; use deterministic parser.",
                exc_info=True,
            )
            return None
```

---

# `app/tools/routes.py`

```python
from __future__ import annotations

from abc import ABC, abstractmethod
import logging
import math
from typing import List, Optional, Sequence

import httpx

from app.core.config import settings
from app.schemas.common import Provenance, utc_now_iso
from app.schemas.itinerary import RouteSegment
from app.schemas.place import PlaceCandidate

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
ROAD_DISTANCE_FACTOR = 1.4
AVERAGE_URBAN_SPEED_KMH = 25.0
MIN_TRAVEL_MINUTES = 3


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_duration_minutes(distance_km: float) -> int:
    if distance_km <= 0:
        return 0
    return max(
        MIN_TRAVEL_MINUTES,
        int(math.ceil(distance_km / AVERAGE_URBAN_SPEED_KMH * 60)),
    )


def estimate_road_duration_minutes(straight_line_distance_km: float) -> int:
    """Conservative planning estimate: Haversine × ROAD_DISTANCE_FACTOR."""
    return estimate_duration_minutes(straight_line_distance_km * ROAD_DISTANCE_FACTOR)


def _haversine_segment(origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
    straight_line = haversine_km(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
    )
    road_estimate = straight_line * ROAD_DISTANCE_FACTOR
    return RouteSegment(
        from_place_id=origin.place_id,
        to_place_id=destination.place_id,
        distance_km=round(road_estimate, 2),
        duration_minutes=estimate_duration_minutes(road_estimate),
        provenance=Provenance(
            source="INTERNAL_ESTIMATE",
            is_estimate=True,
            retrieved_at=utc_now_iso(),
        ),
    )


class RouteProvider(ABC):
    @abstractmethod
    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        raise NotImplementedError

    def calculate_route_segments(self, places: Sequence[PlaceCandidate]) -> List[RouteSegment]:
        return [
            self.calculate_route(places[i], places[i + 1])
            for i in range(len(places) - 1)
        ]


class HaversineRouteProvider(RouteProvider):
    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        return _haversine_segment(origin, destination)


class GoogleRoutesProvider(RouteProvider):
    ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
    FIELD_MASK = "routes.duration,routes.distanceMeters"

    def __init__(
        self,
        fallback_provider: Optional[RouteProvider] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.fallback = fallback_provider or HaversineRouteProvider()
        self.api_key = settings.google_maps_api_key
        self._http_client = http_client

    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        if not self.api_key:
            return self.fallback.calculate_route(origin, destination)

        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                return self._request_google_route(origin, destination)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                logger.warning(
                    "Google Routes timeout/transport, attempt=%s/2",
                    attempt + 1,
                )
            except Exception as exc:
                last_error = exc
                logger.exception("Google Routes lỗi; dùng Haversine estimate")
                break

        if last_error:
            logger.warning("Google Routes fallback Haversine: %s", last_error)
        return self.fallback.calculate_route(origin, destination)

    def _request_google_route(
        self,
        origin: PlaceCandidate,
        destination: PlaceCandidate,
    ) -> RouteSegment:
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK,
        }
        body = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": origin.latitude,
                        "longitude": origin.longitude,
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": destination.latitude,
                        "longitude": destination.longitude,
                    }
                }
            },
            "travelMode": "DRIVE",
            "languageCode": "vi",
        }
        timeout = settings.google_routes_timeout_seconds
        if self._http_client:
            response = self._http_client.post(
                self.ROUTES_URL,
                headers=headers,
                json=body,
                timeout=timeout,
            )
        else:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(
                    self.ROUTES_URL,
                    headers=headers,
                    json=body,
                )

        if response.status_code != 200:
            raise RuntimeError(f"Google Routes HTTP {response.status_code}")

        routes = response.json().get("routes") or []
        if not routes:
            raise RuntimeError("Google Routes empty result")

        route = routes[0]
        meters = float(route.get("distanceMeters") or 0)
        duration_raw = str(route.get("duration") or "0s")
        if duration_raw.endswith("s"):
            seconds = int(float(duration_raw.rstrip("s")))
        else:
            seconds = int(float(duration_raw))

        return RouteSegment(
            from_place_id=origin.place_id,
            to_place_id=destination.place_id,
            distance_km=round(meters / 1000.0, 2),
            duration_minutes=(
                max(0, int(math.ceil(seconds / 60)))
                if seconds
                else estimate_duration_minutes(meters / 1000.0)
            ),
            provenance=Provenance(
                source="GOOGLE_ROUTES",
                source_id=f"{origin.place_id}->{destination.place_id}",
                retrieved_at=utc_now_iso(),
                is_estimate=False,
            ),
        )


def get_default_routes_provider() -> RouteProvider:
    return GoogleRoutesProvider()


def calculate_route(
    origin: PlaceCandidate,
    destination: PlaceCandidate,
    provider: Optional[RouteProvider] = None,
) -> RouteSegment:
    return (provider or get_default_routes_provider()).calculate_route(origin, destination)


def calculate_route_segments(
    places: Sequence[PlaceCandidate],
    provider: Optional[RouteProvider] = None,
) -> List[RouteSegment]:
    return (provider or get_default_routes_provider()).calculate_route_segments(places)
```

---

# `app/tools/validation.py`

```python
from __future__ import annotations

from datetime import datetime, time
from typing import Dict, List, Optional, Sequence

from app.schemas.budget import BudgetBreakdown
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate

PACE_MAX_SLOTS = {"RELAXED": 4, "MODERATE": 5, "FAST": 7}
MAX_SEGMENT_MINUTES = 90
MAX_SEGMENT_DISTANCE_KM = 20.0


def _to_minutes(value: str) -> int:
    return time.fromisoformat(value).hour * 60 + time.fromisoformat(value).minute


def validate_itinerary(
    days: Sequence[DayItinerary],
    *,
    candidate_pool: Sequence[PlaceCandidate],
    duration_days: int,
    travel_pace: str = "MODERATE",
    selected_hotel: Optional[PlaceCandidate] = None,
) -> List[str]:
    issues: List[str] = []
    if len(days) != duration_days:
        issues.append(f"day_count_mismatch:{len(days)}!={duration_days}")

    expected_days = list(range(1, duration_days + 1))
    actual_days = [d.day_number for d in days]
    if actual_days != expected_days:
        issues.append(f"day_number_invalid:{actual_days}")

    pool_ids = {p.place_id for p in candidate_pool}
    known_route_ids = set(pool_ids)
    if selected_hotel is not None:
        known_route_ids.add(selected_hotel.place_id)

    place_map = {p.place_id: p for p in candidate_pool}
    seen: set[str] = set()
    max_slots = PACE_MAX_SLOTS.get(travel_pace, 5)

    for day in days:
        if not day.time_slots:
            issues.append(f"empty_day:day{day.day_number}")

        if len(day.time_slots) > max_slots:
            issues.append(
                f"too_many_activities:day{day.day_number}:{len(day.time_slots)}"
            )

        previous_end: Optional[time] = None
        for index, slot in enumerate(day.time_slots):
            if slot.place_id not in pool_ids:
                issues.append(f"unknown_place:{slot.place_id}")
            if slot.place_id in seen:
                issues.append(f"duplicate_place:{slot.place_id}")
            seen.add(slot.place_id)

            start = time.fromisoformat(slot.start_time)
            end = time.fromisoformat(slot.end_time)
            if end <= start:
                issues.append(f"invalid_time_range:day{day.day_number}:{index}")
            if previous_end is not None and start < previous_end:
                issues.append(f"overlap:day{day.day_number}:{index}")
            previous_end = end

            place = place_map.get(slot.place_id)
            if place is not None:
                cat = (place.category or "").upper()
                if slot.slot_type in ("LUNCH", "DINNER") and cat not in {"RESTAURANT", "CAFE"}:
                    issues.append(
                        f"meal_category_invalid:day{day.day_number}:{index}:{cat}"
                    )
                if slot.slot_type in ("MORNING", "AFTERNOON", "EVENING") and cat not in {
                    "ATTRACTION",
                    "CAFE",
                }:
                    issues.append(
                        f"activity_category_invalid:day{day.day_number}:{index}:{cat}"
                    )

        expected_route_pairs: List[tuple[str, str]] = []
        slot_ids = [slot.place_id for slot in day.time_slots]
        if selected_hotel is not None and slot_ids:
            expected_route_pairs.append((selected_hotel.place_id, slot_ids[0]))
        expected_route_pairs.extend(
            (slot_ids[i], slot_ids[i + 1]) for i in range(len(slot_ids) - 1)
        )
        if selected_hotel is not None and slot_ids:
            expected_route_pairs.append((slot_ids[-1], selected_hotel.place_id))

        actual_route_pairs = [
            (segment.from_place_id, segment.to_place_id)
            for segment in day.route_segments
        ]
        if actual_route_pairs != expected_route_pairs:
            issues.append(f"route_sequence_invalid:day{day.day_number}")

        for segment in day.route_segments:
            if segment.duration_minutes > MAX_SEGMENT_MINUTES:
                issues.append(
                    f"unreasonable_travel:day{day.day_number}:"
                    f"{segment.from_place_id}->{segment.to_place_id}"
                )
            if segment.distance_km > MAX_SEGMENT_DISTANCE_KM:
                issues.append(
                    f"long_distance:day{day.day_number}:"
                    f"{segment.from_place_id}->{segment.to_place_id}:"
                    f"{segment.distance_km:.2f}km"
                )
            if (
                segment.from_place_id not in known_route_ids
                or segment.to_place_id not in known_route_ids
            ):
                issues.append(f"unknown_route_place:day{day.day_number}")

        expected_segments = len(expected_route_pairs)
        if len(day.route_segments) != expected_segments:
            issues.append(f"route_segment_count:day{day.day_number}")

        # Route duration phải phù hợp với khoảng nghỉ giữa hai activity.
        if len(day.time_slots) >= 2:
            consecutive_segments = day.route_segments
            offset = 1 if selected_hotel is not None else 0
            for i in range(len(day.time_slots) - 1):
                seg_index = i + offset
                if seg_index >= len(consecutive_segments):
                    continue
                gap_minutes = _to_minutes(day.time_slots[i + 1].start_time) - _to_minutes(
                    day.time_slots[i].end_time
                )
                segment_minutes = consecutive_segments[seg_index].duration_minutes
                if segment_minutes > gap_minutes:
                    issues.append(
                        f"travel_time_exceeds_gap:day{day.day_number}:"
                        f"{day.time_slots[i].place_id}->{day.time_slots[i + 1].place_id}:"
                        f"{segment_minutes}>{gap_minutes}"
                    )

        distance_sum = round(sum(s.distance_km for s in day.route_segments), 2)
        if abs(day.total_travel_distance_km - distance_sum) > 0.01:
            issues.append(f"daily_distance_mismatch:day{day.day_number}")

        duration_sum = sum(s.duration_minutes for s in day.route_segments)
        if day.total_travel_time_minutes != duration_sum:
            issues.append(f"daily_duration_mismatch:day{day.day_number}")

        slot_cost_sum = sum(slot.estimated_cost for slot in day.time_slots)
        if day.daily_cost != slot_cost_sum:
            issues.append(f"daily_cost_mismatch:day{day.day_number}")

    return issues


def validate_budget_breakdown(breakdown: BudgetBreakdown) -> List[str]:
    issues: List[str] = []
    if any(
        value < 0
        for value in (
            breakdown.hotel_cost,
            breakdown.food_cost,
            breakdown.ticket_cost,
            breakdown.transport_cost,
            breakdown.subtotal,
            breakdown.misc_cost,
            breakdown.total_calculated,
            breakdown.max_budget,
            breakdown.remaining,
            breakdown.over_amount,
        )
    ):
        issues.append("negative_cost")

    expected_subtotal = (
        breakdown.hotel_cost
        + breakdown.food_cost
        + breakdown.ticket_cost
        + breakdown.transport_cost
    )
    if breakdown.subtotal != expected_subtotal:
        issues.append("subtotal_mismatch")

    expected_misc = breakdown.subtotal * 10 // 100
    if breakdown.misc_cost != expected_misc:
        issues.append("misc_mismatch")

    expected_total = breakdown.subtotal + breakdown.misc_cost
    if breakdown.total_calculated != expected_total:
        issues.append("total_mismatch")

    expected_remaining = max(0, breakdown.max_budget - breakdown.total_calculated)
    if breakdown.remaining != expected_remaining:
        issues.append("remaining_mismatch")

    expected_over = max(0, breakdown.total_calculated - breakdown.max_budget)
    if breakdown.over_amount != expected_over:
        issues.append("over_amount_mismatch")

    expected_status = "BUDGET_OK" if breakdown.total_calculated <= breakdown.max_budget else "OVER_BUDGET"
    if breakdown.status != expected_status:
        issues.append("status_mismatch")

    return issues


def count_by_category(places: Sequence[PlaceCandidate]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for place in places:
        counts[place.category] = counts.get(place.category, 0) + 1
    return counts
```

---

# `regression_tests.py`

```python
"""Regression tests for ViVu AI Phase 1-4 v2.2 hardening."""
from __future__ import annotations

import sys
import types
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# Minimal stubs for modules intentionally outside the Phase 1-4 core bundle.
config_mod = types.ModuleType("app.core.config")


class Settings:
    google_maps_api_key = None
    google_routes_timeout_seconds = 2.0
    google_places_timeout_seconds = 2.0
    gemini_api_key = None
    gemini_model = "gemini-2.5-flash"


config_mod.settings = Settings()
sys.modules["app.core.config"] = config_mod

offline_mod = types.ModuleType("app.data.offline_places")
offline_mod.OFFLINE_PLACES_DATA = {}
sys.modules["app.data.offline_places"] = offline_mod

# Lightweight LangGraph stub so graph.nodes can be imported without installing LangGraph.
langgraph_mod = types.ModuleType("langgraph")
graph_mod = types.ModuleType("langgraph.graph")


class _DummyStateGraph:
    def __init__(self, *_args, **_kwargs):
        pass

    def add_node(self, *_args, **_kwargs):
        pass

    def add_edge(self, *_args, **_kwargs):
        pass

    def add_conditional_edges(self, *_args, **_kwargs):
        pass

    def set_entry_point(self, *_args, **_kwargs):
        pass

    def compile(self):
        return object()


graph_mod.StateGraph = _DummyStateGraph
graph_mod.END = "__END__"
sys.modules["langgraph"] = langgraph_mod
sys.modules["langgraph.graph"] = graph_mod

from app.agents.budget import BudgetAgent
from app.agents.destination import DestinationAgent
from app.agents.itinerary import ItineraryAgent
from app.agents.supervisor import SupervisorAgent
from app.graph.nodes import itinerary_node
from app.models.state import TravelPlanState
from app.schemas.budget import OptimizationContext, OptimizationTarget
from app.schemas.common import Provenance
from app.schemas.itinerary import DayItinerary, RouteSegment, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.cost import calculate_budget
from app.tools.places import GooglePlacesProvider
from app.tools.routes import HaversineRouteProvider
from app.tools.validation import validate_budget_breakdown


def place(
    pid: str,
    name: str,
    category: str,
    lat: float,
    lon: float,
    *,
    cost: int | None = None,
    ticket: int | None = None,
    room: int | None = None,
    score: float = 0.8,
    opening: dict | None = None,
    current_opening: dict | None = None,
    business_status: str = "OPERATIONAL",
    estimated: bool = False,
    interests: list[str] | None = None,
) -> PlaceCandidate:
    return PlaceCandidate(
        place_id=pid,
        name=name,
        category=category,  # type: ignore[arg-type]
        interests=interests or [],
        rating=4.5,
        user_ratings_total=500,
        address="Da Lat, Lam Dong, Vietnam",
        latitude=lat,
        longitude=lon,
        opening_hours=opening,
        current_opening_hours=current_opening,
        business_status=business_status,  # type: ignore[arg-type]
        estimated_cost_per_person=cost,
        ticket_price=ticket,
        estimated_room_cost_per_night=room,
        provenance=Provenance(
            source="INTERNAL_ESTIMATE" if estimated else "INTERNAL_DATABASE",
            source_id=pid,
            is_estimate=estimated,
        ),
        score=score,
    )


def req(
    days: int = 2,
    budget: int = 10_000_000,
    *,
    start: date | None = date(2026, 9, 25),
    pace: str = "MODERATE",
) -> ParsedUserRequest:
    return ParsedUserRequest(
        destination_city="Đà Lạt",
        duration_days=days,
        num_travelers=2,
        total_budget=budget,
        interests=["CAFE", "NATURE"],
        travel_style="BALANCED",
        travel_pace=pace,  # type: ignore[arg-type]
        start_date=start,
    )


def test_cafe_meal_not_double_counted() -> None:
    agent = BudgetAgent()
    r = req(days=1)
    cafe = place("c1", "Cafe Lunch", "CAFE", 11.94, 108.44, cost=60_000)
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:00",
                end_time="13:30",
                place_id="c1",
                place_name="Cafe Lunch",
                estimated_cost=120_000,
            )
        ],
        daily_cost=120_000,
    )
    cost = agent._collect_food_cost([day], [cafe], r)
    # Explicit lunch = 120k; missing dinner = 175k/person * 2 = 350k.
    assert cost == 470_000, cost


def test_opening_hours_weekday_is_strict() -> None:
    monday_only = place(
        "p1",
        "Monday Only",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 1, "hour": 8, "minute": 0},
                    "close": {"day": 1, "hour": 17, "minute": 0},
                }
            ]
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        monday_only, "10:00", "12:00", date(2026, 9, 25)
    )
    assert ItineraryAgent._opening_hours_compatible(
        monday_only, "10:00", "12:00", date(2026, 9, 21)
    )


def test_opening_hours_24_7_regular() -> None:
    place_24 = place(
        "24",
        "24/7",
        "ATTRACTION",
        11.94,
        108.44,
        opening={"periods": [{"open": {"day": 0, "hour": 0, "minute": 0}}]},
    )
    assert ItineraryAgent._opening_hours_compatible(
        place_24, "10:00", "12:00", date(2026, 9, 25)
    )


def test_opening_hours_special_day_override_closed() -> None:
    target = date(2026, 9, 25)  # Friday
    place_with_holiday_closure = place(
        "sp1",
        "Holiday Closure",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 8, "minute": 0},
                    "close": {"day": 5, "hour": 17, "minute": 0},
                }
            ]
        },
        current_opening={
            "specialDays": [{"date": {"year": 2026, "month": 9, "day": 25}}],
            "periods": [],
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        place_with_holiday_closure, "10:00", "12:00", target
    )


def test_opening_hours_special_day_override_open() -> None:
    target = date(2026, 9, 25)
    special = place(
        "sp2",
        "Holiday Adjusted",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 8, "minute": 0},
                    "close": {"day": 5, "hour": 17, "minute": 0},
                }
            ]
        },
        current_opening={
            "specialDays": [{"date": "2026-09-25"}],
            "periods": [
                {
                    "open": {"day": 5, "hour": 10, "minute": 0},
                    "close": {"day": 5, "hour": 14, "minute": 0},
                }
            ],
        },
    )
    assert ItineraryAgent._opening_hours_compatible(
        special, "11:00", "12:00", target
    )
    assert not ItineraryAgent._opening_hours_compatible(
        special, "09:00", "12:00", target
    )


def test_opening_hours_previous_day_does_not_leak() -> None:
    monday_only = place(
        "weekday",
        "Monday Only",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 1, "hour": 8, "minute": 0},
                    "close": {"day": 1, "hour": 17, "minute": 0},
                }
            ]
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        monday_only, "10:00", "12:00", date(2026, 9, 22)
    )


def test_opening_hours_overnight() -> None:
    night = place(
        "n1",
        "Night Place",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 18, "minute": 0},
                    "close": {"day": 6, "hour": 2, "minute": 0},
                }
            ]
        },
    )
    assert ItineraryAgent._opening_hours_compatible(
        night, "23:00", "23:30", date(2026, 9, 25)
    )
    assert ItineraryAgent._opening_hours_compatible(
        night, "01:00", "01:30", date(2026, 9, 26)
    )
    assert not ItineraryAgent._opening_hours_compatible(
        night, "10:00", "11:00", date(2026, 9, 26)
    )


def test_full_slot_must_fit_opening_hours() -> None:
    place_open_until_11 = place(
        "hrs",
        "Short Hours",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 8, "minute": 0},
                    "close": {"day": 5, "hour": 11, "minute": 0},
                }
            ]
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        place_open_until_11, "10:00", "12:00", date(2026, 9, 25)
    )
    assert ItineraryAgent._opening_hours_compatible(
        place_open_until_11, "09:00", "10:00", date(2026, 9, 25)
    )


def test_seed_cannot_break_slot_category() -> None:
    r = req(days=1)
    hotel = place("h", "Hotel", "HOTEL", 11.94, 108.44, room=500_000)
    restaurant = place(
        "r", "Only Restaurant", "RESTAURANT", 11.941, 108.441, cost=120_000
    )
    agent = ItineraryAgent(HaversineRouteProvider())
    days, _, warnings = agent.process(r, [hotel, restaurant], hotel)
    assert not warnings, warnings
    assert len(days) == 1
    assert len(days[0].time_slots) == 1
    assert days[0].time_slots[0].slot_type == "LUNCH"
    assert days[0].time_slots[0].place_id == "r"


def test_future_opening_is_not_schedulable() -> None:
    future = place(
        "future",
        "Future Place",
        "ATTRACTION",
        11.94,
        108.44,
        ticket=50_000,
        business_status="FUTURE_OPENING",
    )
    agent = ItineraryAgent(HaversineRouteProvider())
    days, _, _ = agent.process(req(days=1), [future], None)
    assert days == []


def test_destination_rejects_future_opening_candidate() -> None:
    future = place(
        "future_h",
        "Future Hotel",
        "HOTEL",
        11.94,
        108.44,
        room=500_000,
        business_status="FUTURE_OPENING",
    )
    provider = type(
        "Provider",
        (),
        {"search_places": lambda self, city, categories=None: [future]},
    )()
    result = DestinationAgent(provider=provider).process(req(days=1))
    assert result == []


def test_travel_gap_guard_uses_time_not_only_distance() -> None:
    anchor = place("a", "Anchor", "ATTRACTION", 11.94, 108.44)
    candidate = place("b", "Far", "ATTRACTION", 11.94, 108.70)
    assert not ItineraryAgent._candidate_travel_gap_is_feasible(
        anchor, candidate, "12:00", "12:15"
    )


def test_feasible_cheaper_replacement_is_found_for_actual_slot() -> None:
    from app.graph.nodes import _find_reasonable_cheaper_replacement

    r = req(days=1)
    current = place(
        "r1", "Current Restaurant", "RESTAURANT", 11.94, 108.44,
        cost=300_000, score=0.8,
    )
    cheaper = place(
        "r2", "Cheaper Restaurant", "RESTAURANT", 11.941, 108.441,
        cost=200_000, score=0.8,
    )
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r1",
                place_name="Current Restaurant",
                estimated_cost=600_000,
            )
        ],
        daily_cost=600_000,
    )
    target = OptimizationTarget(
        target_category="RESTAURANT",
        day_number=1,
        slot_index=0,
        current_place_id="r1",
        current_cost=600_000,
        target_reduction=200_000,
        reason="HIGH_COST_FOOD",
    )
    result = _find_reasonable_cheaper_replacement(
        current=current,
        candidate_pool=[current, cheaper],
        request=r,
        itinerary_days=[day],
        target=target,
        selected_hotel=None,
        reserved_replacements=set(),
    )
    assert result is not None
    assert result.place_id == "r2"


def test_replacement_cannot_reuse_place_from_another_day() -> None:
    from app.graph.nodes import _find_reasonable_cheaper_replacement

    r = req(days=2)
    current = place(
        "r1", "Current Restaurant", "RESTAURANT", 11.94, 108.44,
        cost=300_000, score=0.8,
    )
    already_used_elsewhere = place(
        "r2", "Used Restaurant", "RESTAURANT", 11.941, 108.441,
        cost=100_000, score=0.8,
    )
    day1 = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r1",
                place_name="Current Restaurant",
                estimated_cost=600_000,
            )
        ],
        daily_cost=600_000,
    )
    day2 = DayItinerary(
        day_number=2,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r2",
                place_name="Used Restaurant",
                estimated_cost=200_000,
            )
        ],
        daily_cost=200_000,
    )
    target = OptimizationTarget(
        target_category="RESTAURANT",
        day_number=1,
        slot_index=0,
        current_place_id="r1",
        current_cost=600_000,
        target_reduction=400_000,
        reason="HIGH_COST_FOOD",
    )
    assert _find_reasonable_cheaper_replacement(
        current=current,
        candidate_pool=[current, already_used_elsewhere],
        request=r,
        itinerary_days=[day1, day2],
        target=target,
        selected_hotel=None,
        reserved_replacements=set(),
    ) is None


def test_num_nights_fails_fast() -> None:
    try:
        calculate_budget(
            num_travelers=2, num_days=1, num_nights=1, max_budget=1_000_000
        )
    except ValueError:
        return
    raise AssertionError("num_nights > num_days-1 must fail fast")


def test_restaurant_is_not_blindly_deleted() -> None:
    r = req(days=1, budget=1_000_000)
    hotel = place("h", "Hotel", "HOTEL", 11.94, 108.44, room=500_000)
    restaurant = place(
        "r1", "Only Restaurant", "RESTAURANT", 11.941, 108.441, cost=300_000
    )
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r1",
                place_name="Only Restaurant",
                estimated_cost=600_000,
            )
        ],
        daily_cost=600_000,
    )
    state: TravelPlanState = {
        "session_id": "s",
        "user_id": None,
        "raw_prompt": "",
        "user_preferences": None,
        "intent": "CREATE_PLAN",
        "clarification_question": None,
        "parsed_request": r,
        "candidate_pool": [hotel, restaurant],
        "selected_place_ids": ["h", "r1"],
        "selected_hotel": hotel,
        "itinerary_days": [day],
        "budget_breakdown": None,
        "optimization_targets": [
            OptimizationTarget(
                target_category="RESTAURANT",
                day_number=1,
                slot_index=0,
                current_place_id="r1",
                current_cost=600_000,
                target_reduction=500_000,
                reason="HIGH_COST_FOOD",
            )
        ],
        "optimization_context": OptimizationContext(
            previous_total=2_000_000,
            target_reduction_total=500_000,
            affected_days=[1],
            iteration_summary="OVER",
        ),
        "loop_count": 1,
        "max_loops": 3,
        "optimization_exhausted": False,
        "optimization_stalled": False,
        "termination_reason": None,
        "best_itinerary_days": None,
        "best_budget_breakdown": None,
        "best_selected_hotel": None,
        "best_selected_place_ids": [],
        "best_over_amount": 10**18,
        "trace_logs": [],
        "warnings": [],
        "errors": [],
        "final_plan": None,
        "final_response_text": None,
    }
    result = itinerary_node(state)
    assert result["itinerary_days"] or result["selected_place_ids"]
    assert not any(
        error.error_code == "REPLAN_EMPTY_CANDIDATE_POOL"
        for error in result.get("errors", [])
    )


def test_budget_invariants() -> None:
    breakdown = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        ticket_cost=300_000,
        transport_cost=200_000,
        explicit_hotel_cost=1_400_000,
        explicit_food_cost=1_400_000,
    )
    assert not validate_budget_breakdown(breakdown)


def test_budget_data_quality_warnings() -> None:
    agent = BudgetAgent()
    r = req(days=2)
    restaurant = place(
        "food", "Unknown Restaurant", "RESTAURANT", 11.94, 108.44, cost=None
    )
    attraction = place(
        "attr", "Unknown Ticket", "ATTRACTION", 11.941, 108.441, ticket=None
    )
    hotel = place(
        "hotel", "Estimated Hotel", "HOTEL", 11.942, 108.442,
        room=900_000, estimated=True,
    )
    route = RouteSegment(
        from_place_id="hotel",
        to_place_id="food",
        distance_km=4.0,
        duration_minutes=10,
        provenance=Provenance(
            source="INTERNAL_ESTIMATE", source_id="hotel->food", is_estimate=True
        ),
    )
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:00",
                end_time="13:30",
                place_id="food",
                place_name="Unknown Restaurant",
                estimated_cost=0,
            ),
            TimeSlot(
                slot_type="AFTERNOON",
                start_time="14:00",
                end_time="16:00",
                place_id="attr",
                place_name="Unknown Ticket",
                estimated_cost=0,
            ),
        ],
        route_segments=[route],
    )
    warnings = agent.collect_data_quality_warnings(
        request=r,
        itinerary_days=[day],
        candidate_pool=[restaurant, attraction, hotel],
        selected_hotel=hotel,
    )
    codes = {item.split(":", 1)[0] for item in warnings}
    assert "FOOD_FALLBACK_USED" in codes
    assert "UNKNOWN_TICKET_PRICE" in codes
    assert "HOTEL_COST_ESTIMATE_USED" in codes
    assert "ROUTE_DISTANCE_ESTIMATE_USED" in codes


def test_fast_candidate_capacity_scales_with_duration() -> None:
    class CapacityProvider:
        def __init__(self):
            self.calls: list[tuple[str, int]] = []

        def search_places_for_capacity(self, city, categories=None, max_results=None):
            category = categories[0]
            self.calls.append((category, max_results))
            result = []
            for i in range(max_results):
                result.append(
                    place(
                        f"{category.lower()}-{i}",
                        f"{category} {i}",
                        category,
                        11.94 + (i % 5) * 0.0001,
                        108.44 + (i % 5) * 0.0001,
                    )
                )
            return result

    provider = CapacityProvider()
    agent = DestinationAgent(provider=provider)
    result = agent._fetch_by_category(req(days=14, pace="FAST"))
    capacity_by_category = dict(provider.calls)

    assert capacity_by_category["ATTRACTION"] >= 42
    assert capacity_by_category["CAFE"] >= 21
    assert capacity_by_category["RESTAURANT"] >= 42
    assert len(result) >= 42 + 21 + 42


def test_google_places_pagination_respects_capacity() -> None:
    class Response:
        def __init__(self, payload):
            self.status_code = 200
            self._payload = payload

        def json(self):
            return self._payload

    def raw_place(index: int) -> dict:
        return {
            "id": f"gp-{index}",
            "displayName": {"text": f"GP {index}"},
            "formattedAddress": "Da Lat, Lam Dong, Vietnam",
            "location": {"latitude": 11.94 + index * 0.00001, "longitude": 108.44},
            "rating": 4.5,
            "userRatingCount": 100,
            "primaryType": "restaurant",
            "businessStatus": "OPERATIONAL",
        }

    pages = [
        Response({"places": [raw_place(i) for i in range(20)], "nextPageToken": "p2"}),
        Response({"places": [raw_place(i) for i in range(20, 40)], "nextPageToken": "p3"}),
        Response({"places": [raw_place(i) for i in range(40, 50)]}),
    ]

    class FakeClient:
        def __init__(self):
            self.calls = []

        def post(self, url, headers=None, json=None, timeout=None):
            self.calls.append(json)
            return pages[len(self.calls) - 1]

    fake = FakeClient()
    provider = GooglePlacesProvider(
        fallback_provider=type(
            "Fallback", (), {"search_places": lambda self, city, categories=None: []}
        )(),
        http_client=fake,  # type: ignore[arg-type]
    )
    provider.api_key = "test"
    result = provider.search_places_for_capacity(
        "Đà Lạt", ["RESTAURANT"], max_results=42
    )
    assert len(result) == 42
    assert len(fake.calls) == 3
    assert fake.calls[1]["pageToken"] == "p2"
    assert fake.calls[2]["pageToken"] == "p3"


def test_supervisor_negation_blocks_preferences_but_allows_positive_clause() -> None:
    class FakeSemantic:
        available = True

        def parse(self, raw_prompt):
            return {
                "interests": ["CAFE", "NATURE"],
                "travel_style": "LUXURY",
                "travel_pace": "FAST",
                "hotel_preference": "Luxury Resort",
            }

    agent = SupervisorAgent(semantic_parser=FakeSemantic())
    result = agent.parse(
        "Đà Lạt 3 ngày 2 người ngân sách 5 triệu, không thích cà phê "
        "nhưng thích thiên nhiên, không thích sang chảnh, không muốn nhanh",
        user_preferences={
            "interests": ["CAFE"],
            "travel_style": "BUDGET",
            "travel_pace": "FAST",
            "hotel_preference": "Budget Hotel",
        },
    )
    assert "CAFE" not in result.interests
    assert "NATURE" in result.interests
    assert result.travel_style == "BUDGET"
    assert result.travel_pace == "MODERATE"
    assert result.hotel_preference == "Luxury Resort"
    assert result.start_date is None


def test_supervisor_start_date_and_negated_hotel() -> None:
    agent = SupervisorAgent(
        semantic_parser=type(
            "FakeSemantic",
            (),
            {
                "available": True,
                "parse": lambda self, raw: {
                    "interests": [],
                    "travel_style": None,
                    "travel_pace": None,
                    "hotel_preference": "Resort ABC",
                },
            },
        )()
    )
    result = agent.parse(
        "Đà Lạt 2 ngày 2 người 4 triệu bắt đầu 25/09/2026, không muốn ở resort",
    )
    assert result.start_date == date(2026, 9, 25)
    assert result.hotel_preference is None


def main() -> None:
    tests = [
        test_cafe_meal_not_double_counted,
        test_opening_hours_weekday_is_strict,
        test_opening_hours_24_7_regular,
        test_opening_hours_special_day_override_closed,
        test_opening_hours_special_day_override_open,
        test_opening_hours_previous_day_does_not_leak,
        test_opening_hours_overnight,
        test_full_slot_must_fit_opening_hours,
        test_seed_cannot_break_slot_category,
        test_future_opening_is_not_schedulable,
        test_destination_rejects_future_opening_candidate,
        test_travel_gap_guard_uses_time_not_only_distance,
        test_feasible_cheaper_replacement_is_found_for_actual_slot,
        test_replacement_cannot_reuse_place_from_another_day,
        test_num_nights_fails_fast,
        test_restaurant_is_not_blindly_deleted,
        test_budget_invariants,
        test_budget_data_quality_warnings,
        test_fast_candidate_capacity_scales_with_duration,
        test_google_places_pagination_respects_capacity,
        test_supervisor_negation_blocks_preferences_but_allows_positive_clause,
        test_supervisor_start_date_and_negated_hotel,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"ALL REGRESSION TESTS PASSED ({len(tests)}/{len(tests)})")


if __name__ == "__main__":
    main()
```

---

# `smoke_test.py`

```python
"""End-to-end-ish deterministic Phase 3/4 smoke test using local stubs."""
from __future__ import annotations

import sys
import types
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

config_mod = types.ModuleType("app.core.config")


class Settings:
    google_maps_api_key = None
    google_routes_timeout_seconds = 2.0
    google_places_timeout_seconds = 2.0
    gemini_api_key = None
    gemini_model = "gemini-2.5-flash"


config_mod.settings = Settings()
sys.modules["app.core.config"] = config_mod

offline_mod = types.ModuleType("app.data.offline_places")
offline_mod.OFFLINE_PLACES_DATA = {}
sys.modules["app.data.offline_places"] = offline_mod

from app.agents.budget import BudgetAgent
from app.agents.itinerary import ItineraryAgent
from app.agents.supervisor import SupervisorAgent
from app.schemas.common import Provenance
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.routes import HaversineRouteProvider
from app.tools.validation import validate_budget_breakdown


def place(pid, name, cat, lat, lon, cost=None, ticket=None, room=None, interests=None):
    return PlaceCandidate(
        place_id=pid,
        name=name,
        category=cat,
        interests=interests or [],
        rating=4.5,
        user_ratings_total=500,
        address="Da Lat, Lam Dong, Vietnam",
        latitude=lat,
        longitude=lon,
        opening_hours=None,
        current_opening_hours=None,
        business_status="OPERATIONAL",
        estimated_cost_per_person=cost,
        ticket_price=ticket,
        estimated_room_cost_per_night=room,
        provenance=Provenance(source="INTERNAL_DATABASE", source_id=pid),
    )


supervisor = SupervisorAgent()
parsed = supervisor.parse(
    "Đà Lạt 3 ngày 2 đêm, 2 người, ngân sách 5 triệu, "
    "thích cà phê và thiên nhiên",
    {"travel_style": "BUDGET"},
)
assert parsed.intent == "CREATE_PLAN"
assert (
    parsed.destination_city,
    parsed.duration_days,
    parsed.num_travelers,
    parsed.total_budget,
) == ("Đà Lạt", 3, 2, 5_000_000)
assert set(parsed.interests) >= {"CAFE", "NATURE"}
assert parsed.travel_style == "BUDGET"

req = ParsedUserRequest(
    destination_city="Đà Lạt",
    duration_days=3,
    num_travelers=2,
    total_budget=5_000_000,
    interests=["CAFE", "NATURE"],
    travel_style="BALANCED",
    travel_pace="MODERATE",
    start_date=date(2026, 9, 25),
)

hotel = place("h1", "Hotel", "HOTEL", 11.94, 108.44, room=500_000)
places = [hotel]

for i, (lat, lon) in enumerate(
    [
        (11.940, 108.440),
        (11.941, 108.441),
        (11.942, 108.442),
        (11.943, 108.443),
        (11.944, 108.444),
        (11.945, 108.445),
    ]
):
    places.append(
        place(
            f"a{i}", f"Attraction {i}", "ATTRACTION", lat, lon, ticket=50_000
        )
    )

for i, (lat, lon) in enumerate(
    [(11.946, 108.446), (11.947, 108.447), (11.948, 108.448)]
):
    places.append(
        place(
            f"c{i}", f"Cafe {i}", "CAFE", lat, lon, cost=60_000, interests=["CAFE"]
        )
    )

for i, (lat, lon) in enumerate(
    [
        (11.949, 108.449),
        (11.950, 108.450),
        (11.951, 108.451),
        (11.952, 108.452),
        (11.953, 108.453),
        (11.954, 108.454),
    ]
):
    places.append(
        place(
            f"r{i}", f"Restaurant {i}", "RESTAURANT", lat, lon,
            cost=120_000, interests=["FOOD"]
        )
    )

itinerary_agent = ItineraryAgent(HaversineRouteProvider())
days, ids, warnings = itinerary_agent.process(req, places, hotel)
assert len(days) == 3, (len(days), warnings)
assert len(ids) == len(set(ids))
for day in days:
    assert len(day.time_slots) <= 5
    assert day.route_segments
    assert day.route_segments[0].from_place_id == "h1"
    assert day.route_segments[-1].to_place_id == "h1"

budget_agent = BudgetAgent()
breakdown, targets, context = budget_agent.process(req, days, places, hotel)
assert not validate_budget_breakdown(breakdown), validate_budget_breakdown(breakdown)
assert breakdown.food_cost > 0
assert breakdown.transport_cost > 0

print("SMOKE TEST OK")
print("days=", len(days), "slots=", [len(d.time_slots) for d in days])
print("budget=", breakdown.total_calculated, breakdown.status)
print("targets=", len(targets))
print("warning_count=", len(warnings))
```

---

# `optimization_smoke_test.py`

```python
"""Optimization-loop smoke tests for no-progress and best-snapshot restoration."""
from __future__ import annotations

import sys
import types
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

config_mod = types.ModuleType("app.core.config")


class Settings:
    google_maps_api_key = None
    google_routes_timeout_seconds = 2.0
    google_places_timeout_seconds = 2.0
    gemini_api_key = None
    gemini_model = "gemini-2.5-flash"


config_mod.settings = Settings()
sys.modules["app.core.config"] = config_mod

offline_mod = types.ModuleType("app.data.offline_places")
offline_mod.OFFLINE_PLACES_DATA = {}
sys.modules["app.data.offline_places"] = offline_mod

# Minimal LangGraph stub for importing app.graph.nodes.
langgraph_mod = types.ModuleType("langgraph")
graph_mod = types.ModuleType("langgraph.graph")


class _DummyStateGraph:
    def __init__(self, *_args, **_kwargs):
        pass

    def add_node(self, *_args, **_kwargs):
        pass

    def add_edge(self, *_args, **_kwargs):
        pass

    def add_conditional_edges(self, *_args, **_kwargs):
        pass

    def set_entry_point(self, *_args, **_kwargs):
        pass

    def compile(self):
        return object()


graph_mod.StateGraph = _DummyStateGraph
graph_mod.END = "__END__"
sys.modules["langgraph"] = langgraph_mod
sys.modules["langgraph.graph"] = graph_mod

from app.agents.budget import BudgetAgent
from app.graph.nodes import budget_node, exhausted_node
from app.schemas.budget import OptimizationContext
from app.schemas.common import Provenance
from app.schemas.itinerary import DayItinerary, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest

req = ParsedUserRequest(
    destination_city="Đà Lạt",
    duration_days=2,
    num_travelers=2,
    total_budget=1_000_000,
    travel_style="BUDGET",
    travel_pace="MODERATE",
    start_date=date(2026, 9, 25),
)

hotel = PlaceCandidate(
    place_id="h",
    name="H",
    category="HOTEL",
    rating=4.5,
    user_ratings_total=100,
    address="Da Lat, Lam Dong, Vietnam",
    latitude=11.94,
    longitude=108.44,
    estimated_room_cost_per_night=800_000,
    business_status="OPERATIONAL",
    provenance=Provenance(source="INTERNAL_DATABASE"),
)
restaurant = PlaceCandidate(
    place_id="r",
    name="R",
    category="RESTAURANT",
    rating=4.5,
    user_ratings_total=100,
    address="Da Lat, Lam Dong, Vietnam",
    latitude=11.941,
    longitude=108.441,
    estimated_cost_per_person=200_000,
    business_status="OPERATIONAL",
    provenance=Provenance(source="INTERNAL_DATABASE"),
)

day1 = DayItinerary(
    day_number=1,
    time_slots=[
        TimeSlot(
            slot_type="LUNCH",
            start_time="12:00",
            end_time="13:30",
            place_id="r",
            place_name="R",
            estimated_cost=400_000,
        )
    ],
    daily_cost=400_000,
)
day2 = DayItinerary(
    day_number=2,
    time_slots=[
        TimeSlot(
            slot_type="LUNCH",
            start_time="12:00",
            end_time="13:30",
            place_id="r",
            place_name="R",
            estimated_cost=400_000,
        )
    ],
    daily_cost=400_000,
)

state = {
    "session_id": "s",
    "user_id": None,
    "raw_prompt": "",
    "user_preferences": None,
    "intent": "CREATE_PLAN",
    "clarification_question": None,
    "parsed_request": req,
    "candidate_pool": [hotel, restaurant],
    "selected_place_ids": ["h", "r"],
    "selected_hotel": hotel,
    "itinerary_days": [day1, day2],
    "budget_breakdown": None,
    "optimization_targets": [],
    "optimization_context": None,
    "loop_count": 0,
    "max_loops": 3,
    "optimization_exhausted": False,
    "optimization_stalled": False,
    "termination_reason": None,
    "best_itinerary_days": None,
    "best_budget_breakdown": None,
    "best_selected_hotel": None,
    "best_selected_place_ids": [],
    "best_over_amount": 10**18,
    "trace_logs": [],
    "warnings": [],
    "errors": [],
    "final_plan": None,
    "final_response_text": None,
}

first = budget_node(state)
assert first["budget_breakdown"] is not None
assert first["best_selected_hotel"].place_id == "h"
print(
    "initial",
    first["budget_breakdown"].total_calculated,
    first["budget_breakdown"].status,
    "targets",
    len(first["optimization_targets"]),
)

state.update(first)
state["loop_count"] = 1
state["optimization_context"] = OptimizationContext(
    previous_total=first["budget_breakdown"].total_calculated,
    target_reduction_total=first["budget_breakdown"].over_amount,
    affected_days=[1, 2],
    iteration_summary="OVER",
)
second = budget_node(state)
assert second["optimization_stalled"] is True
assert second["termination_reason"] == "NO_PROGRESS"
print("no-progress guard ok")

exhausted = exhausted_node({**state, **second})
assert exhausted["selected_hotel"].place_id == "h"
assert exhausted["termination_reason"] == "NO_PROGRESS"
print("best snapshot restore ok")

# Sanity check that the standalone BudgetAgent still validates its own invariants.
budget_agent = BudgetAgent()
breakdown, _, _ = budget_agent.process(req, [day1, day2], [hotel, restaurant], hotel)
assert breakdown.total_calculated >= 0
print("optimization smoke test OK")
```

---
