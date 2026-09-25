"""Regression tests for ViVu AI Phase 1-4 v2.2 hardening."""
from __future__ import annotations

import sys
import types
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# Minimal stubs for modules intentionally outside the Phase 1-4 core bundle.
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

# Lightweight LangGraph stub so graph.nodes can be imported without installing LangGraph.
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
from app.agents.destination import DestinationAgent
from app.agents.itinerary import ItineraryAgent
from app.agents.supervisor import SupervisorAgent
from app.graph.nodes import itinerary_node
from app.models.state import TravelPlanState
from app.schemas.budget import OptimizationContext, OptimizationTarget
from app.schemas.common import Provenance
from app.schemas.itinerary import DayItinerary, RouteSegment, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.cost import calculate_budget
from app.tools.places import GooglePlacesProvider
from app.tools.routes import HaversineRouteProvider
from app.tools.validation import validate_budget_breakdown


def place(
    pid: str,
    name: str,
    category: str,
    lat: float,
    lon: float,
    *,
    cost: int | None = None,
    ticket: int | None = None,
    room: int | None = None,
    score: float = 0.8,
    opening: dict | None = None,
    current_opening: dict | None = None,
    business_status: str = "OPERATIONAL",
    estimated: bool = False,
    interests: list[str] | None = None,
) -> PlaceCandidate:
    return PlaceCandidate(
        place_id=pid,
        name=name,
        category=category,  # type: ignore[arg-type]
        interests=interests or [],
        rating=4.5,
        user_ratings_total=500,
        address="Da Lat, Lam Dong, Vietnam",
        latitude=lat,
        longitude=lon,
        opening_hours=opening,
        current_opening_hours=current_opening,
        business_status=business_status,  # type: ignore[arg-type]
        estimated_cost_per_person=cost,
        ticket_price=ticket,
        estimated_room_cost_per_night=room,
        provenance=Provenance(
            source="INTERNAL_ESTIMATE" if estimated else "INTERNAL_DATABASE",
            source_id=pid,
            is_estimate=estimated,
        ),
        score=score,
    )


def req(
    days: int = 2,
    budget: int = 10_000_000,
    *,
    start: date | None = date(2026, 9, 25),
    pace: str = "MODERATE",
) -> ParsedUserRequest:
    return ParsedUserRequest(
        destination_city="Đà Lạt",
        duration_days=days,
        num_travelers=2,
        total_budget=budget,
        interests=["CAFE", "NATURE"],
        travel_style="BALANCED",
        travel_pace=pace,  # type: ignore[arg-type]
        start_date=start,
    )


def test_cafe_meal_not_double_counted() -> None:
    agent = BudgetAgent()
    r = req(days=1)
    cafe = place("c1", "Cafe Lunch", "CAFE", 11.94, 108.44, cost=60_000)
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:00",
                end_time="13:30",
                place_id="c1",
                place_name="Cafe Lunch",
                estimated_cost=120_000,
            )
        ],
        daily_cost=120_000,
    )
    cost = agent._collect_food_cost([day], [cafe], r)
    # Explicit lunch = 120k; missing dinner = 175k/person * 2 = 350k.
    assert cost == 470_000, cost


def test_opening_hours_weekday_is_strict() -> None:
    monday_only = place(
        "p1",
        "Monday Only",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 1, "hour": 8, "minute": 0},
                    "close": {"day": 1, "hour": 17, "minute": 0},
                }
            ]
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        monday_only, "10:00", "12:00", date(2026, 9, 25)
    )
    assert ItineraryAgent._opening_hours_compatible(
        monday_only, "10:00", "12:00", date(2026, 9, 21)
    )


def test_opening_hours_24_7_regular() -> None:
    place_24 = place(
        "24",
        "24/7",
        "ATTRACTION",
        11.94,
        108.44,
        opening={"periods": [{"open": {"day": 0, "hour": 0, "minute": 0}}]},
    )
    assert ItineraryAgent._opening_hours_compatible(
        place_24, "10:00", "12:00", date(2026, 9, 25)
    )


def test_opening_hours_special_day_override_closed() -> None:
    target = date(2026, 9, 25)  # Friday
    place_with_holiday_closure = place(
        "sp1",
        "Holiday Closure",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 8, "minute": 0},
                    "close": {"day": 5, "hour": 17, "minute": 0},
                }
            ]
        },
        current_opening={
            "specialDays": [{"date": {"year": 2026, "month": 9, "day": 25}}],
            "periods": [],
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        place_with_holiday_closure, "10:00", "12:00", target
    )


def test_opening_hours_special_day_override_open() -> None:
    target = date(2026, 9, 25)
    special = place(
        "sp2",
        "Holiday Adjusted",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 8, "minute": 0},
                    "close": {"day": 5, "hour": 17, "minute": 0},
                }
            ]
        },
        current_opening={
            "specialDays": [{"date": "2026-09-25"}],
            "periods": [
                {
                    "open": {"day": 5, "hour": 10, "minute": 0},
                    "close": {"day": 5, "hour": 14, "minute": 0},
                }
            ],
        },
    )
    assert ItineraryAgent._opening_hours_compatible(
        special, "11:00", "12:00", target
    )
    assert not ItineraryAgent._opening_hours_compatible(
        special, "09:00", "12:00", target
    )


def test_opening_hours_previous_day_does_not_leak() -> None:
    monday_only = place(
        "weekday",
        "Monday Only",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 1, "hour": 8, "minute": 0},
                    "close": {"day": 1, "hour": 17, "minute": 0},
                }
            ]
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        monday_only, "10:00", "12:00", date(2026, 9, 22)
    )


def test_opening_hours_overnight() -> None:
    night = place(
        "n1",
        "Night Place",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 18, "minute": 0},
                    "close": {"day": 6, "hour": 2, "minute": 0},
                }
            ]
        },
    )
    assert ItineraryAgent._opening_hours_compatible(
        night, "23:00", "23:30", date(2026, 9, 25)
    )
    assert ItineraryAgent._opening_hours_compatible(
        night, "01:00", "01:30", date(2026, 9, 26)
    )
    assert not ItineraryAgent._opening_hours_compatible(
        night, "10:00", "11:00", date(2026, 9, 26)
    )


def test_full_slot_must_fit_opening_hours() -> None:
    place_open_until_11 = place(
        "hrs",
        "Short Hours",
        "ATTRACTION",
        11.94,
        108.44,
        opening={
            "periods": [
                {
                    "open": {"day": 5, "hour": 8, "minute": 0},
                    "close": {"day": 5, "hour": 11, "minute": 0},
                }
            ]
        },
    )
    assert not ItineraryAgent._opening_hours_compatible(
        place_open_until_11, "10:00", "12:00", date(2026, 9, 25)
    )
    assert ItineraryAgent._opening_hours_compatible(
        place_open_until_11, "09:00", "10:00", date(2026, 9, 25)
    )


def test_seed_cannot_break_slot_category() -> None:
    r = req(days=1)
    hotel = place("h", "Hotel", "HOTEL", 11.94, 108.44, room=500_000)
    restaurant = place(
        "r", "Only Restaurant", "RESTAURANT", 11.941, 108.441, cost=120_000
    )
    agent = ItineraryAgent(HaversineRouteProvider())
    days, _, warnings = agent.process(r, [hotel, restaurant], hotel)
    assert not warnings, warnings
    assert len(days) == 1
    assert len(days[0].time_slots) == 1
    assert days[0].time_slots[0].slot_type == "LUNCH"
    assert days[0].time_slots[0].place_id == "r"


def test_future_opening_is_not_schedulable() -> None:
    future = place(
        "future",
        "Future Place",
        "ATTRACTION",
        11.94,
        108.44,
        ticket=50_000,
        business_status="FUTURE_OPENING",
    )
    agent = ItineraryAgent(HaversineRouteProvider())
    days, _, _ = agent.process(req(days=1), [future], None)
    assert days == []


def test_destination_rejects_future_opening_candidate() -> None:
    future = place(
        "future_h",
        "Future Hotel",
        "HOTEL",
        11.94,
        108.44,
        room=500_000,
        business_status="FUTURE_OPENING",
    )
    provider = type(
        "Provider",
        (),
        {"search_places": lambda self, city, categories=None: [future]},
    )()
    result = DestinationAgent(provider=provider).process(req(days=1))
    assert result == []


def test_travel_gap_guard_uses_time_not_only_distance() -> None:
    anchor = place("a", "Anchor", "ATTRACTION", 11.94, 108.44)
    candidate = place("b", "Far", "ATTRACTION", 11.94, 108.70)
    assert not ItineraryAgent._candidate_travel_gap_is_feasible(
        anchor, candidate, "12:00", "12:15"
    )


def test_feasible_cheaper_replacement_is_found_for_actual_slot() -> None:
    from app.graph.nodes import _find_reasonable_cheaper_replacement

    r = req(days=1)
    current = place(
        "r1", "Current Restaurant", "RESTAURANT", 11.94, 108.44,
        cost=300_000, score=0.8,
    )
    cheaper = place(
        "r2", "Cheaper Restaurant", "RESTAURANT", 11.941, 108.441,
        cost=200_000, score=0.8,
    )
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r1",
                place_name="Current Restaurant",
                estimated_cost=600_000,
            )
        ],
        daily_cost=600_000,
    )
    target = OptimizationTarget(
        target_category="RESTAURANT",
        day_number=1,
        slot_index=0,
        current_place_id="r1",
        current_cost=600_000,
        target_reduction=200_000,
        reason="HIGH_COST_FOOD",
    )
    result = _find_reasonable_cheaper_replacement(
        current=current,
        candidate_pool=[current, cheaper],
        request=r,
        itinerary_days=[day],
        target=target,
        selected_hotel=None,
        reserved_replacements=set(),
    )
    assert result is not None
    assert result.place_id == "r2"


def test_replacement_cannot_reuse_place_from_another_day() -> None:
    from app.graph.nodes import _find_reasonable_cheaper_replacement

    r = req(days=2)
    current = place(
        "r1", "Current Restaurant", "RESTAURANT", 11.94, 108.44,
        cost=300_000, score=0.8,
    )
    already_used_elsewhere = place(
        "r2", "Used Restaurant", "RESTAURANT", 11.941, 108.441,
        cost=100_000, score=0.8,
    )
    day1 = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r1",
                place_name="Current Restaurant",
                estimated_cost=600_000,
            )
        ],
        daily_cost=600_000,
    )
    day2 = DayItinerary(
        day_number=2,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r2",
                place_name="Used Restaurant",
                estimated_cost=200_000,
            )
        ],
        daily_cost=200_000,
    )
    target = OptimizationTarget(
        target_category="RESTAURANT",
        day_number=1,
        slot_index=0,
        current_place_id="r1",
        current_cost=600_000,
        target_reduction=400_000,
        reason="HIGH_COST_FOOD",
    )
    assert _find_reasonable_cheaper_replacement(
        current=current,
        candidate_pool=[current, already_used_elsewhere],
        request=r,
        itinerary_days=[day1, day2],
        target=target,
        selected_hotel=None,
        reserved_replacements=set(),
    ) is None


def test_num_nights_fails_fast() -> None:
    try:
        calculate_budget(
            num_travelers=2, num_days=1, num_nights=1, max_budget=1_000_000
        )
    except ValueError:
        return
    raise AssertionError("num_nights > num_days-1 must fail fast")


def test_restaurant_is_not_blindly_deleted() -> None:
    r = req(days=1, budget=1_000_000)
    hotel = place("h", "Hotel", "HOTEL", 11.94, 108.44, room=500_000)
    restaurant = place(
        "r1", "Only Restaurant", "RESTAURANT", 11.941, 108.441, cost=300_000
    )
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:15",
                end_time="13:30",
                place_id="r1",
                place_name="Only Restaurant",
                estimated_cost=600_000,
            )
        ],
        daily_cost=600_000,
    )
    state: TravelPlanState = {
        "session_id": "s",
        "user_id": None,
        "raw_prompt": "",
        "user_preferences": None,
        "intent": "CREATE_PLAN",
        "clarification_question": None,
        "parsed_request": r,
        "candidate_pool": [hotel, restaurant],
        "selected_place_ids": ["h", "r1"],
        "selected_hotel": hotel,
        "itinerary_days": [day],
        "budget_breakdown": None,
        "optimization_targets": [
            OptimizationTarget(
                target_category="RESTAURANT",
                day_number=1,
                slot_index=0,
                current_place_id="r1",
                current_cost=600_000,
                target_reduction=500_000,
                reason="HIGH_COST_FOOD",
            )
        ],
        "optimization_context": OptimizationContext(
            previous_total=2_000_000,
            target_reduction_total=500_000,
            affected_days=[1],
            iteration_summary="OVER",
        ),
        "loop_count": 1,
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
    result = itinerary_node(state)
    assert result["itinerary_days"] or result["selected_place_ids"]
    assert not any(
        error.error_code == "REPLAN_EMPTY_CANDIDATE_POOL"
        for error in result.get("errors", [])
    )


def test_budget_invariants() -> None:
    breakdown = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        ticket_cost=300_000,
        transport_cost=200_000,
        explicit_hotel_cost=1_400_000,
        explicit_food_cost=1_400_000,
    )
    assert not validate_budget_breakdown(breakdown)


def test_budget_data_quality_warnings() -> None:
    agent = BudgetAgent()
    r = req(days=2)
    restaurant = place(
        "food", "Unknown Restaurant", "RESTAURANT", 11.94, 108.44, cost=None
    )
    attraction = place(
        "attr", "Unknown Ticket", "ATTRACTION", 11.941, 108.441, ticket=None
    )
    hotel = place(
        "hotel", "Estimated Hotel", "HOTEL", 11.942, 108.442,
        room=900_000, estimated=True,
    )
    route = RouteSegment(
        from_place_id="hotel",
        to_place_id="food",
        distance_km=4.0,
        duration_minutes=10,
        provenance=Provenance(
            source="INTERNAL_ESTIMATE", source_id="hotel->food", is_estimate=True
        ),
    )
    day = DayItinerary(
        day_number=1,
        time_slots=[
            TimeSlot(
                slot_type="LUNCH",
                start_time="12:00",
                end_time="13:30",
                place_id="food",
                place_name="Unknown Restaurant",
                estimated_cost=0,
            ),
            TimeSlot(
                slot_type="AFTERNOON",
                start_time="14:00",
                end_time="16:00",
                place_id="attr",
                place_name="Unknown Ticket",
                estimated_cost=0,
            ),
        ],
        route_segments=[route],
    )
    warnings = agent.collect_data_quality_warnings(
        request=r,
        itinerary_days=[day],
        candidate_pool=[restaurant, attraction, hotel],
        selected_hotel=hotel,
    )
    codes = {item.split(":", 1)[0] for item in warnings}
    assert "FOOD_FALLBACK_USED" in codes
    assert "UNKNOWN_TICKET_PRICE" in codes
    assert "HOTEL_COST_ESTIMATE_USED" in codes
    assert "ROUTE_DISTANCE_ESTIMATE_USED" in codes


def test_fast_candidate_capacity_scales_with_duration() -> None:
    class CapacityProvider:
        def __init__(self):
            self.calls: list[tuple[str, int]] = []

        def search_places_for_capacity(self, city, categories=None, max_results=None):
            category = categories[0]
            self.calls.append((category, max_results))
            result = []
            for i in range(max_results):
                result.append(
                    place(
                        f"{category.lower()}-{i}",
                        f"{category} {i}",
                        category,
                        11.94 + (i % 5) * 0.0001,
                        108.44 + (i % 5) * 0.0001,
                    )
                )
            return result

    provider = CapacityProvider()
    agent = DestinationAgent(provider=provider)
    result = agent._fetch_by_category(req(days=14, pace="FAST"))
    capacity_by_category = dict(provider.calls)

    assert capacity_by_category["ATTRACTION"] >= 42
    assert capacity_by_category["CAFE"] >= 21
    assert capacity_by_category["RESTAURANT"] >= 42
    assert len(result) >= 42 + 21 + 42


def test_google_places_pagination_respects_capacity() -> None:
    class Response:
        def __init__(self, payload):
            self.status_code = 200
            self._payload = payload

        def json(self):
            return self._payload

    def raw_place(index: int) -> dict:
        return {
            "id": f"gp-{index}",
            "displayName": {"text": f"GP {index}"},
            "formattedAddress": "Da Lat, Lam Dong, Vietnam",
            "location": {"latitude": 11.94 + index * 0.00001, "longitude": 108.44},
            "rating": 4.5,
            "userRatingCount": 100,
            "primaryType": "restaurant",
            "businessStatus": "OPERATIONAL",
        }

    pages = [
        Response({"places": [raw_place(i) for i in range(20)], "nextPageToken": "p2"}),
        Response({"places": [raw_place(i) for i in range(20, 40)], "nextPageToken": "p3"}),
        Response({"places": [raw_place(i) for i in range(40, 50)]}),
    ]

    class FakeClient:
        def __init__(self):
            self.calls = []

        def post(self, url, headers=None, json=None, timeout=None):
            self.calls.append(json)
            return pages[len(self.calls) - 1]

    fake = FakeClient()
    provider = GooglePlacesProvider(
        fallback_provider=type(
            "Fallback", (), {"search_places": lambda self, city, categories=None: []}
        )(),
        http_client=fake,  # type: ignore[arg-type]
    )
    provider.api_key = "test"
    result = provider.search_places_for_capacity(
        "Đà Lạt", ["RESTAURANT"], max_results=42
    )
    assert len(result) == 42
    assert len(fake.calls) == 3
    assert fake.calls[1]["pageToken"] == "p2"
    assert fake.calls[2]["pageToken"] == "p3"


def test_supervisor_negation_blocks_preferences_but_allows_positive_clause() -> None:
    class FakeSemantic:
        available = True

        def parse(self, raw_prompt):
            return {
                "interests": ["CAFE", "NATURE"],
                "travel_style": "LUXURY",
                "travel_pace": "FAST",
                "hotel_preference": "Luxury Resort",
            }

    agent = SupervisorAgent(semantic_parser=FakeSemantic())
    result = agent.parse(
        "Đà Lạt 3 ngày 2 người ngân sách 5 triệu, không thích cà phê "
        "nhưng thích thiên nhiên, không thích sang chảnh, không muốn nhanh",
        user_preferences={
            "interests": ["CAFE"],
            "travel_style": "BUDGET",
            "travel_pace": "FAST",
            "hotel_preference": "Budget Hotel",
        },
    )
    assert "CAFE" not in result.interests
    assert "NATURE" in result.interests
    assert result.travel_style == "BUDGET"
    assert result.travel_pace == "MODERATE"
    assert result.hotel_preference == "Luxury Resort"
    assert result.start_date is None


def test_supervisor_start_date_and_negated_hotel() -> None:
    agent = SupervisorAgent(
        semantic_parser=type(
            "FakeSemantic",
            (),
            {
                "available": True,
                "parse": lambda self, raw: {
                    "interests": [],
                    "travel_style": None,
                    "travel_pace": None,
                    "hotel_preference": "Resort ABC",
                },
            },
        )()
    )
    result = agent.parse(
        "Đà Lạt 2 ngày 2 người 4 triệu bắt đầu 25/09/2026, không muốn ở resort",
    )
    assert result.start_date == date(2026, 9, 25)
    assert result.hotel_preference is None


def main() -> None:
    tests = [
        test_cafe_meal_not_double_counted,
        test_opening_hours_weekday_is_strict,
        test_opening_hours_24_7_regular,
        test_opening_hours_special_day_override_closed,
        test_opening_hours_special_day_override_open,
        test_opening_hours_previous_day_does_not_leak,
        test_opening_hours_overnight,
        test_full_slot_must_fit_opening_hours,
        test_seed_cannot_break_slot_category,
        test_future_opening_is_not_schedulable,
        test_destination_rejects_future_opening_candidate,
        test_travel_gap_guard_uses_time_not_only_distance,
        test_feasible_cheaper_replacement_is_found_for_actual_slot,
        test_replacement_cannot_reuse_place_from_another_day,
        test_num_nights_fails_fast,
        test_restaurant_is_not_blindly_deleted,
        test_budget_invariants,
        test_budget_data_quality_warnings,
        test_fast_candidate_capacity_scales_with_duration,
        test_google_places_pagination_respects_capacity,
        test_supervisor_negation_blocks_preferences_but_allows_positive_clause,
        test_supervisor_start_date_and_negated_hotel,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"ALL REGRESSION TESTS PASSED ({len(tests)}/{len(tests)})")


if __name__ == "__main__":
    main()
