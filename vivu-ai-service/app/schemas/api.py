from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.common import AgentError, AgentTraceLog, utc_now_iso
from app.schemas.travel_plan import FinalTripPlan
from app.schemas.request import ParsedUserRequest
from app.schemas.place import PlaceCandidate
from app.schemas.itinerary import DayItinerary


class PlanGenerateRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    user_id: Optional[str] = Field(default=None, max_length=128)
    raw_prompt: str = Field(..., min_length=2, max_length=5000)
    user_preferences: Optional[Dict[str, Any]] = None


class PlanGenerateResponse(BaseModel):
    success: bool = True
    session_id: str
    intent: Optional[Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]] = None
    parsed_request: Optional[ParsedUserRequest] = None
    candidate_pool: List[PlaceCandidate] = Field(default_factory=list)
    selected_hotel: Optional[PlaceCandidate] = None
    itinerary_days: List[DayItinerary] = Field(default_factory=list)
    clarification_question: Optional[str] = None
    final_plan: Optional[FinalTripPlan] = None
    final_response_text: Optional[str] = None
    trace_logs: List[AgentTraceLog] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[AgentError] = Field(default_factory=list)
    optimization_exhausted: bool = False
    generated_at: str = Field(default_factory=utc_now_iso)


class APIErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str
    session_id: Optional[str] = None
    timestamp: str = Field(default_factory=utc_now_iso)
