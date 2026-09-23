from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class BudgetBreakdown(BaseModel):
    hotel_cost: int = 0
    food_cost: int = 0
    ticket_cost: int = 0
    transport_cost: int = 0
    subtotal: int = 0
    misc_cost: int = 0                   # 10% subtotal
    total_calculated: int = 0
    max_budget: int = 0
    remaining: int = 0                   # max(0, max_budget - total_calculated) khi BUDGET_OK
    status: Literal["BUDGET_OK", "OVER_BUDGET"]
    over_amount: int = 0

class OptimizationTarget(BaseModel):
    target_category: Literal["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"]
    day_number: Optional[int] = None
    slot_index: Optional[int] = None
    current_place_id: str
    current_cost: int                    # VND nguyên
    target_reduction: int                # VND nguyên: cần giảm bao nhiêu tại slot này
    reason: str                          # Lý do cụ thể

class OptimizationContext(BaseModel):
    previous_total: int = 0              # VND nguyên
    target_reduction_total: int = 0      # VND nguyên
    affected_days: List[int] = Field(default_factory=list)
    iteration_summary: str = ""
