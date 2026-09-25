from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from app.schemas.itinerary import DayItinerary, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.routes import RouteProvider, get_default_routes_provider, haversine_km
from app.tools.validation import validate_itinerary

LONG_DISTANCE_KM = 20.0
CLUSTER_RADIUS_KM = 12.0
STRICT_CLUSTER_RADIUS_KM = 6.0


@dataclass(frozen=True)
class SlotTemplate:
    slot_type: str
    start_time: str
    end_time: str
    preferred_categories: Tuple[str, ...]


SLOT_TEMPLATES: Dict[str, List[SlotTemplate]] = {
    "RELAXED": [
        SlotTemplate("MORNING", "09:00", "11:00", ("ATTRACTION", "CAFE")),
        SlotTemplate("LUNCH", "12:00", "13:30", ("RESTAURANT",)),
        SlotTemplate("AFTERNOON", "15:00", "17:00", ("ATTRACTION", "CAFE")),
        SlotTemplate("DINNER", "18:30", "20:00", ("RESTAURANT",)),
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
        SlotTemplate("EVENING", "19:15", "20:30", ("CAFE", "ATTRACTION")),
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
        if not candidate_pool:
            warnings.append("Không có candidate_pool để lập lịch trình.")
            return [], [], warnings

        days = self._build_days(request, candidate_pool, selected_hotel, CLUSTER_RADIUS_KM, warnings)
        issues = validate_itinerary(
            days,
            candidate_pool=candidate_pool,
            duration_days=request.duration_days,
            travel_pace=request.travel_pace,
        )
        if issues:
            warnings.append(f"Lịch trình lần 1 chưa đạt validation: {', '.join(issues)}. Thử lập lại với cụm gần hơn.")
            retried = self._build_days(request, candidate_pool, selected_hotel, STRICT_CLUSTER_RADIUS_KM, warnings)
            retry_issues = validate_itinerary(
                retried,
                candidate_pool=candidate_pool,
                duration_days=request.duration_days,
                travel_pace=request.travel_pace,
            )
            if not retry_issues or len(retry_issues) <= len(issues):
                days = retried
                issues = retry_issues
            if issues:
                warnings.append(f"Itinerary vẫn còn vấn đề sau 1 lần retry: {', '.join(issues)}")

        selected_ids = [slot.place_id for day in days for slot in day.time_slots]
        return days, selected_ids, warnings

    def _build_days(
        self,
        request: ParsedUserRequest,
        candidate_pool: Sequence[PlaceCandidate],
        selected_hotel: Optional[PlaceCandidate],
        cluster_radius_km: float,
        warnings: List[str],
    ) -> List[DayItinerary]:
        unused = [p for p in candidate_pool if p.category != "HOTEL"]
        unused.sort(key=lambda p: (p.score, p.rating, p.user_ratings_total), reverse=True)
        templates = SLOT_TEMPLATES.get(request.travel_pace, SLOT_TEMPLATES["MODERATE"])
        days: List[DayItinerary] = []

        for day_number in range(1, request.duration_days + 1):
            seed = self._pick_seed(unused)
            day_places: List[PlaceCandidate] = []
            slots: List[TimeSlot] = []
            last_place = seed or selected_hotel

            for template in templates:
                chosen = self._pick_for_slot(
                    unused=unused,
                    template=template,
                    last_place=last_place,
                    seed=seed,
                    cluster_radius_km=cluster_radius_km,
                    already_in_day=day_places,
                )
                if chosen is None:
                    continue
                unused = [p for p in unused if p.place_id != chosen.place_id]
                day_places.append(chosen)
                last_place = chosen
                slots.append(self._to_slot(chosen, template, request, seed))

            if not slots:
                warnings.append(f"Ngày {day_number} không gán được địa điểm.")
            segments = self.route_provider.calculate_route_segments(day_places)
            days.append(
                DayItinerary(
                    day_number=day_number,
                    date_label=f"Ngày {day_number}",
                    time_slots=slots,
                    route_segments=segments,
                    total_travel_distance_km=round(sum(s.distance_km for s in segments), 2),
                    total_travel_time_minutes=sum(s.duration_minutes for s in segments),
                    daily_cost=sum(s.estimated_cost for s in slots),
                )
            )
        return days

    def _pick_seed(self, unused: Sequence[PlaceCandidate]) -> Optional[PlaceCandidate]:
        candidates = [p for p in unused if p.category == "ATTRACTION"] or list(unused)
        if not candidates:
            return None

        def cluster_score(place: PlaceCandidate) -> tuple[int, float]:
            neighbors = sum(
                1
                for other in unused
                if other.place_id != place.place_id
                and haversine_km(place.latitude, place.longitude, other.latitude, other.longitude) <= CLUSTER_RADIUS_KM
            )
            return neighbors, place.score

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
    ) -> Optional[PlaceCandidate]:
        ranked: List[Tuple[float, PlaceCandidate]] = []
        for place in unused:
            if place.place_id in {p.place_id for p in already_in_day}:
                continue
            if not self._opening_hours_compatible(place, template.start_time):
                continue
            distance = 0.0
            anchor = last_place or seed
            if anchor is not None:
                distance = haversine_km(anchor.latitude, anchor.longitude, place.latitude, place.longitude)
                nearby_exists = any(
                    haversine_km(anchor.latitude, anchor.longitude, other.latitude, other.longitude) <= LONG_DISTANCE_KM
                    for other in unused
                    if other.place_id != place.place_id
                )
                if distance > LONG_DISTANCE_KM and nearby_exists:
                    continue
            category_bonus = 0.35 if place.category in template.preferred_categories else 0.0
            cluster_bonus = 0.2 if distance <= cluster_radius_km else 0.0
            distance_penalty = min(distance / 10.0, 2.0) * 0.15
            ranked.append((place.score + category_bonus + cluster_bonus - distance_penalty, place))

        preferred = [item for item in ranked if item[1].category in template.preferred_categories]
        pool = preferred or ranked
        if not pool:
            return None
        pool.sort(key=lambda item: item[0], reverse=True)
        return pool[0][1]

    def _to_slot(
        self,
        place: PlaceCandidate,
        template: SlotTemplate,
        request: ParsedUserRequest,
        seed: Optional[PlaceCandidate],
    ) -> TimeSlot:
        reasons = list(place.reason_codes)
        if "AVOID_DUPLICATE" not in reasons:
            reasons.append("AVOID_DUPLICATE")
        if seed is not None:
            distance = haversine_km(seed.latitude, seed.longitude, place.latitude, place.longitude)
            if distance <= CLUSTER_RADIUS_KM:
                reasons.append("NEARBY_CLUSTER")
            if distance <= STRICT_CLUSTER_RADIUS_KM:
                reasons.append("ROUTE_EFFICIENT")
        if place.opening_hours:
            reasons.append("OPENING_HOURS")
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
        if place.category == "ATTRACTION" and place.ticket_price is not None:
            return place.ticket_price * num_travelers
        if place.estimated_cost_per_person is not None:
            return place.estimated_cost_per_person * num_travelers
        return 0

    @staticmethod
    def _describe(place: PlaceCandidate, template: SlotTemplate) -> str:
        labels = {
            "CAFE": "Thưởng thức cà phê",
            "RESTAURANT": "Dùng bữa",
            "ATTRACTION": "Tham quan",
            "HOTEL": "Nghỉ ngơi tại khách sạn",
        }
        return f"{labels.get(place.category, 'Ghé thăm')} {place.name} ({template.slot_type.lower()})."

    @staticmethod
    def _opening_hours_compatible(place: PlaceCandidate, start_time: str) -> bool:
        hours = place.opening_hours
        if not hours:
            return True
        periods = hours.get("periods") if isinstance(hours, dict) else None
        if not periods:
            return True
        hour, minute = (int(part) for part in start_time.split(":"))
        start_minutes = hour * 60 + minute
        matched_any = False
        for period in periods:
            open_info = period.get("open") or {}
            close_info = period.get("close") or {}
            if "hour" not in open_info:
                continue
            matched_any = True
            open_minutes = int(open_info.get("hour", 0)) * 60 + int(open_info.get("minute", 0))
            if not close_info:
                if start_minutes >= open_minutes:
                    return True
                continue
            close_minutes = int(close_info.get("hour", 23)) * 60 + int(close_info.get("minute", 59))
            if open_minutes <= start_minutes < close_minutes:
                return True
        return True if not matched_any else False
