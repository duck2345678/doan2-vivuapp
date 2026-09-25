from __future__ import annotations

import os
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "ViVu AI Service"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8001")), ge=1, le=65535)
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()
    google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    google_places_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("GOOGLE_PLACES_TIMEOUT_SECONDS", "5.0")),
        gt=0,
        le=30,
    )
    google_routes_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("GOOGLE_ROUTES_TIMEOUT_SECONDS", "5.0")),
        gt=0,
        le=30,
    )


settings = Settings()
