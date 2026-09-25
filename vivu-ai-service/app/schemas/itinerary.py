from __future__ import annotations

from datetime import time
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import Provenance


class TimeSlot(BaseModel):
    slot_type: Literal["MORNING", "LUNCH", "AFTERNOON", "DINNER", "EVENING"]
    start_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    place_id: str = Field(..., min_length=1)
    place_name: str = Field(..., min_length=1)
    activity_description: str = ""
    reason_codes: List[str] = Field(default_factory=list)
    estimated_cost: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_time_range(self) -> "TimeSlot":
        start = time.fromisoformat(self.start_time)
        end = time.fromisoformat(self.end_time)
        if end <= start:
            raise ValueError("end_time phải lớn hơn start_time trong cùng một ngày")
        return self


class RouteSegment(BaseModel):
    from_place_id: str = Field(..., min_length=1)
    to_place_id: str = Field(..., min_length=1)
    distance_km: float = Field(default=0.0, ge=0.0)
    duration_minutes: int = Field(default=0, ge=0)
    provenance: Provenance


class DayItinerary(BaseModel):
    day_number: int = Field(..., ge=1)
    date_label: Optional[str] = None
    time_slots: List[TimeSlot] = Field(default_factory=list)
    route_segments: List[RouteSegment] = Field(default_factory=list)
    total_travel_distance_km: float = Field(default=0.0, ge=0.0)
    total_travel_time_minutes: int = Field(default=0, ge=0)
    daily_cost: int = Field(default=0, ge=0)
