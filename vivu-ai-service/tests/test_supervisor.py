from __future__ import annotations
import pytest
from app.agents.supervisor import SupervisorAgent
from app.schemas.request import ParsedUserRequest

@pytest.fixture
def supervisor():
    return SupervisorAgent()

def test_supervisor_full_valid_prompt(supervisor):
    prompt = "Đà Lạt 3 ngày 2 người 5 triệu thích cà phê và thiên nhiên"
    res = supervisor.parse(prompt)

    assert res.intent == "CREATE_PLAN"
    assert res.destination_city == "Đà Lạt"
    assert res.duration_days == 3
    assert res.num_travelers == 2
    assert res.total_budget == 5_000_000
    assert "CAFE" in res.interests
    assert "NATURE" in res.interests
    assert res.missing_fields == []
    assert res.clarification_question is None

    parsed = supervisor.to_parsed_user_request(res)
    assert isinstance(parsed, ParsedUserRequest)
    assert parsed.destination_city == "Đà Lạt"
    assert parsed.duration_days == 3
    assert parsed.num_travelers == 2
    assert parsed.total_budget == 5_000_000
    assert parsed.travel_style == "BALANCED"
    assert parsed.travel_pace == "MODERATE"

def test_supervisor_missing_budget_asks_clarification(supervisor):
    prompt = "Đi Đà Lạt 3 ngày 2 người"
    res = supervisor.parse(prompt)

    assert res.intent == "CLARIFICATION_NEEDED"
    assert "total_budget" in res.missing_fields
    assert res.destination_city == "Đà Lạt"
    assert res.duration_days == 3
    assert res.num_travelers == 2
    assert res.clarification_question is not None
    assert "ngân sách" in res.clarification_question.lower()

    parsed = supervisor.to_parsed_user_request(res)
    assert parsed is None

def test_supervisor_missing_travelers_policy_a(supervisor):
    prompt = "Đi Đà Lạt 3 ngày 5 triệu"
    res = supervisor.parse(prompt)

    assert res.intent == "CLARIFICATION_NEEDED"
    assert "num_travelers" in res.missing_fields
    assert res.clarification_question is not None
    assert "người" in res.clarification_question.lower()

def test_supervisor_missing_destination(supervisor):
    prompt = "Lên tour 3 ngày 2 người 6 triệu"
    res = supervisor.parse(prompt)

    assert res.intent == "CLARIFICATION_NEEDED"
    assert "destination_city" in res.missing_fields
    assert res.clarification_question is not None

def test_supervisor_multiple_missing_fields(supervisor):
    prompt = "Đi du lịch 3 ngày"
    res = supervisor.parse(prompt)

    assert res.intent == "CLARIFICATION_NEEDED"
    assert "destination_city" in res.missing_fields
    assert "num_travelers" in res.missing_fields
    assert "total_budget" in res.missing_fields
    assert res.clarification_question is not None

def test_supervisor_general_chat(supervisor):
    res = supervisor.parse("Xin chào bạn là ai")
    assert res.intent == "GENERAL_CHAT"
    assert res.response_text is not None
    assert len(res.response_text) > 0

def test_supervisor_money_variations(supervisor):
    variations = [
        ("Đà Lạt 3 ngày 2 người 5tr", 5_000_000),
        ("Đà Lạt 3 ngày 2 người 5 trieu", 5_000_000),
        ("Đà Lạt 3 ngày 2 người 5 củ", 5_000_000),
        ("Đà Lạt 3 ngày 2 người 5.000.000 đ", 5_000_000),
        ("Đà Lạt 3 ngày 2 người 5M", 5_000_000),
    ]
    for prompt, expected_budget in variations:
        res = supervisor.parse(prompt)
        assert res.total_budget == expected_budget, f"Failed for prompt: {prompt}"

def test_supervisor_traveler_variations(supervisor):
    res1 = supervisor.parse("Đà Lạt 3 ngày đi một mình 3 triệu")
    assert res1.num_travelers == 1

    res2 = supervisor.parse("Đà Lạt 3 ngày 2 vợ chồng 10 triệu")
    assert res2.num_travelers == 2

    res3 = supervisor.parse("Đà Lạt 3 ngày nhóm 4 người 12 triệu")
    assert res3.num_travelers == 4

def test_supervisor_styles_and_pace(supervisor):
    prompt = "Đà Lạt 3 ngày 2 người 4 triệu tiết kiệm, lịch trình thư thả chill"
    res = supervisor.parse(prompt)
    assert res.travel_style == "BUDGET"
    assert res.travel_pace == "RELAXED"

    prompt_lux = "Đà Lạt 3 ngày 2 người 30 triệu sang chảnh 5 sao lịch trình dày đặc"
    res_lux = supervisor.parse(prompt_lux)
    assert res_lux.travel_style == "LUXURY"
    assert res_lux.travel_pace == "FAST"

def test_supervisor_3n2d_parsing(supervisor):
    """Kiểm tra parser không bị nhầm lẫn giữa số ngày và số đêm với định dạng 3n2d / 3N2D."""
    res1 = supervisor.parse("Đà Lạt 3n2d 2 người 5 triệu")
    assert res1.duration_days == 3, f"Expected 3 days, got {res1.duration_days}"

    res2 = supervisor.parse("Đà Lạt 4N3D 2 người 10 triệu")
    assert res2.duration_days == 4, f"Expected 4 days, got {res2.duration_days}"

    res3 = supervisor.parse("Đà Lạt 3 ngày 2 đêm 2 người 5 triệu")
    assert res3.duration_days == 3, f"Expected 3 days, got {res3.duration_days}"


def test_supervisor_no_false_positive_duration_from_travelers(supervisor):
    """
    Regression test P0: 'n' trong 'người' TUYỆT ĐỐI không được bị nhận nhầm là số ngày.
    Các prompt không có từ chỉ ngày phải trả về duration_days = None.
    """
    # "2 người" không có từ chỉ ngày → duration_days phải None
    res1 = supervisor.parse("Đà Lạt 2 người 5 triệu")
    assert res1.duration_days is None, (
        f"False positive! '2 người' bị parse thành duration_days={res1.duration_days}"
    )

    # "4 người" tương tự
    res2 = supervisor.parse("Đà Lạt 4 người 10 triệu")
    assert res2.duration_days is None, (
        f"False positive! '4 người' bị parse thành duration_days={res2.duration_days}"
    )

    # "3 triệu" – số trước đơn vị tiền không được thành ngày
    res3 = supervisor.parse("Đà Lạt 2 người 3 triệu")
    assert res3.duration_days is None, (
        f"False positive! '3 triệu' bị parse thành duration_days={res3.duration_days}"
    )

    # Prompt "Đà Nẵng 4 người 3 triệu" không có số ngày → duration_days phải None
    res5 = supervisor.parse("Đà Nẵng 4 người 3 triệu")
    assert res5.duration_days is None, (
        f"False positive! 'Đà Nẵng 4 người 3 triệu' bị parse thành duration_days={res5.duration_days}"
    )


def test_supervisor_hotel_preference_extraction(supervisor):
    """Kiểm tra SupervisorAgent trích xuất thành công hotel_preference nếu người dùng chỉ định."""
    res1 = supervisor.parse("Đà Lạt 3 ngày 2 người 5 triệu ở khách sạn Colline")
    assert res1.hotel_preference is not None
    assert "colline" in res1.hotel_preference.lower()

    res2 = supervisor.parse("Đà Nẵng 4 ngày 4 người 10 triệu tại resort Vinpearl")
    assert res2.hotel_preference is not None
    assert "vinpearl" in res2.hotel_preference.lower()

    # Nếu không chỉ định khách sạn thì hotel_preference phải là None
    res3 = supervisor.parse("Hà Nội 2 ngày 1 người 3 triệu")
    assert res3.hotel_preference is None

