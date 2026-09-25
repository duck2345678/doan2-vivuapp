"""Optional Gemini semantic helper.

Phase 3-4 correctness không phụ thuộc LLM. Module này chỉ cung cấp optional
semantic enrichment cho Supervisor (interest/style/pace/hotel), không được
phép trở thành nguồn sự thật cho budget/route/DB entities.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

SUPERVISOR_SEMANTIC_SYSTEM_PROMPT = """
Bạn là bộ semantic parser cho ViVu AI.
Chỉ trích xuất các preference mà người dùng thực sự thể hiện hoặc nói rõ.
Không được tự đoán điểm đến, số ngày, số người hay ngân sách.
Trả về JSON với các field:
{
  "interests": string[],
  "travel_style": "BUDGET|BALANCED|LUXURY|null",
  "travel_pace": "RELAXED|MODERATE|FAST|null",
  "hotel_preference": string|null
}
Nếu không chắc hoặc người dùng không nói, dùng null / [].
""".strip()


class GeminiSemanticParser:
    """Optional, fail-safe semantic enrichment layer."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or getattr(settings, "gemini_api_key", None)
        self.model = model or getattr(settings, "gemini_model", "gemini-2.5-flash")
        self._client = None

        if not self.api_key:
            return

        try:
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        except Exception:
            logger.warning(
                "Không khởi tạo được Gemini client; semantic enrichment disabled.",
                exc_info=True,
            )
            self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    def parse(self, raw_prompt: str) -> Optional[Dict[str, Any]]:
        if not self.available:
            return None
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=(
                    SUPERVISOR_SEMANTIC_SYSTEM_PROMPT
                    + "\n\nUSER:\n"
                    + raw_prompt
                ),
            )
            text = getattr(response, "text", None)
            if not text:
                return None
            if "```" in text:
                text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            return data if isinstance(data, dict) else None
        except Exception:
            logger.warning(
                "Gemini semantic parsing failed; use deterministic parser.",
                exc_info=True,
            )
            return None
