"""Optimization-loop smoke tests for no-progress and best-snapshot restoration."""
from __future__ import annotations

import sys
import types
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

config_mod = types.ModuleType("app.core.config")


class Settings:
    google_maps_api_key = None
    google_routes_timeout_seconds = 2.0
    google_places_timeout_seconds = 2.0
    gemini_api_key = None
    gemini_model = "gemini-2.5-flash"


config_mod.settings = Settings()
sys.modules["app.core.config"] = config_mod

offline_mod = types.ModuleType("app.data.offline_places")
offline_mod.OFFLINE_PLACES_DATA = {}
sys.modules["app.data.offline_places"] = offline_mod

# Minimal LangGraph stub for importing app.graph.nodes.
langgraph_mod = types.ModuleType("langgraph")
graph_mod = types.ModuleType("langgraph.graph")


class _DummyStateGraph:
    def __init__(self, *_args, **_kwargs):
        pass

    def add_node(self, *_args, **_kwargs):
        pass

    def add_edge(self, *_args, **_kwargs):
        pass

    def add_conditional_edges(self, *_args, **_kwargs):
        pass

    def set_entry_point(self, *_args, **_kwargs):
        pass

    def compile(self):
        return object()


graph_mod.StateGraph = _DummyStateGraph
graph_mod.END = "__END__"
sys.modules["langgraph"] = langgraph_mod
sys.modules["langgraph.graph"] = graph_mod

from app.agents.budget import BudgetAgent
from app.graph.nodes import budget_node, exhausted_node
from app.schemas.budget import OptimizationContext
from app.schemas.common import Provenance
from app.schemas.itinerary import DayItinerary, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest

req = ParsedUserRequest(
    destination_city="Đà Lạt",
    duration_days=2,
    num_travelers=2,
    total_budget=1_000_000,
    travel_style="BUDGET",
    travel_pace="MODERATE",
    start_date=date(2026, 9, 25),
)

hotel = PlaceCandidate(
    place_id="h",
    name="H",
    category="HOTEL",
    rating=4.5,
    user_ratings_total=100,
    address="Da Lat, Lam Dong, Vietnam",
    latitude=11.94,
    longitude=108.44,
    estimated_room_cost_per_night=800_000,
    business_status="OPERATIONAL",
    provenance=Provenance(source="INTERNAL_DATABASE"),
)
restaurant = PlaceCandidate(
    place_id="r",
    name="R",
    category="RESTAURANT",
    rating=4.5,
    user_ratings_total=100,
    address="Da Lat, Lam Dong, Vietnam",
    latitude=11.941,
    longitude=108.441,
    estimated_cost_per_person=200_000,
    business_status="OPERATIONAL",
    provenance=Provenance(source="INTERNAL_DATABASE"),
)

day1 = DayItinerary(
    day_number=1,
    time_slots=[
        TimeSlot(
            slot_type="LUNCH",
            start_time="12:00",
            end_time="13:30",
            place_id="r",
            place_name="R",
            estimated_cost=400_000,
        )
    ],
    daily_cost=400_000,
)
day2 = DayItinerary(
    day_number=2,
    time_slots=[
        TimeSlot(
            slot_type="LUNCH",
            start_time="12:00",
            end_time="13:30",
            place_id="r",
            place_name="R",
            estimated_cost=400_000,
        )
    ],
    daily_cost=400_000,
)

state = {
    "session_id": "s",
    "user_id": None,
    "raw_prompt": "",
    "user_preferences": None,
    "intent": "CREATE_PLAN",
    "clarification_question": None,
    "parsed_request": req,
    "candidate_pool": [hotel, restaurant],
    "selected_place_ids": ["h", "r"],
    "selected_hotel": hotel,
    "itinerary_days": [day1, day2],
    "budget_breakdown": None,
    "optimization_targets": [],
    "optimization_context": None,
    "loop_count": 0,
    "max_loops": 3,
    "optimization_exhausted": False,
    "optimization_stalled": False,
    "termination_reason": None,
    "best_itinerary_days": None,
    "best_budget_breakdown": None,
    "best_selected_hotel": None,
    "best_selected_place_ids": [],
    "best_over_amount": 10**18,
    "trace_logs": [],
    "warnings": [],
    "errors": [],
    "final_plan": None,
    "final_response_text": None,
}

first = budget_node(state)
assert first["budget_breakdown"] is not None
assert first["best_selected_hotel"].place_id == "h"
print(
    "initial",
    first["budget_breakdown"].total_calculated,
    first["budget_breakdown"].status,
    "targets",
    len(first["optimization_targets"]),
)

state.update(first)
state["loop_count"] = 1
state["optimization_context"] = OptimizationContext(
    previous_total=first["budget_breakdown"].total_calculated,
    target_reduction_total=first["budget_breakdown"].over_amount,
    affected_days=[1, 2],
    iteration_summary="OVER",
)
second = budget_node(state)
assert second["optimization_stalled"] is True
assert second["termination_reason"] == "NO_PROGRESS"
print("no-progress guard ok")

exhausted = exhausted_node({**state, **second})
assert exhausted["selected_hotel"].place_id == "h"
assert exhausted["termination_reason"] == "NO_PROGRESS"
print("best snapshot restore ok")

# Sanity check that the standalone BudgetAgent still validates its own invariants.
budget_agent = BudgetAgent()
breakdown, _, _ = budget_agent.process(req, [day1, day2], [hotel, restaurant], hotel)
assert breakdown.total_calculated >= 0
print("optimization smoke test OK")
