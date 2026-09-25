from app.tools.cost import calculate_budget, calculate_rooms, COST_TABLE

def test_calculate_rooms():
    import pytest

    with pytest.raises(ValueError, match="num_travelers phải lớn hơn 0"):
        calculate_rooms(0)
    assert calculate_rooms(1) == 1
    assert calculate_rooms(2) == 1
    assert calculate_rooms(3) == 2
    assert calculate_rooms(4) == 2
    assert calculate_rooms(5) == 3

def test_calculate_budget_standard_dalat_ok():
    # Bộ số chuẩn demo Đà Lạt: Subtotal 4.5M + Misc 450k = 4.95M <= 5.0M
    result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        explicit_hotel_cost=1_800_000,
        explicit_food_cost=1_400_000,
        ticket_cost=600_000,
        transport_cost=700_000,
    )
    assert result.subtotal == 4_500_000
    assert result.misc_cost == 450_000
    assert result.total_calculated == 4_950_000
    assert result.status == "BUDGET_OK"
    assert result.over_amount == 0

def test_calculate_budget_over_budget():
    result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        explicit_hotel_cost=2_500_000,
        explicit_food_cost=2_000_000,
        ticket_cost=1_000_000,
        transport_cost=500_000,
    )
    # subtotal = 6.0M -> misc = 600k -> total = 6.6M -> over = 1.6M
    assert result.subtotal == 6_000_000
    assert result.misc_cost == 600_000
    assert result.total_calculated == 6_600_000
    assert result.status == "OVER_BUDGET"
    assert result.over_amount == 1_600_000

def test_calculate_budget_default_rates_balanced():
    # 2 người, 3 ngày, 2 đêm -> 1 phòng
    # Hotel = 1 * 2 * 700k = 1,400,000
    # Food = 2 * 3 * 350k = 2,100,000
    # Ticket = 400,000, Transport = 300,000
    # Subtotal = 1.4M + 2.1M + 400k + 300k = 4,200,000
    # Misc = 420,000
    # Total = 4,620,000
    result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        travel_style="BALANCED",
        ticket_cost=400_000,
        transport_cost=300_000,
    )
    assert result.hotel_cost == 1_400_000
    assert result.food_cost == 2_100_000
    assert result.subtotal == 4_200_000
    assert result.misc_cost == 420_000
    assert result.total_calculated == 4_620_000
    assert result.status == "BUDGET_OK"
    assert result.over_amount == 0

def test_calculate_budget_integer_integrity():
    result = calculate_budget(
        num_travelers=3,
        num_days=4,
        num_nights=3,
        max_budget=10_000_000,
        ticket_cost=755_555,
        transport_cost=333_333,
    )
    assert isinstance(result.hotel_cost, int)
    assert isinstance(result.food_cost, int)
    assert isinstance(result.ticket_cost, int)
    assert isinstance(result.transport_cost, int)
    assert isinstance(result.subtotal, int)
    assert isinstance(result.misc_cost, int)
    assert isinstance(result.total_calculated, int)
    assert isinstance(result.over_amount, int)
    assert isinstance(result.remaining, int)

def test_calculate_budget_remaining():
    # Trường hợp 1: BUDGET_OK -> remaining = 5M - 4.95M = 50,000; over_amount = 0
    ok_result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        explicit_hotel_cost=1_800_000,
        explicit_food_cost=1_400_000,
        ticket_cost=600_000,
        transport_cost=700_000,
    )
    assert ok_result.status == "BUDGET_OK"
    assert ok_result.remaining == 50_000
    assert ok_result.over_amount == 0

    # Trường hợp 2: OVER_BUDGET -> remaining = 0; over_amount = 1.6M
    over_result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        explicit_hotel_cost=2_500_000,
        explicit_food_cost=2_000_000,
        ticket_cost=1_000_000,
        transport_cost=500_000,
    )
    assert over_result.status == "OVER_BUDGET"
    assert over_result.remaining == 0
    assert over_result.over_amount == 1_600_000

def test_travel_style_pricing_tiers():
    # Cùng chuyến đi 2 người 3 ngày 2 đêm
    # BUDGET: hotel=300k, meal=180k
    # BALANCED: hotel=700k, meal=350k
    # LUXURY: hotel=1500k, meal=750k
    b_res = calculate_budget(num_travelers=2, num_days=3, num_nights=2, max_budget=10_000_000, travel_style="BUDGET")
    bal_res = calculate_budget(num_travelers=2, num_days=3, num_nights=2, max_budget=10_000_000, travel_style="BALANCED")
    lux_res = calculate_budget(num_travelers=2, num_days=3, num_nights=2, max_budget=10_000_000, travel_style="LUXURY")

    assert b_res.hotel_cost < bal_res.hotel_cost < lux_res.hotel_cost
    assert b_res.food_cost < bal_res.food_cost < lux_res.food_cost
    assert b_res.total_calculated < bal_res.total_calculated < lux_res.total_calculated

def test_parsed_user_request_travel_style_to_cost_engine_integration():
    from app.schemas.request import ParsedUserRequest

    req = ParsedUserRequest(
        destination_city="Đà Lạt",
        duration_days=3,
        num_travelers=2,
        total_budget=5_000_000,
        interests=["CAFE", "NATURE"],
        travel_style="BUDGET",
        travel_pace="RELAXED",
    )

    budget = calculate_budget(
        num_travelers=req.num_travelers,
        num_days=req.duration_days,
        num_nights=req.duration_days - 1,
        max_budget=req.total_budget,
        travel_style=req.travel_style,
    )

    # hotel: 1 phong * 2 dem * 300k = 600k
    # food: 2 nguoi * 3 ngay * 180k = 1080k
    # subtotal: 1680k
    # misc: 168k
    # total: 1848k
    assert budget.hotel_cost == 600_000
    assert budget.food_cost == 1_080_000
    assert budget.total_calculated == 1_848_000
    assert budget.remaining == 5_000_000 - 1_848_000
    assert budget.over_amount == 0

def test_calculate_budget_invalid_inputs():
    import pytest

    # Sai travel_style
    with pytest.raises(ValueError, match="travel_style không hợp lệ"):
        calculate_budget(num_travelers=2, num_days=3, num_nights=2, max_budget=5_000_000, travel_style="UNKNOWN") # type: ignore

    # num_travelers <= 0
    with pytest.raises(ValueError, match="num_travelers phải lớn hơn 0"):
        calculate_budget(num_travelers=0, num_days=3, num_nights=2, max_budget=5_000_000)

    # num_days <= 0
    with pytest.raises(ValueError, match="num_days phải lớn hơn 0"):
        calculate_budget(num_travelers=2, num_days=0, num_nights=2, max_budget=5_000_000)

    # num_nights < 0 hoặc > num_days
    with pytest.raises(ValueError, match="num_nights phải nằm trong khoảng 0..num_days"):
        calculate_budget(num_travelers=2, num_days=3, num_nights=-1, max_budget=5_000_000)

    # max_budget < 0
    with pytest.raises(ValueError, match="không được âm"):
        calculate_budget(num_travelers=2, num_days=3, num_nights=2, max_budget=-500)
