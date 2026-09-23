from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.common import Provenance

class TimeSlot(BaseModel):
    slot_type: Literal["MORNING", "LUNCH", "AFTERNOON", "DINNER", "EVENING"]
    start_time: str                       # Ví dụ: "08:30"
    end_time: str                         # Ví dụ: "10:30"
    place_id: str                         # Tham chiếu tới candidate_pool
    place_name: str                       # Tên địa điểm để đọc nhanh
    activity_description: str = ""
    reason_codes: List[str] = Field(default_factory=list) # ["PREFERENCE_MATCH", "HIGH_RATING", "PROXIMITY"]
    estimated_cost: int = 0               # VND nguyên: tổng chi phí dự kiến cả đoàn tại slot này

class RouteSegment(BaseModel):
    from_place_id: str
    to_place_id: str
    distance_km: float = 0.0
    duration_minutes: int = 0
    provenance: Provenance

class DayItinerary(BaseModel):
    day_number: int
    date_label: Optional[str] = None      # Ví dụ: "Ngày 1"
    time_slots: List[TimeSlot] = Field(default_factory=list)
    route_segments: List[RouteSegment] = Field(default_factory=list)
    total_travel_distance_km: float = 0.0
    total_travel_time_minutes: int = 0
    daily_cost: int = 0                   # VND nguyên: tổng chi phí ngày
