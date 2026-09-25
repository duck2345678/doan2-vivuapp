from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.graph.travel_graph import travel_graph
from app.models.state import MAX_OPTIMIZATION_LOOPS, TravelPlanState
from app.schemas.api import APIErrorResponse, PlanGenerateRequest, PlanGenerateResponse
from app.tools.progress import reset_progress_context, set_progress_context

logging.basicConfig(level=getattr(logging, settings.log_level, logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.1.0",
    description="ViVu AI Orchestration Service - Phase 1–3",
)


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request, exc: RequestValidationError):
    message = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=APIErrorResponse(error_code="VALIDATION_ERROR", message=message).model_dump(),
    )


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.environment,
    }


def _initial_state(request: PlanGenerateRequest) -> TravelPlanState:
    return {
        "session_id": request.session_id,
        "user_id": request.user_id,
        "raw_prompt": request.raw_prompt,
        "user_preferences": request.user_preferences,
        "intent": None,
        "clarification_question": None,
        "parsed_request": None,
        "candidate_pool": [],
        "selected_place_ids": [],
        "selected_hotel": None,
        "itinerary_days": [],
        "budget_breakdown": None,
        "optimization_targets": [],
        "optimization_context": None,
        "loop_count": 0,
        "max_loops": MAX_OPTIMIZATION_LOOPS,
        "optimization_exhausted": False,
        "trace_logs": [],
        "warnings": [],
        "errors": [],
        "final_plan": None,
        "final_response_text": None,
    }


@app.post(
    "/api/v1/plan/generate",
    response_model=PlanGenerateResponse,
    responses={422: {"model": APIErrorResponse}, 500: {"model": APIErrorResponse}},
)
def generate_trip_plan(request: PlanGenerateRequest, http_request: Request):
    request_id = http_request.headers.get("X-Request-ID") or request.session_id
    progress_token = set_progress_context(request.session_id, request_id)
    try:
        final_state = travel_graph.invoke(_initial_state(request))
    except Exception:
        logger.exception("Unhandled graph execution error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=APIErrorResponse(
                error_code="GRAPH_EXECUTION_FAILED",
                message="Không thể thực thi quy trình lập kế hoạch.",
                session_id=request.session_id,
            ).model_dump(),
        )
    finally:
        reset_progress_context(progress_token)

    errors = final_state.get("errors", [])
    fatal_error = any(not error.recoverable for error in errors)

    return PlanGenerateResponse(
        success=not fatal_error,
        session_id=final_state["session_id"],
        intent=final_state.get("intent"),
        parsed_request=final_state.get("parsed_request"),
        candidate_pool=final_state.get("candidate_pool", []),
        selected_hotel=final_state.get("selected_hotel"),
        itinerary_days=final_state.get("itinerary_days", []),
        clarification_question=final_state.get("clarification_question"),
        final_plan=final_state.get("final_plan"),
        final_response_text=final_state.get("final_response_text"),
        trace_logs=final_state.get("trace_logs", []),
        warnings=final_state.get("warnings", []),
        errors=errors,
        optimization_exhausted=final_state.get("optimization_exhausted", False),
    )
