from app.agents.supervisor import SupervisorAgent
from app.tools.cost import calculate_budget


def test_supervisor_full_plan():
    result = SupervisorAgent().parse("Đà Lạt 3 ngày 2 người 5tr thích cafe")
    assert result.intent == "CREATE_PLAN"
    assert result.total_budget == 5_000_000
    assert "CAFE" in result.interests


def test_supervisor_does_not_treat_phone_as_budget():
    result = SupervisorAgent().parse("Đi Huế 2 ngày 2 người, số điện thoại 0901234567")
    assert result.intent == "CLARIFICATION_NEEDED"
    assert result.total_budget is None
    assert "total_budget" in result.missing_fields


def test_non_trip_question_is_general_chat():
    assert SupervisorAgent().parse("Python là gì?").intent == "GENERAL_CHAT"
    assert SupervisorAgent().parse("thời tiết Đà Lạt hôm nay").intent == "GENERAL_CHAT"


def test_cost_engine_uses_contingency_percentage():
    result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        travel_style="BALANCED",
    )
    assert result.subtotal == 3_500_000
    assert result.misc_cost == 350_000
    assert result.total_calculated == 3_850_000
    assert result.status == "BUDGET_OK"
