from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class BudgetBreakdown(BaseModel):
    hotel_cost: int = Field(default=0, ge=0)
    food_cost: int = Field(default=0, ge=0)
    ticket_cost: int = Field(default=0, ge=0)
    transport_cost: int = Field(default=0, ge=0)
    subtotal: int = Field(default=0, ge=0)
    misc_cost: int = Field(default=0, ge=0)
    total_calculated: int = Field(default=0, ge=0)
    max_budget: int = Field(default=0, ge=0)
    remaining: int = Field(default=0, ge=0)
    status: Literal["BUDGET_OK", "OVER_BUDGET"]
    over_amount: int = Field(default=0, ge=0)


class OptimizationTarget(BaseModel):
    target_category: Literal["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"]
    day_number: Optional[int] = Field(default=None, ge=1)
    slot_index: Optional[int] = Field(default=None, ge=0)
    current_place_id: str = Field(..., min_length=1)
    current_cost: int = Field(..., ge=0)
    target_reduction: int = Field(..., ge=0)
    reason: str = Field(..., min_length=1)


class OptimizationContext(BaseModel):
    previous_total: int = Field(default=0, ge=0)
    target_reduction_total: int = Field(default=0, ge=0)
    affected_days: List[int] = Field(default_factory=list)
    iteration_summary: str = ""
    progress_made: Optional[bool] = None
    termination_reason: Optional[
        Literal[
            "BUDGET_OK",
            "MAX_LOOPS",
            "NO_PROGRESS",
            "NO_TARGETS",
            "NON_RECOVERABLE_ERROR",
            "BUDGET_UNAVAILABLE",
        ]
    ] = None
