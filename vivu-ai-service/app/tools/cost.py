from __future__ import annotations
from typing import Dict, Literal, Optional
from app.schemas.budget import BudgetBreakdown

# Bảng giá định mức cơ bản theo phân khúc (VND)
COST_TABLE: Dict[str, Dict[str, int]] = {
    "BUDGET": {
        "hotel_per_room": 300_000,       # Khách sạn/Homestay tiết kiệm / đêm
        "meal_per_person_day": 180_000,  # 3 bữa x 60k / người / ngày
    },
    "BALANCED": {
        "hotel_per_room": 700_000,       # Khách sạn 3 sao / đêm
        "meal_per_person_day": 350_000,  # 3 bữa ăn tiêu chuẩn / người / ngày
    },
    "LUXURY": {
        "hotel_per_room": 1_500_000,     # Resort/Khách sạn 4-5 sao / đêm
        "meal_per_person_day": 750_000,  # Nhà hàng cao cấp / người / ngày
    },
}

def calculate_rooms(num_travelers: int) -> int:
    """
    Tính số phòng khách sạn dựa trên số người (tiêu chuẩn 2 người/phòng).
    1 người -> 1 phòng
    2 người -> 1 phòng
    3 người -> 2 phòng
    4 người -> 2 phòng
    """
    if num_travelers <= 0:
        return 0
    return (num_travelers + 1) // 2

def calculate_budget(
    *,
    num_travelers: int,
    num_days: int,
    num_nights: int,
    max_budget: int,
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED",
    ticket_cost: int = 0,
    transport_cost: int = 0,
    explicit_hotel_cost: Optional[int] = None,
    explicit_food_cost: Optional[int] = None,
) -> BudgetBreakdown:
    """
    Deterministic Cost Engine: Tính toán ngân sách chuẩn xác 100% bằng toán số học nguyên.
    Tuyệt đối không nhận LLM total hoặc các ước tính trôi nổi.

    Công thức:
      - Hotel = explicit_hotel_cost OR (rooms * num_nights * rate)
      - Food = explicit_food_cost OR (travelers * days * meal_rate)
      - Subtotal = hotel + food + ticket + transport
      - Misc (10% contingency) = subtotal // 10
      - Total = subtotal + misc
      - Status = BUDGET_OK nếu Total <= max_budget, ngược lại OVER_BUDGET
    """
    rates = COST_TABLE.get(travel_style, COST_TABLE["BALANCED"])
    rooms = calculate_rooms(num_travelers)

    # 1. Hotel Cost
    if explicit_hotel_cost is not None:
        hotel_cost = explicit_hotel_cost
    else:
        hotel_cost = rooms * max(0, num_nights) * rates["hotel_per_room"]

    # 2. Food Cost
    if explicit_food_cost is not None:
        food_cost = explicit_food_cost
    else:
        food_cost = num_travelers * max(0, num_days) * rates["meal_per_person_day"]

    # 3. Subtotal
    subtotal = hotel_cost + food_cost + ticket_cost + transport_cost

    # 4. Misc / Contingency Buffer (10% integer math)
    misc_cost = subtotal // 10

    # 5. Total Calculated
    total_calculated = subtotal + misc_cost

    # 6. Evaluation
    is_ok = total_calculated <= max_budget
    status: Literal["BUDGET_OK", "OVER_BUDGET"] = "BUDGET_OK" if is_ok else "OVER_BUDGET"
    over_amount = max(0, total_calculated - max_budget)
    remaining = max(0, max_budget - total_calculated)

    return BudgetBreakdown(
        hotel_cost=hotel_cost,
        food_cost=food_cost,
        ticket_cost=ticket_cost,
        transport_cost=transport_cost,
        subtotal=subtotal,
        misc_cost=misc_cost,
        total_calculated=total_calculated,
        max_budget=max_budget,
        remaining=remaining,
        status=status,
        over_amount=over_amount,
    )
