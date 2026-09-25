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
