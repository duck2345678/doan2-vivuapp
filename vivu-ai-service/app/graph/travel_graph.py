"""LangGraph travel planning graph — điều phối 4 agent và bounded optimization loop."""
from __future__ import annotations

from functools import wraps
from typing import Callable, Literal

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
from app.tools.progress import progress_reporter

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


def _progress_node(
    node_fn: Callable[[TravelPlanState], dict],
    *,
    agent: str,
    start_message: str,
    end_message: str,
) -> Callable[[TravelPlanState], dict]:
    """Wrap a node with best-effort progress events.

    Node execution and business state are never altered by progress failures.
    """

    @wraps(node_fn)
    def wrapped(state: TravelPlanState) -> dict:
        loop_count = state.get("loop_count", 0)
        progress_reporter.emit(
            agent=agent,
            status="RUNNING",
            message=start_message,
            loop_count=loop_count if loop_count > 0 else None,
        )

        try:
            result = node_fn(state)
        except Exception:
            progress_reporter.emit(
                agent=agent,
                status="FAILED",
                message="Không thể hoàn thành bước xử lý hiện tại.",
                loop_count=loop_count if loop_count > 0 else None,
            )
            raise

        result_loop_count = int(result.get("loop_count", loop_count) or 0)
        errors = list(result.get("errors", []))
        has_fatal_error = any(not getattr(error, "recoverable", True) for error in errors)
        final_status = "FAILED" if has_fatal_error else "COMPLETED"

        progress_reporter.emit(
            agent=agent,
            status=final_status,
            message=(
                "Bước xử lý gặp lỗi không thể khắc phục."
                if has_fatal_error
                else end_message
            ),
            loop_count=result_loop_count if result_loop_count > 0 else None,
        )
        return result

    return wrapped


def _clarification_progress_node(state: TravelPlanState) -> dict:
    progress_reporter.emit(
        agent="SUPERVISOR",
        status="CLARIFICATION_REQUIRED",
        message="Cần thêm thông tin để lập kế hoạch chính xác.",
    )
    return clarification_node(state)


def build_travel_graph():
    graph = StateGraph(TravelPlanState)

    graph.add_node(
        "supervisor",
        _progress_node(
            supervisor_node,
            agent="SUPERVISOR",
            start_message="Đang phân tích yêu cầu chuyến đi...",
            end_message="Đã phân tích yêu cầu chuyến đi.",
        ),
    )
    graph.add_node("clarification", _clarification_progress_node)
    graph.add_node(
        "general_chat",
        _progress_node(
            general_chat_node,
            agent="SUPERVISOR",
            start_message="Đang xử lý câu hỏi...",
            end_message="Đã xử lý câu hỏi.",
        ),
    )
    graph.add_node(
        "destination",
        _progress_node(
            destination_node,
            agent="DESTINATION",
            start_message="Đang tìm và chọn các địa điểm phù hợp...",
            end_message="Đã hoàn tất lựa chọn địa điểm.",
        ),
    )
    graph.add_node(
        "itinerary",
        _progress_node(
            itinerary_node,
            agent="ITINERARY",
            start_message="Đang xây dựng lịch trình và kiểm tra thời gian di chuyển...",
            end_message="Đã hoàn tất một phương án lịch trình.",
        ),
    )
    graph.add_node(
        "budget",
        _progress_node(
            budget_node,
            agent="BUDGET",
            start_message="Đang tính toán ngân sách và kiểm tra giới hạn chi phí...",
            end_message="Đã hoàn tất kiểm tra ngân sách.",
        ),
    )
    graph.add_node(
        "optimize",
        _progress_node(
            optimization_node,
            agent="OPTIMIZATION",
            start_message="Đang tối ưu lịch trình theo ngân sách...",
            end_message="Đã áp dụng một vòng tối ưu.",
        ),
    )
    graph.add_node(
        "exhausted",
        _progress_node(
            exhausted_node,
            agent="OPTIMIZATION",
            start_message="Đang hoàn thiện phương án tối ưu cuối cùng...",
            end_message="Đã xác định phương án cuối cùng.",
        ),
    )
    graph.add_node(
        "finalize",
        _progress_node(
            finalize_node,
            agent="SYSTEM",
            start_message="Đang đóng gói kết quả kế hoạch...",
            end_message="Đã hoàn tất xử lý kế hoạch.",
        ),
    )

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
