from __future__ import annotations

import logging
from typing import Any, Dict

from app.agents.budget import BudgetAgent
from app.agents.destination import DestinationAgent
from app.agents.itinerary import ItineraryAgent
from app.agents.supervisor import SupervisorAgent
from app.models.state import MAX_OPTIMIZATION_LOOPS, TravelPlanState
from app.schemas.common import AgentError, AgentTraceLog
from app.schemas.travel_plan import FinalTripPlan

logger = logging.getLogger(__name__)

supervisor_agent = SupervisorAgent()
destination_agent = DestinationAgent()
itinerary_agent = ItineraryAgent()
budget_agent = BudgetAgent()


# ── Supervisor ─────────────────────────────────────────────────────────────────

def supervisor_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    try:
        result = supervisor_agent.parse(state.get("raw_prompt", ""))
        trace_logs.append(
            AgentTraceLog(
                agent_name="Supervisor",
                stage="PARSE_PROMPT",
                status="COMPLETED",
                message=f"Intent: {result.intent}; missing={result.missing_fields}",
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
        trace_logs.append(
            AgentTraceLog(
                agent_name="Supervisor",
                stage="PARSE_PROMPT",
                status="FAILED",
                message="Không thể phân tích yêu cầu.",
            )
        )
        return {
            "intent": "GENERAL_CHAT",
            "final_response_text": "Hệ thống chưa thể phân tích yêu cầu này.",
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    if result.intent == "CREATE_PLAN":
        parsed = supervisor_agent.to_parsed_user_request(result)
        if parsed is None:
            errors.append(
                AgentError(
                    agent_name="Supervisor",
                    error_code="PARSED_REQUEST_CONTRACT_VIOLATION",
                    message="Intent CREATE_PLAN nhưng ParsedUserRequest không thể tạo.",
                    recoverable=False,
                )
            )
        else:
            prefs = state.get("user_preferences") or {}
            updates: Dict[str, Any] = {}
            pref_interests = prefs.get("interests")
            if not parsed.interests and isinstance(pref_interests, list):
                updates["interests"] = [str(x).upper() for x in pref_interests if str(x).strip()]
            if not result.travel_style_explicit and prefs.get("travel_style") in {"BUDGET", "BALANCED", "LUXURY"}:
                updates["travel_style"] = prefs["travel_style"]
            if not result.travel_pace_explicit and prefs.get("travel_pace") in {"RELAXED", "MODERATE", "FAST"}:
                updates["travel_pace"] = prefs["travel_pace"]
            if parsed.hotel_preference is None and isinstance(prefs.get("hotel_preference"), str):
                updates["hotel_preference"] = prefs["hotel_preference"].strip() or None
            if updates:
                parsed = parsed.model_copy(update=updates)
        return {
            "intent": result.intent,
            "parsed_request": parsed,
            "clarification_question": None,
            "final_response_text": None,
            "loop_count": 0,
            "max_loops": MAX_OPTIMIZATION_LOOPS,
            "optimization_exhausted": False,
            "optimization_targets": [],
            "optimization_context": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    if result.intent == "CLARIFICATION_NEEDED":
        if result.missing_fields:
            warnings.append(f"Thiếu thông tin bắt buộc: {', '.join(result.missing_fields)}")
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


# ── Clarification / General Chat ───────────────────────────────────────────────

def clarification_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    question = state.get("clarification_question") or "Bạn có thể cung cấp thêm thông tin cho chuyến đi không?"
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


# ── Destination ────────────────────────────────────────────────────────────────

def destination_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    if parsed is None:
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="MISSING_PARSED_REQUEST",
                message="Destination node được gọi khi parsed_request=None.",
                recoverable=False,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="DestinationAgent",
                stage="FETCH_AND_SCORE_CANDIDATES",
                status="FAILED",
                message="Thiếu parsed_request.",
            )
        )
        return {
            "candidate_pool": [],
            "selected_hotel": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    try:
        candidates = destination_agent.process(parsed)
        selected_hotel = destination_agent.select_hotel(candidates)
    except Exception as exc:
        logger.exception("Destination agent failed")
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="DESTINATION_PROCESS_FAILED",
                message=str(exc),
                recoverable=True,
            )
        )
        candidates = []
        selected_hotel = None

    if not candidates:
        warnings.append(
            f"Không tìm thấy địa điểm phù hợp cho {parsed.destination_city}. Nếu đang chạy offline, hãy kiểm tra offline catalog."
        )
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="NO_CANDIDATES_FOUND",
                message=f"Không có candidate hợp lệ cho {parsed.destination_city}.",
                recoverable=True,
            )
        )

    counts = {category: sum(c.category == category for c in candidates) for category in DestinationAgent.CATEGORIES}
    for category in DestinationAgent.CATEGORIES:
        if counts[category] == 0:
            warnings.append(f"Candidate pool chưa có category {category}.")

    trace_logs.append(
        AgentTraceLog(
            agent_name="DestinationAgent",
            stage="FETCH_AND_SCORE_CANDIDATES",
            status="COMPLETED" if candidates else "FAILED",
            message=(
                f"Selected {len(candidates)} candidates for {parsed.destination_city}; "
                f"hotel={selected_hotel.name if selected_hotel else 'None'}; categories={counts}"
            ),
        )
    )

    return {
        "candidate_pool": candidates,
        "selected_hotel": selected_hotel,
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }


# ── Itinerary ──────────────────────────────────────────────────────────────────

def itinerary_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    candidate_pool = list(state.get("candidate_pool") or [])
    selected_hotel = state.get("selected_hotel")
    optimization_targets = list(state.get("optimization_targets") or [])
    optimization_context = state.get("optimization_context")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    is_replan = optimization_context is not None and optimization_targets

    if parsed is None:
        errors.append(
            AgentError(
                agent_name="ItineraryAgent",
                error_code="MISSING_PARSED_REQUEST",
                message="Itinerary node được gọi khi parsed_request=None.",
                recoverable=False,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="ItineraryAgent",
                stage="BUILD_ITINERARY",
                status="FAILED",
                message="Thiếu parsed_request.",
            )
        )
        return {
            "itinerary_days": [],
            "selected_place_ids": [],
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    if not candidate_pool:
        warnings.append("Bỏ qua lập lịch trình vì candidate_pool rỗng.")
        trace_logs.append(
            AgentTraceLog(
                agent_name="ItineraryAgent",
                stage="BUILD_ITINERARY",
                status="SKIPPED",
                message="candidate_pool rỗng.",
            )
        )
        return {
            "itinerary_days": [],
            "selected_place_ids": [],
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    # Khi replanning: loại các place_id có cost cao theo optimization_targets
    excluded_ids: set[str] = set()
    if is_replan:
        target_ids = {t.current_place_id for t in optimization_targets}
        excluded_ids = target_ids
        stage = "REPLANNING"
    else:
        stage = "BUILD_ITINERARY"

    effective_pool = [p for p in candidate_pool if p.place_id not in excluded_ids]
    if not effective_pool:
        # Fallback: dùng toàn bộ pool khi loại hết (không xảy ra trong thực tế)
        effective_pool = list(candidate_pool)
        warnings.append("Không thể loại bỏ target places; dùng lại toàn bộ candidate pool.")

    try:
        days, selected_ids, extra_warnings = itinerary_agent.process(parsed, effective_pool, selected_hotel)
        warnings.extend(extra_warnings)
        status = "COMPLETED" if days else "FAILED"
        if not days:
            errors.append(
                AgentError(
                    agent_name="ItineraryAgent",
                    error_code="ITINERARY_EMPTY",
                    message="Không tạo được lịch trình.",
                    recoverable=True,
                )
            )
        trace_logs.append(
            AgentTraceLog(
                agent_name="ItineraryAgent",
                stage=stage,
                status=status,
                message=f"Created {len(days)} days; stops={len(selected_ids)}",
            )
        )
        if days:
            trace_logs.append(
                AgentTraceLog(
                    agent_name="ItineraryAgent",
                    stage="ROUTE_VALIDATION",
                    status="COMPLETED",
                    message=f"segments={sum(len(day.route_segments) for day in days)}",
                )
            )
        return {
            "itinerary_days": days,
            "selected_place_ids": selected_ids,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }
    except Exception as exc:
        logger.exception("Itinerary agent failed")
        errors.append(
            AgentError(
                agent_name="ItineraryAgent",
                error_code="INVALID_AGENT_OUTPUT",
                message=str(exc),
                recoverable=True,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="ItineraryAgent",
                stage=stage,
                status="FAILED",
                message="Không thể tạo lịch trình.",
            )
        )
        return {
            "itinerary_days": [],
            "selected_place_ids": [],
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }


# ── Budget ─────────────────────────────────────────────────────────────────────

def budget_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    itinerary_days = list(state.get("itinerary_days") or [])
    candidate_pool = list(state.get("candidate_pool") or [])
    selected_hotel = state.get("selected_hotel")
    loop_count = state.get("loop_count", 0)
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    if parsed is None or not itinerary_days:
        errors.append(
            AgentError(
                agent_name="BudgetAgent",
                error_code="MISSING_ITINERARY",
                message="Budget node được gọi khi parsed_request hoặc itinerary_days rỗng.",
                recoverable=False,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="BudgetAgent",
                stage="CALCULATE_BUDGET",
                status="FAILED",
                message="Thiếu itinerary hoặc parsed_request.",
            )
        )
        return {
            "budget_breakdown": None,
            "optimization_targets": [],
            "optimization_context": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    try:
        breakdown, targets, context = budget_agent.process(
            request=parsed,
            itinerary_days=itinerary_days,
            candidate_pool=candidate_pool,
            selected_hotel=selected_hotel,
        )
    except Exception as exc:
        logger.exception("Budget agent failed")
        errors.append(
            AgentError(
                agent_name="BudgetAgent",
                error_code="BUDGET_CALCULATION_FAILED",
                message=str(exc),
                recoverable=False,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="BudgetAgent",
                stage="CALCULATE_BUDGET",
                status="FAILED",
                message="Lỗi tính ngân sách.",
            )
        )
        return {
            "budget_breakdown": None,
            "optimization_targets": [],
            "optimization_context": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    stage = breakdown.status  # "BUDGET_OK" or "OVER_BUDGET"
    trace_logs.append(
        AgentTraceLog(
            agent_name="BudgetAgent",
            stage=stage,
            status="COMPLETED",
            message=(
                f"total={breakdown.total_calculated:,} / budget={breakdown.max_budget:,}; "
                f"status={breakdown.status}; loop={loop_count}"
                + (f"; over={breakdown.over_amount:,}" if breakdown.status == "OVER_BUDGET" else "")
            ),
        )
    )

    if breakdown.status == "OVER_BUDGET":
        warnings.append(
            f"Plan vượt ngân sách {breakdown.over_amount:,} VND. "
            f"Loop {loop_count + 1}/{MAX_OPTIMIZATION_LOOPS}."
        )

    return {
        "budget_breakdown": breakdown,
        "optimization_targets": targets,
        "optimization_context": context,
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }


# ── Finalize ───────────────────────────────────────────────────────────────────

def finalize_node(state: TravelPlanState) -> Dict[str, Any]:
    """Đóng gói FinalTripPlan và tạo final_response_text."""
    parsed = state.get("parsed_request")
    itinerary_days = list(state.get("itinerary_days") or [])
    budget_breakdown = state.get("budget_breakdown")
    selected_hotel = state.get("selected_hotel")
    optimization_exhausted = state.get("optimization_exhausted", False)
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))

    if parsed is None or budget_breakdown is None:
        trace_logs.append(
            AgentTraceLog(
                agent_name="Finalize",
                stage="FINALIZE",
                status="FAILED",
                message="Thiếu parsed_request hoặc budget_breakdown để finalize.",
            )
        )
        return {
            "final_plan": None,
            "final_response_text": "Không thể hoàn tất kế hoạch chuyến đi.",
            "trace_logs": trace_logs,
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

    status_text = budget_breakdown.status
    if optimization_exhausted:
        response_text = (
            f"✅ Kế hoạch {parsed.duration_days} ngày {parsed.destination_city} đã hoàn thành. "
            f"⚠️ Sau {MAX_OPTIMIZATION_LOOPS} lần tối ưu vẫn vượt ngân sách "
            f"{budget_breakdown.over_amount:,} VND. Đây là plan tốt nhất tìm được."
        )
    elif status_text == "BUDGET_OK":
        response_text = (
            f"✅ Kế hoạch {parsed.duration_days} ngày {parsed.destination_city} "
            f"cho {parsed.num_travelers} người đã hoàn thành. "
            f"Tổng chi phí: {budget_breakdown.total_calculated:,} VND "
            f"(còn dư {budget_breakdown.remaining:,} VND)."
        )
    else:
        response_text = (
            f"Kế hoạch {parsed.duration_days} ngày {parsed.destination_city} đã hoàn thành "
            f"nhưng vượt ngân sách {budget_breakdown.over_amount:,} VND."
        )

    trace_logs.append(
        AgentTraceLog(
            agent_name="Finalize",
            stage="FINALIZE",
            status="COMPLETED",
            message=f"FinalTripPlan created; budget_status={status_text}",
        )
    )

    return {
        "final_plan": final_plan,
        "final_response_text": response_text,
        "trace_logs": trace_logs,
        "warnings": warnings,
    }


# ── Optimization ───────────────────────────────────────────────────────────────

def optimization_node(state: TravelPlanState) -> Dict[str, Any]:
    """Tăng loop_count và chuẩn bị cho Itinerary replan."""
    loop_count = state.get("loop_count", 0) + 1
    trace_logs = list(state.get("trace_logs", []))
    trace_logs.append(
        AgentTraceLog(
            agent_name="ItineraryAgent",
            stage="REPLANNING",
            status="OPTIMIZING",
            message=f"Bắt đầu replan lần {loop_count}/{MAX_OPTIMIZATION_LOOPS}.",
        )
    )
    return {"loop_count": loop_count, "trace_logs": trace_logs}


def exhausted_node(state: TravelPlanState) -> Dict[str, Any]:
    """Đánh dấu optimization_exhausted=True và đi thẳng đến finalize."""
    warnings = list(state.get("warnings", []))
    trace_logs = list(state.get("trace_logs", []))
    warnings.append(
        f"Đã đạt giới hạn {MAX_OPTIMIZATION_LOOPS} vòng tối ưu. "
        "Trả về plan tốt nhất tìm được."
    )
    trace_logs.append(
        AgentTraceLog(
            agent_name="BudgetAgent",
            stage="MAX_LOOPS_EXCEEDED",
            status="COMPLETED",
            message=f"optimization_exhausted sau {MAX_OPTIMIZATION_LOOPS} vòng.",
        )
    )
    return {
        "optimization_exhausted": True,
        "warnings": warnings,
        "trace_logs": trace_logs,
    }
