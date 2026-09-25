"""Best-effort, non-blocking progress reporting for the Spring Boot bridge."""
from __future__ import annotations

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from contextvars import ContextVar, Token
from dataclasses import dataclass
from typing import Optional
from urllib import error, request

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProgressContext:
    session_id: str
    request_id: str


_progress_context: ContextVar[Optional[ProgressContext]] = ContextVar(
    "vivu_progress_context",
    default=None,
)


def set_progress_context(session_id: str, request_id: str) -> Token:
    return _progress_context.set(
        ProgressContext(session_id=session_id, request_id=request_id)
    )


def reset_progress_context(token: Token) -> None:
    _progress_context.reset(token)


def current_progress_context() -> Optional[ProgressContext]:
    return _progress_context.get()


class ProgressReporter:
    def __init__(self) -> None:
        self.callback_url = os.getenv(
            "AI_PROGRESS_CALLBACK_URL",
            "http://localhost:8080/internal/ai/progress",
        ).strip()
        self.internal_service_key = (
            os.getenv("AI_PROGRESS_INTERNAL_SERVICE_KEY", "").strip()
            or os.getenv("AI_INTERNAL_SERVICE_KEY", "").strip()
            or os.getenv("AI_PYTHON_INTERNAL_SERVICE_KEY", "").strip()
        )
        try:
            self.timeout_seconds = float(
                os.getenv("AI_PROGRESS_CALLBACK_TIMEOUT_SECONDS", "1.0")
            )
        except ValueError:
            self.timeout_seconds = 1.0

        self.enabled = bool(self.callback_url and self.internal_service_key)
        self._executor = ThreadPoolExecutor(
            max_workers=2,
            thread_name_prefix="vivu-ai-progress",
        )

    def emit(
        self,
        *,
        agent: str,
        status: str,
        message: str,
        loop_count: Optional[int] = None,
    ) -> None:
        context = current_progress_context()
        if not self.enabled or context is None:
            return

        payload = {
            "type": "AGENT_PROGRESS",
            "session_id": context.session_id,
            "request_id": context.request_id,
            "agent": agent,
            "status": status,
            "message": message,
        }
        if loop_count is not None:
            payload["loop_count"] = loop_count

        # Never block the planning graph on realtime observability.
        self._executor.submit(self._post, payload, context.request_id)

    def _post(self, payload: dict, request_id: str) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = request.Request(
            self.callback_url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Internal-Service-Key": self.internal_service_key,
                "X-Request-ID": request_id,
            },
        )

        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                if response.status >= 300:
                    logger.debug(
                        "AI progress callback returned HTTP %s",
                        response.status,
                    )
        except (error.URLError, TimeoutError, OSError) as exc:
            # Observability must never become a planning failure.
            logger.debug("AI progress callback failed: %s", exc)
        except Exception:
            logger.exception("Unexpected AI progress callback failure")


progress_reporter = ProgressReporter()
