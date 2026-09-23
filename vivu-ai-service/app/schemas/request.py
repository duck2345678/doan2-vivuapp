from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class ParsedUserRequest(BaseModel):
    destination_city: str
    duration_days: int = Field(ge=1, le=14)
    num_travelers: int = Field(ge=1, le=50)
    total_budget: int = Field(ge=0, description="Tổng ngân sách chuyến đi tính bằng VND nguyên")
    interests: List[str] = Field(default_factory=list)
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED"
    travel_pace: Literal["RELAXED", "MODERATE", "FAST"] = "MODERATE"
    hotel_preference: Optional[str] = None
