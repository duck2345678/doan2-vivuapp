from __future__ import annotations
import pytest
from app.graph.travel_graph import travel_graph
from app.models.state import TravelPlanState

def make_initial_state(prompt: str, session_id: str = "test-session-123") -> TravelPlanState:
    return {
        "session_id": session_id,
        "user_id": "user-456",
        "raw_prompt": prompt,
        "user_preferences": None,
        "intent": None,
        "clarification_question": None,
        "parsed_request": None,
        "candidate_pool": [],
        "selected_place_ids": [],
        "selected_hotel": None,
        "itinerary_days": [],
        "budget_breakdown": None,
        "optimization_targets": [],
        "optimization_context": None,
        "loop_count": 0,
        "max_loops": 3,
        "optimization_exhausted": False,
        "trace_logs": [],
        "warnings": [],
        "errors": [],
        "final_plan": None,
        "final_response_text": None,
    }

def test_graph_create_plan_flow():
    """
    Kịch bản thành công: Người dùng cung cấp đầy đủ 4 trường bắt buộc.
    Supervisor -> Intent=CREATE_PLAN -> Destination -> candidate_pool được tuyển chọn đa dạng.
    """
    state = make_initial_state("Đà Lạt 3 ngày 2 người 5 triệu thích cà phê và thiên nhiên")
    final_state = travel_graph.invoke(state)

    # 1. Kiểm tra Supervisor routing
    assert final_state["intent"] == "CREATE_PLAN"
    assert final_state["parsed_request"] is not None
    assert final_state["parsed_request"].destination_city == "Đà Lạt"
    assert final_state["parsed_request"].duration_days == 3
    assert final_state["parsed_request"].num_travelers == 2
    assert final_state["parsed_request"].total_budget == 5_000_000

    # 2. Kiểm tra Destination Node execution
    pool = final_state["candidate_pool"]
    assert len(pool) >= 4, f"Cần có ít nhất 4 ứng viên đa dạng, nhận được {len(pool)}"

    # 3. Kiểm tra tính đa dạng (Diversity Selection) & Khách sạn được chọn
    categories = set(c.category for c in pool)
    assert "HOTEL" in categories
    assert "ATTRACTION" in categories
    assert "CAFE" in categories
    assert "RESTAURANT" in categories

    assert final_state["selected_hotel"] is not None
    assert final_state["selected_hotel"].category == "HOTEL"

    # 4. Kiểm tra Trace Logs
    agent_names = [log.agent_name for log in final_state["trace_logs"]]
    assert "Supervisor" in agent_names
    assert "DestinationAgent" in agent_names
    assert "ItineraryAgent" in agent_names

    days = final_state["itinerary_days"]
    assert len(days) == 3
    ids = [slot.place_id for day in days for slot in day.time_slots]
    assert ids
    assert len(ids) == len(set(ids))

def test_graph_clarification_missing_budget_flow():
    """
    Kịch bản thiếu ngân sách: 'Đi Đà Lạt 3 ngày 2 người'
    Supervisor -> CLARIFICATION_NEEDED -> Clarification Node -> hỏi ngân sách -> END (Không vào Destination).
    """
    state = make_initial_state("Đi Đà Lạt 3 ngày 2 người")
    final_state = travel_graph.invoke(state)

    assert final_state["intent"] == "CLARIFICATION_NEEDED"
    assert final_state["parsed_request"] is None
    assert final_state["clarification_question"] is not None
    assert "ngân sách" in final_state["clarification_question"].lower()

    # Destination Node không được chạy -> candidate_pool rỗng
    assert len(final_state["candidate_pool"]) == 0

    # final_response_text chứa câu hỏi làm rõ
    assert final_state["final_response_text"] == final_state["clarification_question"]

    # Trace logs chỉ có Supervisor, không có DestinationAgent
    agent_names = [log.agent_name for log in final_state["trace_logs"]]
    assert "Supervisor" in agent_names
    assert "DestinationAgent" not in agent_names

def test_graph_general_chat_flow():
    """
    Kịch bản chào hỏi thông thường:
    Supervisor -> GENERAL_CHAT -> General Chat Node -> Trả lời thân thiện -> END.
    """
    state = make_initial_state("Xin chào bạn là ai")
    final_state = travel_graph.invoke(state)

    assert final_state["intent"] == "GENERAL_CHAT"
    assert len(final_state["candidate_pool"]) == 0
    assert final_state["final_response_text"] is not None
    assert len(final_state["final_response_text"]) > 0
