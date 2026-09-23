from __future__ import annotations
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field

def utc_now_iso() -> str:
    """Helper trả về ISO format có timezone UTC chuẩn."""
    return datetime.now(timezone.utc).isoformat()

class Provenance(BaseModel):
    source: Literal[
        "GOOGLE_PLACES",
        "GOOGLE_ROUTES",
        "INTERNAL_DATABASE",
        "INTERNAL_ESTIMATE",
        "USER_INPUT",
    ]
    retrieved_at: str = Field(default_factory=utc_now_iso)
    is_estimate: bool = False

class AgentError(BaseModel):
    agent_name: Literal["Supervisor", "DestinationAgent", "ItineraryAgent", "BudgetAgent"]
    error_code: str          # Ví dụ: "NO_CANDIDATES_FOUND", "ROUTE_API_TIMEOUT", "MAX_LOOPS_EXCEEDED"
    message: str
    timestamp: str = Field(default_factory=utc_now_iso)
    recoverable: bool = True # False -> Supervisor ngắt graph và fallback an toàn

class AgentTraceLog(BaseModel):
    agent_name: str
    stage: str               # Ví dụ: "SEARCHING_CANDIDATES", "EVALUATING_COST", "SWAPPING_SLOT"
    status: Literal["STARTED", "RUNNING", "COMPLETED", "FAILED", "OPTIMIZING", "SKIPPED"]
    message: str
    duration_ms: Optional[int] = None
    timestamp: str = Field(default_factory=utc_now_iso)
