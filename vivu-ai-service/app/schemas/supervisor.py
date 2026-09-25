from __future__ import annotations

from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


SupervisorIntent = Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]


class SupervisorParseResult(BaseModel):
    intent: SupervisorIntent
    destination_city: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=14)
    num_travelers: Optional[int] = Field(default=None, ge=1, le=50)
    total_budget: Optional[int] = Field(default=None, ge=0)
    interests: List[str] = Field(default_factory=list)
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED"
    travel_pace: Literal["RELAXED", "MODERATE", "FAST"] = "MODERATE"
    travel_style_explicit: bool = False
    travel_pace_explicit: bool = False
    hotel_preference: Optional[str] = None
    start_date: Optional[date] = None
    missing_fields: List[str] = Field(default_factory=list)
    clarification_question: Optional[str] = None
    response_text: Optional[str] = None
