from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.common import Provenance


class PlaceCandidate(BaseModel):
    place_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    category: Literal["ATTRACTION", "CAFE", "RESTAURANT", "HOTEL"]
    interests: List[str] = Field(default_factory=list)
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    user_ratings_total: int = Field(default=0, ge=0)
    address: str = ""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    opening_hours: Optional[Dict[str, Any]] = None

    # None = provider không có dữ liệu. Không dùng 0 để biểu diễn "không biết".
    estimated_cost_per_person: Optional[int] = Field(
        default=None,
        ge=0,
        description=(
            "Chi phí ước tính theo người/lượt. None nghĩa là chưa biết; 0 chỉ dùng khi xác định là miễn phí."
        ),
    )
    ticket_price: Optional[int] = Field(
        default=None,
        ge=0,
        description="Giá vé theo người. None nghĩa là provider không cung cấp/không xác định.",
    )
    estimated_room_cost_per_night: Optional[int] = Field(
        default=None,
        ge=0,
        description="Giá phòng ước tính/phòng/đêm; None nếu chưa xác định.",
    )

    provenance: Provenance
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    reason_codes: List[str] = Field(default_factory=list)
