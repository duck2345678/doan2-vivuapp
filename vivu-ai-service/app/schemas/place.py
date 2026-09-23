from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.common import Provenance

class PlaceCandidate(BaseModel):
    place_id: str                         # Google Place ID hoặc Internal ID
    name: str
    category: Literal["ATTRACTION", "CAFE", "RESTAURANT", "HOTEL"]
    interests: List[str] = Field(default_factory=list)
    rating: float = 0.0
    user_ratings_total: int = 0
    address: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    opening_hours: Optional[Dict[str, Any]] = None
    estimated_cost_per_person: int = 0    # VND nguyên
    ticket_price: int = 0                 # VND nguyên
    provenance: Provenance
    score: float = 0.0                    # Ranking score
