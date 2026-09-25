from __future__ import annotations

from typing import Dict, Literal, Optional

from app.schemas.budget import BudgetBreakdown


COST_TABLE: Dict[str, Dict[str, int]] = {
    "BUDGET": {
        "hotel_per_room": 300_000,
        "meal_per_person_day": 180_000,
    },
    "BALANCED": {
        "hotel_per_room": 700_000,
        "meal_per_person_day": 350_000,
    },
    "LUXURY": {
        "hotel_per_room": 1_500_000,
        "meal_per_person_day": 750_000,
    },
}

DEFAULT_TRANSPORT_RATE_PER_KM = 10_000
MISC_CONTINGENCY_PERCENT = 10


def calculate_rooms(num_travelers: int) -> int:
    if num_travelers <= 0:
        raise ValueError("num_travelers phải lớn hơn 0")
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
    if travel_style not in COST_TABLE:
        raise ValueError(f"travel_style không hợp lệ: {travel_style!r}")
    if num_travelers <= 0:
        raise ValueError("num_travelers phải lớn hơn 0")
    if num_days <= 0:
        raise ValueError("num_days phải lớn hơn 0")
    if num_nights < 0 or num_nights > num_days - 1:
        raise ValueError("num_nights phải nằm trong khoảng 0..num_days-1")

    numeric_values = {
        "max_budget": max_budget,
        "ticket_cost": ticket_cost,
        "transport_cost": transport_cost,
    }
    if explicit_hotel_cost is not None:
        numeric_values["explicit_hotel_cost"] = explicit_hotel_cost
    if explicit_food_cost is not None:
        numeric_values["explicit_food_cost"] = explicit_food_cost

    for name, value in numeric_values.items():
        if value < 0:
            raise ValueError(f"{name} không được âm")

    rates = COST_TABLE[travel_style]
    rooms = calculate_rooms(num_travelers)

    hotel_cost = (
        explicit_hotel_cost
        if explicit_hotel_cost is not None
        else rooms * num_nights * rates["hotel_per_room"]
    )
    food_cost = (
        explicit_food_cost
        if explicit_food_cost is not None
        else num_travelers * num_days * rates["meal_per_person_day"]
    )

    subtotal = hotel_cost + food_cost + ticket_cost + transport_cost
    misc_cost = subtotal * MISC_CONTINGENCY_PERCENT // 100
    total_calculated = subtotal + misc_cost
    is_ok = total_calculated <= max_budget

    return BudgetBreakdown(
        hotel_cost=hotel_cost,
        food_cost=food_cost,
        ticket_cost=ticket_cost,
        transport_cost=transport_cost,
        subtotal=subtotal,
        misc_cost=misc_cost,
        total_calculated=total_calculated,
        max_budget=max_budget,
        remaining=max(0, max_budget - total_calculated),
        status="BUDGET_OK" if is_ok else "OVER_BUDGET",
        over_amount=max(0, total_calculated - max_budget),
    )
