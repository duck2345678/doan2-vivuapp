from pydantic import BaseModel
import os

class Settings(BaseModel):
    app_name: str = "ViVu AI Service"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "8001"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
