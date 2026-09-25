from __future__ import annotations

from datetime import time
from typing import Dict, List, Optional, Sequence

from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate

PACE_MAX_SLOTS = {"RELAXED": 4, "MODERATE": 5, "FAST": 7}
MAX_SEGMENT_MINUTES = 90


def validate_itinerary(
    days: Sequence[DayItinerary],
    *,
    candidate_pool: Sequence[PlaceCandidate],
    duration_days: int,
    travel_pace: str = "MODERATE",
) -> List[str]:
    issues: List[str] = []
    if len(days) != duration_days:
        issues.append(f"day_count_mismatch:{len(days)}!={duration_days}")

    expected_days = list(range(1, duration_days + 1))
    actual_days = [d.day_number for d in days]
    if actual_days != expected_days:
        issues.append(f"day_number_invalid:{actual_days}")

    pool_ids = {p.place_id for p in candidate_pool}
    seen: set[str] = set()
    max_slots = PACE_MAX_SLOTS.get(travel_pace, 5)

    for day in days:
        if len(day.time_slots) > max_slots:
            issues.append(f"too_many_activities:day{day.day_number}:{len(day.time_slots)}")

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

        for segment in day.route_segments:
            if segment.duration_minutes > MAX_SEGMENT_MINUTES:
                issues.append(
                    f"unreasonable_travel:day{day.day_number}:{segment.from_place_id}->{segment.to_place_id}"
                )
            if segment.from_place_id not in pool_ids or segment.to_place_id not in pool_ids:
                issues.append(f"unknown_route_place:day{day.day_number}")

        expected_segments = max(0, len(day.time_slots) - 1)
        if len(day.route_segments) != expected_segments:
            issues.append(f"route_segment_count:day{day.day_number}")

    return issues


def count_by_category(places: Sequence[PlaceCandidate]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for place in places:
        counts[place.category] = counts.get(place.category, 0) + 1
    return counts
