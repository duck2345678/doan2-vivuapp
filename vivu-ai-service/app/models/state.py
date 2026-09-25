from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional, TypedDict
from app.schemas.common import AgentError, AgentTraceLog
from app.schemas.request import ParsedUserRequest
from app.schemas.place import PlaceCandidate
from app.schemas.itinerary import DayItinerary
from app.schemas.budget import BudgetBreakdown, OptimizationTarget, OptimizationContext
from app.schemas.travel_plan import FinalTripPlan

# Giới hạn số lần re-planning tối đa của Budget Optimization Loop (chuẩn 3 vòng)
MAX_OPTIMIZATION_LOOPS = 3

class TravelPlanState(TypedDict):
    # 1. INPUT (Từ Spring Boot Bridge)
    session_id: str
    user_id: Optional[str]
    raw_prompt: str
    user_preferences: Optional[Dict[str, Any]]

    # 2. PARSED DATA (Supervisor Agent)
    intent: Optional[Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]]
    clarification_question: Optional[str]
    parsed_request: Optional[ParsedUserRequest]

    # 3. CANDIDATES POOL (Destination Agent - Normalized Data Store)
    candidate_pool: List[PlaceCandidate]
    selected_place_ids: List[str]         # Track các ID đang được dùng trên lịch trình
    selected_hotel: Optional[PlaceCandidate]

    # 4. ITINERARY (Itinerary Agent)
    itinerary_days: List[DayItinerary]

    # 5. BUDGET (Budget Agent)
    budget_breakdown: Optional[BudgetBreakdown]

    # 6. OPTIMIZATION CONTROL (Re-planning Loop)
    optimization_targets: List[OptimizationTarget]
    optimization_context: Optional[OptimizationContext]
    loop_count: int                       # 0: initial, 1..3: replan lần 1..3
    max_loops: int                        # Cố định = MAX_OPTIMIZATION_LOOPS (3)
    optimization_exhausted: bool          # True nếu sau 3 vòng vẫn OVER_BUDGET

    # 7. OBSERVABILITY & RESILIENCE
    trace_logs: List[AgentTraceLog]
    warnings: List[str]
    errors: List[AgentError]

    # 8. FINAL OUTPUT (Trả về Spring Boot)
    final_plan: Optional[FinalTripPlan]
    final_response_text: Optional[str]
