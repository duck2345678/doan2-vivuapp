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
