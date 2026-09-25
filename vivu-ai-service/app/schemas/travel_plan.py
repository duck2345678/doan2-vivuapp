from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.budget import BudgetBreakdown
from app.schemas.common import utc_now_iso
from app.schemas.itinerary import DayItinerary
from app.schemas.place import PlaceCandidate


class FinalTripPlan(BaseModel):
    destination_city: str
    duration_days: int
    num_travelers: int
    total_budget: int
    itinerary_days: List[DayItinerary] = Field(default_factory=list)
    budget_breakdown: BudgetBreakdown
    selected_hotel: Optional[PlaceCandidate] = None
    generated_at: str = Field(default_factory=utc_now_iso)
