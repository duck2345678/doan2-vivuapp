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
