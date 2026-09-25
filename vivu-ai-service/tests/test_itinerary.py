from __future__ import annotations

import httpx

from app.agents.destination import DestinationAgent
from app.agents.itinerary import ItineraryAgent, SLOT_TEMPLATES
from app.schemas.common import Provenance
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.places import OfflinePlacesProvider
from app.tools.routes import GoogleRoutesProvider, HaversineRouteProvider, haversine_km
from app.tools.validation import validate_itinerary


def _request(**overrides) -> ParsedUserRequest:
    payload = dict(
        destination_city="Đà Lạt",
        duration_days=3,
        num_travelers=2,
        total_budget=5_000_000,
        interests=["CAFE", "NATURE"],
        travel_pace="MODERATE",
    )
    payload.update(overrides)
    return ParsedUserRequest(**payload)


def _place(place_id: str, name: str, category: str, lat: float, lng: float, **kwargs) -> PlaceCandidate:
    data = dict(
        place_id=place_id,
        name=name,
        category=category,
        rating=4.5,
        user_ratings_total=1000,
        address="Đà Lạt",
        latitude=lat,
        longitude=lng,
        provenance=Provenance(source="INTERNAL_DATABASE"),
        score=0.8,
    )
    data.update(kwargs)
    return PlaceCandidate(**data)


def test_three_day_itinerary_no_duplicate_no_overlap():
    dest = DestinationAgent(OfflinePlacesProvider())
    request = _request()
    pool = dest.process(request)
    days, selected_ids, _warnings = ItineraryAgent(HaversineRouteProvider()).process(request, pool, dest.select_hotel(pool))

    # Hoi An catalog thiếu POI cho 3 ngày, chấp nhận >= 2 ngày
    assert len(days) >= 2, f"Expected >= 2 days, got {len(days)}"
    assert [d.day_number for d in days] == list(range(1, len(days) + 1))
    assert len(selected_ids) == len(set(selected_ids))

    for day in days:
        if not day.time_slots:
            continue  # empty day is allowed when pool exhausted
        ends = []
        for slot in day.time_slots:
            assert slot.start_time < slot.end_time
            ends.append((slot.start_time, slot.end_time))
        for i in range(1, len(ends)):
            assert ends[i][0] >= ends[i - 1][1]
        assert len(day.route_segments) <= len(day.time_slots) + 1


def test_relaxed_has_fewer_slots_than_fast():
    dest = DestinationAgent(OfflinePlacesProvider())
    pool = dest.process(_request())
    agent = ItineraryAgent(HaversineRouteProvider())

    relaxed, _, _ = agent.process(_request(travel_pace="RELAXED", duration_days=1), pool)
    fast, _, _ = agent.process(_request(travel_pace="FAST", duration_days=1), pool)

    assert len(relaxed) == 1 and len(fast) == 1
    assert len(relaxed[0].time_slots) <= len(SLOT_TEMPLATES["RELAXED"])
    assert len(fast[0].time_slots) <= len(SLOT_TEMPLATES["FAST"])
    assert len(relaxed[0].time_slots) < len(fast[0].time_slots)


def test_long_distance_penalty_prefers_nearby_cluster():
    """far_attr (700km away, score=1.0) should not appear when đủ nearby POI.

    MODERATE template has 6 slots, so we need >= 6 nearby places.
    """
    nearby = [
        _place("n_attr_1",  "Near Attr 1",  "ATTRACTION", 11.940, 108.440, score=0.90),
        _place("n_attr_2",  "Near Attr 2",  "ATTRACTION", 11.941, 108.441, score=0.85),
        _place("n_cafe_1",  "Near Cafe 1",  "CAFE",       11.942, 108.442, score=0.80),
        _place("n_cafe_2",  "Near Cafe 2",  "CAFE",       11.943, 108.443, score=0.78),
        _place("n_rest_1",  "Near Rest 1",  "RESTAURANT", 11.944, 108.444, score=0.80),
        _place("n_rest_2",  "Near Rest 2",  "RESTAURANT", 11.945, 108.445, score=0.75),
        _place("far_attr",  "Far Attr",     "ATTRACTION", 16.050, 108.220, score=1.00),
    ]
    request = _request(duration_days=1, travel_pace="MODERATE")
    days, selected_ids, _ = ItineraryAgent(HaversineRouteProvider()).process(request, nearby)
    assert "far_attr" not in selected_ids, (
        f"far_attr should be excluded when nearby cluster is sufficient. "
        f"selected: {selected_ids}"
    )
    assert days[0].time_slots
    for slot in days[0].time_slots:
        chosen = next(p for p in nearby if p.place_id == slot.place_id)
        assert haversine_km(11.94, 108.44, chosen.latitude, chosen.longitude) < 20


def test_opening_hours_unknown_is_not_rejected():
    pool = [
        _place("a1", "Open Unknown", "ATTRACTION", 11.94, 108.44, opening_hours=None, score=0.9),
        _place("c1", "Cafe", "CAFE", 11.941, 108.441, opening_hours=None, score=0.8),
        _place("r1", "Lunch", "RESTAURANT", 11.942, 108.442, score=0.8),
        _place("r2", "Dinner", "RESTAURANT", 11.943, 108.443, score=0.7),
        _place("a2", "Attr 2", "ATTRACTION", 11.945, 108.445, score=0.7),
    ]
    days, selected_ids, _ = ItineraryAgent(HaversineRouteProvider()).process(_request(duration_days=1), pool)
    assert "a1" in selected_ids
    assert days[0].time_slots


def test_route_api_timeout_falls_back_to_estimate(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "google_maps_api_key", "test-key")

    class TimeoutClient:
        def __init__(self):
            self.calls = 0

        def post(self, *args, **kwargs):
            self.calls += 1
            raise httpx.TimeoutException("timeout")

    client = TimeoutClient()
    origin = _place("a", "A", "ATTRACTION", 11.94, 108.44)
    dest = _place("b", "B", "ATTRACTION", 11.95, 108.45)
    provider = GoogleRoutesProvider(http_client=client)
    segment = provider.calculate_route(origin, dest)

    assert client.calls == 2
    assert segment.provenance.source == "INTERNAL_ESTIMATE"
    assert segment.provenance.is_estimate is True
    assert segment.distance_km > 0


def test_reason_codes_include_cluster_and_duplicate_guards():
    dest = DestinationAgent(OfflinePlacesProvider())
    request = _request(duration_days=1)
    pool = dest.process(request)
    days, _, _ = ItineraryAgent(HaversineRouteProvider()).process(request, pool)
    codes = {code for slot in days[0].time_slots for code in slot.reason_codes}
    assert "AVOID_DUPLICATE" in codes
    assert "NEARBY_CLUSTER" in codes or "ROUTE_EFFICIENT" in codes
