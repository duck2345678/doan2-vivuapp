"""BudgetAgent — Giai đoạn 4: Tính ngân sách và tạo optimization targets.

Luồng:
    1. Collect ticket_cost từ itinerary_days (ATTRACTION slots).
    2. Collect transport_cost từ route_segments.
    3. Collect explicit hotel cost từ selected_hotel (nếu có).
    4. Gọi calculate_budget() (deterministic engine).
    5. Nếu OVER_BUDGET → tạo optimization_targets theo thứ tự ưu tiên.
"""
from __future__ import annotations

import math
from typing import List, Optional, Sequence

from app.schemas.budget import BudgetBreakdown, OptimizationContext, OptimizationTarget
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.cost import DEFAULT_TRANSPORT_RATE_PER_KM, calculate_budget
from app.tools.routes import RouteProvider, get_default_routes_provider


# ── Thứ tự ưu tiên optimization (plan.md §32) ─────────────────────────────────
# 1. Thay lựa chọn đắt bằng tương đương rẻ hơn   → HIGH_COST_LOW_PRIORITY
# 2. Thay activity có preference score thấp       → LOW_PREFERENCE_SCORE
# 3. Bỏ optional stop (cafe)                      → OPTIONAL_STOP
# 4. Thay restaurant/cafe đắt                     → HIGH_COST_FOOD
# 5. Thay hotel nếu cần                           → HIGH_COST_HOTEL
# 6. Cuối cùng bỏ main attraction                → LAST_RESORT_ATTRACTION


_CATEGORY_PRIORITY: dict[str, int] = {
    "CAFE": 0,        # bỏ/thay sớm nhất
    "RESTAURANT": 1,
    "ATTRACTION": 2,
    "HOTEL": 3,       # chỉ thay khi cần thiết
}


class BudgetAgent:
    """Tính ngân sách và tạo optimization targets cho Itinerary Agent."""

    def __init__(self, route_provider: Optional[RouteProvider] = None):
        # route_provider không dùng trực tiếp nhưng giữ để dễ inject trong test
        self._route_provider = route_provider or get_default_routes_provider()

    # ── Public API ─────────────────────────────────────────────────────────────

    def process(
        self,
        request: ParsedUserRequest,
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate] = None,
    ) -> tuple[BudgetBreakdown, List[OptimizationTarget], Optional[OptimizationContext]]:
        """Trả về (breakdown, targets, context).

        - targets rỗng nếu BUDGET_OK.
        - context=None nếu BUDGET_OK, khác None nếu OVER_BUDGET.
        """
        ticket_cost = self._collect_ticket_cost(itinerary_days, candidate_pool, request.num_travelers)
        transport_cost = self._collect_transport_cost(itinerary_days)
        explicit_hotel_cost = self._explicit_hotel_cost(selected_hotel, request)

        num_nights = max(request.duration_days - 1, 1)
        breakdown = calculate_budget(
            num_travelers=request.num_travelers,
            num_days=request.duration_days,
            num_nights=num_nights,
            max_budget=request.total_budget,
            travel_style=request.travel_style,
            ticket_cost=ticket_cost,
            transport_cost=transport_cost,
            explicit_hotel_cost=explicit_hotel_cost,
        )

        if breakdown.status == "BUDGET_OK":
            return breakdown, [], None

        targets = self._build_targets(breakdown, itinerary_days, candidate_pool, selected_hotel)
        context = OptimizationContext(
            previous_total=breakdown.total_calculated,
            target_reduction_total=breakdown.over_amount,
            affected_days=sorted({t.day_number for t in targets if t.day_number is not None}),
            iteration_summary=(
                f"OVER_BUDGET {breakdown.over_amount:,} VND; "
                f"{len(targets)} target(s) identified"
            ),
        )
        return breakdown, targets, context

    # ── Cost collectors ────────────────────────────────────────────────────────

    @staticmethod
    def _explicit_hotel_cost(
        hotel: Optional[PlaceCandidate],
        request: ParsedUserRequest,
    ) -> Optional[int]:
        """Tính hotel cost từ selected_hotel nếu có estimated_room_cost_per_night."""
        if hotel is None or hotel.estimated_room_cost_per_night is None:
            return None
        num_nights = max(request.duration_days - 1, 1)
        rooms = math.ceil(request.num_travelers / 2)
        return hotel.estimated_room_cost_per_night * rooms * num_nights

    @staticmethod
    def _collect_ticket_cost(
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        num_travelers: int,
    ) -> int:
        """Σ ticket_price × num_travelers cho mọi ATTRACTION slot có ticket_price."""
        place_map = {p.place_id: p for p in candidate_pool}
        total = 0
        seen: set[str] = set()
        for day in itinerary_days:
            for slot in day.time_slots:
                place = place_map.get(slot.place_id)
                if (
                    place is not None
                    and place.category == "ATTRACTION"
                    and place.ticket_price is not None
                    and slot.place_id not in seen
                ):
                    total += place.ticket_price * num_travelers
                    seen.add(slot.place_id)
        return total

    @staticmethod
    def _collect_transport_cost(itinerary_days: Sequence[DayItinerary]) -> int:
        """Σ distance_km × DEFAULT_TRANSPORT_RATE_PER_KM cho mọi route segment."""
        total_km = sum(
            seg.distance_km
            for day in itinerary_days
            for seg in day.route_segments
        )
        return int(math.ceil(total_km * DEFAULT_TRANSPORT_RATE_PER_KM))

    # ── Optimization target builder ────────────────────────────────────────────

    def _build_targets(
        self,
        breakdown: BudgetBreakdown,
        itinerary_days: Sequence[DayItinerary],
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate],
    ) -> List[OptimizationTarget]:
        """Xây dựng danh sách OptimizationTarget theo thứ tự ưu tiên từ plan.md §32."""
        place_map = {p.place_id: p for p in candidate_pool}
        over = breakdown.over_amount
        targets: List[OptimizationTarget] = []
        accumulated_reduction = 0

        # Thu thập mọi slot có cost > 0, sắp xếp theo category priority (thấp trước)
        # và within-category theo cost giảm dần
        slot_entries: list[tuple[int, int, int, str, int]] = []
        # (category_priority, -slot_cost, day_number, slot_index, place_id, slot_cost)
        for day in itinerary_days:
            for idx, slot in enumerate(day.time_slots):
                place = place_map.get(slot.place_id)
                if place is None or slot.estimated_cost == 0:
                    continue
                cat_priority = _CATEGORY_PRIORITY.get(place.category, 2)
                slot_entries.append((cat_priority, -slot.estimated_cost, day.day_number, idx, slot.place_id, slot.estimated_cost))

        slot_entries.sort()  # category_priority asc, then -cost asc (= cost desc)

        for cat_priority, neg_cost, day_number, slot_index, place_id, slot_cost in slot_entries:
            if accumulated_reduction >= over:
                break
            place = place_map[place_id]
            reduction_needed = min(slot_cost, over - accumulated_reduction)

            reason = self._reason_for(place, slot_cost, place_map)
            targets.append(
                OptimizationTarget(
                    target_category=place.category,  # type: ignore[arg-type]
                    day_number=day_number,
                    slot_index=slot_index,
                    current_place_id=place_id,
                    current_cost=slot_cost,
                    target_reduction=reduction_needed,
                    reason=reason,
                )
            )
            accumulated_reduction += reduction_needed

        # Nếu vẫn chưa đủ (ví dụ hotel cost không có slot riêng), target hotel
        if accumulated_reduction < over and selected_hotel is not None:
            hotel_cost = breakdown.hotel_cost
            if hotel_cost > 0:
                targets.append(
                    OptimizationTarget(
                        target_category="HOTEL",
                        day_number=None,
                        slot_index=None,
                        current_place_id=selected_hotel.place_id,
                        current_cost=hotel_cost,
                        target_reduction=min(hotel_cost, over - accumulated_reduction),
                        reason="HIGH_COST_HOTEL",
                    )
                )

        return targets

    @staticmethod
    def _reason_for(
        place: PlaceCandidate,
        slot_cost: int,
        place_map: dict[str, PlaceCandidate],
    ) -> str:
        """Chọn reason code phù hợp dựa trên loại địa điểm và score."""
        if place.category == "CAFE":
            return "OPTIONAL_STOP"
        if place.category == "RESTAURANT":
            return "HIGH_COST_FOOD"
        if place.category == "HOTEL":
            return "HIGH_COST_HOTEL"
        # ATTRACTION
        if place.score < 0.5:
            return "LOW_PREFERENCE_SCORE"
        return "HIGH_COST_LOW_PRIORITY"
