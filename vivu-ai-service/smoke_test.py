"""End-to-end-ish deterministic Phase 3/4 smoke test using local stubs."""
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

from app.agents.budget import BudgetAgent
from app.agents.itinerary import ItineraryAgent
from app.agents.supervisor import SupervisorAgent
from app.schemas.common import Provenance
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.routes import HaversineRouteProvider
from app.tools.validation import validate_budget_breakdown


def place(pid, name, cat, lat, lon, cost=None, ticket=None, room=None, interests=None):
    return PlaceCandidate(
        place_id=pid,
        name=name,
        category=cat,
        interests=interests or [],
        rating=4.5,
        user_ratings_total=500,
        address="Da Lat, Lam Dong, Vietnam",
        latitude=lat,
        longitude=lon,
        opening_hours=None,
        current_opening_hours=None,
        business_status="OPERATIONAL",
        estimated_cost_per_person=cost,
        ticket_price=ticket,
        estimated_room_cost_per_night=room,
        provenance=Provenance(source="INTERNAL_DATABASE", source_id=pid),
    )


supervisor = SupervisorAgent()
parsed = supervisor.parse(
    "Đà Lạt 3 ngày 2 đêm, 2 người, ngân sách 5 triệu, "
    "thích cà phê và thiên nhiên",
    {"travel_style": "BUDGET"},
)
assert parsed.intent == "CREATE_PLAN"
assert (
    parsed.destination_city,
    parsed.duration_days,
    parsed.num_travelers,
    parsed.total_budget,
) == ("Đà Lạt", 3, 2, 5_000_000)
assert set(parsed.interests) >= {"CAFE", "NATURE"}
assert parsed.travel_style == "BUDGET"

req = ParsedUserRequest(
    destination_city="Đà Lạt",
    duration_days=3,
    num_travelers=2,
    total_budget=5_000_000,
    interests=["CAFE", "NATURE"],
    travel_style="BALANCED",
    travel_pace="MODERATE",
    start_date=date(2026, 9, 25),
)

hotel = place("h1", "Hotel", "HOTEL", 11.94, 108.44, room=500_000)
places = [hotel]

for i, (lat, lon) in enumerate(
    [
        (11.940, 108.440),
        (11.941, 108.441),
        (11.942, 108.442),
        (11.943, 108.443),
        (11.944, 108.444),
        (11.945, 108.445),
    ]
):
    places.append(
        place(
            f"a{i}", f"Attraction {i}", "ATTRACTION", lat, lon, ticket=50_000
        )
    )

for i, (lat, lon) in enumerate(
    [(11.946, 108.446), (11.947, 108.447), (11.948, 108.448)]
):
    places.append(
        place(
            f"c{i}", f"Cafe {i}", "CAFE", lat, lon, cost=60_000, interests=["CAFE"]
        )
    )

for i, (lat, lon) in enumerate(
    [
        (11.949, 108.449),
        (11.950, 108.450),
        (11.951, 108.451),
        (11.952, 108.452),
        (11.953, 108.453),
        (11.954, 108.454),
    ]
):
    places.append(
        place(
            f"r{i}", f"Restaurant {i}", "RESTAURANT", lat, lon,
            cost=120_000, interests=["FOOD"]
        )
    )

itinerary_agent = ItineraryAgent(HaversineRouteProvider())
days, ids, warnings = itinerary_agent.process(req, places, hotel)
assert len(days) == 3, (len(days), warnings)
assert len(ids) == len(set(ids))
for day in days:
    assert len(day.time_slots) <= 5
    assert day.route_segments
    assert day.route_segments[0].from_place_id == "h1"
    assert day.route_segments[-1].to_place_id == "h1"

budget_agent = BudgetAgent()
breakdown, targets, context = budget_agent.process(req, days, places, hotel)
assert not validate_budget_breakdown(breakdown), validate_budget_breakdown(breakdown)
assert breakdown.food_cost > 0
assert breakdown.transport_cost > 0

print("SMOKE TEST OK")
print("days=", len(days), "slots=", [len(d.time_slots) for d in days])
print("budget=", breakdown.total_calculated, breakdown.status)
print("targets=", len(targets))
print("warning_count=", len(warnings))
