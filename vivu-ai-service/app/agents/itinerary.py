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

