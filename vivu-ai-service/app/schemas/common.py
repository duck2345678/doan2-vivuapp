from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Provenance(BaseModel):
    """
    Nguồn gốc bản ghi.

    is_estimate=True chỉ có nghĩa bản ghi chứa ít nhất một trường ước tính
    (ví dụ priceLevel -> estimated cost), không có nghĩa tên/tọa độ/rating là giả lập.
    """

    source: Literal[
        "GOOGLE_PLACES",
        "GOOGLE_ROUTES",
        "INTERNAL_DATABASE",
        "INTERNAL_ESTIMATE",
        "USER_INPUT",
    ]
    source_id: Optional[str] = None
    retrieved_at: str = Field(default_factory=utc_now_iso)
    is_estimate: bool = False


class AgentError(BaseModel):
    agent_name: Literal[
        "Supervisor",
        "DestinationAgent",
        "ItineraryAgent",
        "BudgetAgent",
        "GraphOrchestrator",
    ]
    error_code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    timestamp: str = Field(default_factory=utc_now_iso)
    recoverable: bool = True


class AgentTraceLog(BaseModel):
    agent_name: str
    stage: str
    status: Literal[
        "STARTED",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "OPTIMIZING",
        "SKIPPED",
    ]
    message: str
    duration_ms: Optional[int] = Field(default=None, ge=0)
    timestamp: str = Field(default_factory=utc_now_iso)
