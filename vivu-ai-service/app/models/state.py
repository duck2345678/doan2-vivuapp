from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict

from app.schemas.budget import BudgetBreakdown, OptimizationContext, OptimizationTarget
from app.schemas.common import AgentError, AgentTraceLog
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.schemas.travel_plan import FinalTripPlan


MAX_OPTIMIZATION_LOOPS = 3

TerminationReason = Literal[
    "BUDGET_OK",
    "MAX_LOOPS",
    "NO_PROGRESS",
    "NO_TARGETS",
    "NON_RECOVERABLE_ERROR",
    "BUDGET_UNAVAILABLE",
]


class TravelPlanState(TypedDict):
    # 1. INPUT
    session_id: str
    user_id: Optional[str]
    raw_prompt: str
    user_preferences: Optional[Dict[str, Any]]

    # 2. SUPERVISOR
    intent: Optional[Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]]
    clarification_question: Optional[str]
    parsed_request: Optional[ParsedUserRequest]

    # 3. DESTINATION
    candidate_pool: List[PlaceCandidate]
    selected_place_ids: List[str]
    selected_hotel: Optional[PlaceCandidate]

    # 4. ITINERARY
    itinerary_days: List[DayItinerary]

    # 5. BUDGET
    budget_breakdown: Optional[BudgetBreakdown]

    # 6. OPTIMIZATION CONTROL
    optimization_targets: List[OptimizationTarget]
    optimization_context: Optional[OptimizationContext]
    loop_count: int
    max_loops: int
    optimization_exhausted: bool
    optimization_stalled: bool
    termination_reason: Optional[TerminationReason]

    # Best-plan snapshot: các field này phải restore cùng nhau.
    best_itinerary_days: Optional[List[DayItinerary]]
    best_budget_breakdown: Optional[BudgetBreakdown]
    best_selected_hotel: Optional[PlaceCandidate]
    best_selected_place_ids: List[str]
    best_over_amount: float

    # 7. OBSERVABILITY / RESILIENCE
    trace_logs: List[AgentTraceLog]
    warnings: List[str]
    errors: List[AgentError]

    # 8. FINAL
    final_plan: Optional[FinalTripPlan]
    final_response_text: Optional[str]
