import pytest
from pydantic import ValidationError
from app.schemas.common import Provenance, AgentError, AgentTraceLog, utc_now_iso
from app.schemas.request import ParsedUserRequest
from app.schemas.place import PlaceCandidate
from app.schemas.itinerary import TimeSlot, RouteSegment, DayItinerary
from app.schemas.budget import BudgetBreakdown, OptimizationTarget, OptimizationContext
from app.schemas.travel_plan import FinalTripPlan
from app.models.state import TravelPlanState

def test_utc_now_iso():
    iso_str = utc_now_iso()
    assert isinstance(iso_str, str)
    assert "+00:00" in iso_str or "Z" in iso_str

def test_provenance_valid_and_invalid():
    prov = Provenance(source="INTERNAL_DATABASE", is_estimate=False)
    assert prov.source == "INTERNAL_DATABASE"
    assert prov.is_estimate is False
    assert prov.retrieved_at is not None

    with pytest.raises(ValidationError):
        Provenance(source="UNKNOWN_SOURCE")  # type: ignore

def test_parsed_user_request_validation():
    req = ParsedUserRequest(
        destination_city="Đà Lạt",
        duration_days=3,
        num_travelers=2,
        total_budget=5000000,
        interests=["CAFE", "NATURE"],
    )
    assert req.destination_city == "Đà Lạt"
    assert req.total_budget == 5000000
    assert isinstance(req.total_budget, int)
    assert req.travel_style == "BALANCED"
    assert req.travel_pace == "MODERATE"

    # Test invalid travel_style
    with pytest.raises(ValidationError):
        ParsedUserRequest(
            destination_city="Đà Lạt",
            duration_days=3,
            num_travelers=2,
            total_budget=5000000,
            travel_style="SUPER_LUXURY",  # type: ignore
        )

    # Test out of bounds days
    with pytest.raises(ValidationError):
        ParsedUserRequest(
            destination_city="Đà Lạt",
            duration_days=0,  # ge=1
            num_travelers=2,
            total_budget=5000000,
        )

def test_place_candidate():
    place = PlaceCandidate(
        place_id="ChIJ_012345",
        name="Cà phê Túi Mơ To",
        category="CAFE",
        interests=["CAFE", "VIEW"],
        rating=4.6,
        user_ratings_total=1200,
        address="Hẻm 31 Sào Nam, Đà Lạt",
        latitude=11.95,
        longitude=108.45,
        estimated_cost_per_person=60000,
        provenance=Provenance(source="GOOGLE_PLACES"),
    )
    assert place.name == "Cà phê Túi Mơ To"
    assert place.estimated_cost_per_person == 60000
    assert place.provenance.source == "GOOGLE_PLACES"

def test_itinerary_normalized_slot():
    slot = TimeSlot(
        slot_type="MORNING",
        start_time="08:30",
        end_time="10:00",
        place_id="ChIJ_012345",
        place_name="Cà phê Túi Mơ To",
        activity_description="Thưởng thức cafe sáng ngắm thung lũng",
        reason_codes=["PREFERENCE_MATCH", "HIGH_RATING"],
        estimated_cost=120000,
    )
    assert slot.place_id == "ChIJ_012345"
    assert slot.estimated_cost == 120000

    segment = RouteSegment(
        from_place_id="HOTEL_1",
        to_place_id="ChIJ_012345",
        distance_km=3.5,
        duration_minutes=12,
        provenance=Provenance(source="GOOGLE_ROUTES"),
    )

    day = DayItinerary(
        day_number=1,
        date_label="Ngày 1",
        time_slots=[slot],
        route_segments=[segment],
        total_travel_distance_km=3.5,
        total_travel_time_minutes=12,
        daily_cost=120000,
    )
    assert day.day_number == 1
    assert len(day.time_slots) == 1
    assert len(day.route_segments) == 1

def test_final_trip_plan_is_base_model():
    budget = BudgetBreakdown(
        hotel_cost=1800000,
        food_cost=1400000,
        ticket_cost=600000,
        transport_cost=700000,
        subtotal=4500000,
        misc_cost=450000,
        total_calculated=4950000,
        max_budget=5000000,
        remaining=50000,
        status="BUDGET_OK",
        over_amount=0,
    )
    plan = FinalTripPlan(
        destination_city="Đà Lạt",
        duration_days=3,
        num_travelers=2,
        total_budget=5000000,
        budget_breakdown=budget,
    )
    assert isinstance(plan, FinalTripPlan)
    json_data = plan.model_dump()
    assert json_data["destination_city"] == "Đà Lạt"
    assert json_data["budget_breakdown"]["status"] == "BUDGET_OK"
    assert json_data["budget_breakdown"]["total_calculated"] == 4950000
    assert json_data["budget_breakdown"]["remaining"] == 50000

def test_travel_plan_state_instantiation():
    state: TravelPlanState = {
        "session_id": "sess_123",
        "user_id": "user_456",
        "raw_prompt": "Đi Đà Lạt 3N2Đ",
        "user_preferences": None,
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
        "max_loops": 3,
        "optimization_exhausted": False,
        "trace_logs": [],
        "warnings": [],
        "errors": [],
        "final_plan": None,
        "final_response_text": None,
    }
    assert state["session_id"] == "sess_123"
    assert state["loop_count"] == 0
    assert state["max_loops"] == 3
    assert state["optimization_exhausted"] is False

def test_time_slot_regex_validation():
    # Đúng chuẩn HH:MM 24h
    slot = TimeSlot(
        slot_type="MORNING",
        start_time="08:30",
        end_time="10:00",
        place_id="P1",
        place_name="Cafe",
    )
    assert slot.start_time == "08:30"

    # Sai format (8 AM, 8h30, 25:00) -> Phải ném ValidationError
    with pytest.raises(ValidationError):
        TimeSlot(slot_type="MORNING", start_time="8 AM", end_time="10:00", place_id="P1", place_name="Cafe")

    with pytest.raises(ValidationError):
        TimeSlot(slot_type="MORNING", start_time="8h30", end_time="10:00", place_id="P1", place_name="Cafe")

    with pytest.raises(ValidationError):
        TimeSlot(slot_type="MORNING", start_time="25:00", end_time="10:00", place_id="P1", place_name="Cafe")

def test_place_coordinates_range_validation():
    # Tọa độ hợp lệ
    p = PlaceCandidate(
        place_id="P1",
        name="Place",
        category="ATTRACTION",
        latitude=11.94,
        longitude=108.43,
        provenance=Provenance(source="GOOGLE_PLACES"),
    )
    assert p.latitude == 11.94

    # Latitude vượt quá 90 độ
    with pytest.raises(ValidationError):
        PlaceCandidate(
            place_id="P1",
            name="Place",
            category="ATTRACTION",
            latitude=95.0,
            longitude=108.43,
            provenance=Provenance(source="GOOGLE_PLACES"),
        )

    # Longitude vượt quá 180 độ
    with pytest.raises(ValidationError):
        PlaceCandidate(
            place_id="P1",
            name="Place",
            category="ATTRACTION",
            latitude=11.94,
            longitude=-190.0,
            provenance=Provenance(source="GOOGLE_PLACES"),
        )
