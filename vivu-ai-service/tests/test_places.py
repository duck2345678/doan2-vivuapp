import pytest
from unittest.mock import MagicMock, patch
import httpx

from app.tools.places import (
    OfflinePlacesProvider,
    OSMPlacesProvider,
    get_default_places_provider,
    GooglePlacesProvider,
)
from app.schemas.place import PlaceCandidate, Provenance
from app.core.config import settings


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr("app.tools.places.time.sleep", lambda _: None)


@pytest.fixture
def mock_osm_provider():
    provider = OSMPlacesProvider()
    provider._http_client = MagicMock()
    return provider


@pytest.fixture
def mock_offline_provider(mock_osm_provider):
    return OfflinePlacesProvider(fallback_provider=mock_osm_provider)


# --- 1. Provider Contract ---

def test_offline_returns_candidates():
    provider = OfflinePlacesProvider()
    res = provider.search_places("Hồ Chí Minh")
    assert isinstance(res, list)


def test_offline_filters_categories():
    provider = OfflinePlacesProvider()
    res = provider.search_places("Hồ Chí Minh", categories=["CAFE"])
    for c in res:
        assert c.category == "CAFE"


def test_offline_capacity_limit():
    provider = OfflinePlacesProvider()
    res = provider.search_places_for_capacity("Hồ Chí Minh", max_results=2)
    assert len(res) <= 2


def test_unknown_city_fallback():
    mock_fallback = MagicMock()
    provider = OfflinePlacesProvider(fallback_provider=mock_fallback)
    provider.search_places("Thành phố Không Tồn Tại")
    mock_fallback.search_places_for_capacity.assert_called()


# --- 2. OSM Normalization ---

def test_osm_cafe_normalization(mock_osm_provider):
    el = {
        "type": "node",
        "id": 123,
        "lat": 10.0,
        "lon": 106.0,
        "tags": {"name": "Test Cafe", "amenity": "cafe"}
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c.name == "Test Cafe"
    assert c.category == "CAFE"
    assert "CAFE" in c.interests


def test_osm_restaurant_normalization(mock_osm_provider):
    el = {
        "type": "node",
        "id": 124,
        "lat": 10.0,
        "lon": 106.0,
        "tags": {"name": "Test Rest", "amenity": "restaurant"}
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c.category == "RESTAURANT"


def test_osm_hotel_normalization(mock_osm_provider):
    el = {
        "type": "way",
        "id": 125,
        "center": {"lat": 10.0, "lon": 106.0},
        "tags": {"name": "Test Hotel", "tourism": "hotel"}
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c.category == "HOTEL"


def test_osm_attraction_normalization(mock_osm_provider):
    el = {
        "type": "relation",
        "id": 126,
        "center": {"lat": 10.0, "lon": 106.0},
        "tags": {"name": "Test Museum", "tourism": "museum"}
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c.category == "ATTRACTION"
    assert "CULTURE" in c.interests


def test_osm_way_is_supported(mock_osm_provider):
    el = {
        "type": "way",
        "id": 127,
        "center": {"lat": 10.0, "lon": 106.0},
        "tags": {"name": "Way Place"}
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c is not None


def test_osm_relation_is_supported(mock_osm_provider):
    el = {
        "type": "relation",
        "id": 128,
        "center": {"lat": 10.0, "lon": 106.0},
        "tags": {"name": "Rel Place"}
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c is not None


def test_osm_missing_name(mock_osm_provider):
    el = {"type": "node", "id": 1, "lat": 10.0, "lon": 106.0, "tags": {}}
    assert mock_osm_provider._normalize_osm_place(el) is None


def test_osm_missing_coordinates(mock_osm_provider):
    el = {"type": "node", "id": 1, "tags": {"name": "No coord"}}
    assert mock_osm_provider._normalize_osm_place(el) is None


def test_osm_malformed_coordinates(mock_osm_provider):
    el = {"type": "node", "id": 1, "lat": "abc", "lon": "xyz", "tags": {"name": "Bad coord"}}
    assert mock_osm_provider._normalize_osm_place(el) is None


# --- 3. Data Quality ---

def test_osm_data_quality_null_fields(mock_osm_provider):
    el = {
        "type": "node",
        "id": 999,
        "lat": 10.0,
        "lon": 106.0,
        "tags": {
            "name": "Quality Test",
            "opening_hours": "Mo-Su 08:00-22:00"
        }
    }
    c = mock_osm_provider._normalize_osm_place(el)
    assert c.rating is None
    assert c.ticket_price is None
    assert c.estimated_cost_per_person is None
    assert c.business_status is None
    assert c.opening_hours is None
    assert c.opening_hours_text == "Mo-Su 08:00-22:00"


# --- 4. Fallback + Merge ---

def test_offline_sufficient_no_osm_call(mock_offline_provider):
    with patch("app.tools.places.OFFLINE_PLACES_DATA", {"Hồ Chí Minh": [
        PlaceCandidate(place_id="1", name="H1", category="HOTEL", latitude=1, longitude=1, provenance=Provenance(source="INTERNAL_DATABASE", source_id="1", retrieved_at="2026-01-01T00:00:00Z")),
        PlaceCandidate(place_id="2", name="R1", category="RESTAURANT", latitude=1, longitude=1, provenance=Provenance(source="INTERNAL_DATABASE", source_id="2", retrieved_at="2026-01-01T00:00:00Z")),
    ]}):
        mock_offline_provider.fallback.search_places_for_capacity = MagicMock()
        
        mock_offline_provider.search_places_for_capacity("Hồ Chí Minh", categories=["HOTEL", "RESTAURANT"], max_results=2)
        mock_offline_provider.fallback.search_places_for_capacity.assert_not_called()


def test_offline_missing_hotel_calls_osm(mock_offline_provider):
    with patch("app.tools.places.OFFLINE_PLACES_DATA", {"HCM": [
        PlaceCandidate(place_id="2", name="R1", category="RESTAURANT", latitude=1, longitude=1, provenance=Provenance(source="INTERNAL_DATABASE", source_id="2", retrieved_at="2026-01-01T00:00:00Z")),
        PlaceCandidate(place_id="3", name="R2", category="RESTAURANT", latitude=2, longitude=2, provenance=Provenance(source="INTERNAL_DATABASE", source_id="3", retrieved_at="2026-01-01T00:00:00Z")),
    ]}):
        mock_offline_provider.fallback.search_places_for_capacity = MagicMock(return_value=[])
        mock_offline_provider.search_places_for_capacity("HCM", categories=["HOTEL", "RESTAURANT"], max_results=4)
        
        mock_offline_provider.fallback.search_places_for_capacity.assert_called_with(
            city="HCM", categories=["HOTEL"], max_results=2
        )


def test_offline_osm_merge(mock_offline_provider):
    p1 = PlaceCandidate(place_id="1", name="H1", category="HOTEL", latitude=10.0, longitude=106.0, provenance=Provenance(source="INTERNAL_DATABASE", source_id="1", retrieved_at=""))
    f1 = PlaceCandidate(place_id="2", name="R1", category="RESTAURANT", latitude=10.01, longitude=106.01, provenance=Provenance(source="INTERNAL_DATABASE", source_id="2", retrieved_at=""))
    merged = mock_offline_provider._merge_and_deduplicate([p1], [f1])
    assert len(merged) == 2


def test_duplicate_place_id_removed(mock_offline_provider):
    p1 = PlaceCandidate(place_id="1", name="H1", category="HOTEL", latitude=10.0, longitude=106.0, provenance=Provenance(source="INTERNAL_DATABASE", source_id="1", retrieved_at=""))
    f1 = PlaceCandidate(place_id="1", name="H1_Diff", category="HOTEL", latitude=10.01, longitude=106.01, provenance=Provenance(source="INTERNAL_DATABASE", source_id="2", retrieved_at=""))
    merged = mock_offline_provider._merge_and_deduplicate([p1], [f1])
    assert len(merged) == 1


def test_duplicate_name_and_distance_removed(mock_offline_provider):
    p1 = PlaceCandidate(place_id="1", name="Highlands", category="CAFE", latitude=10.0, longitude=106.0, provenance=Provenance(source="INTERNAL_DATABASE", source_id="1", retrieved_at=""))
    f1 = PlaceCandidate(place_id="2", name="highlands", category="CAFE", latitude=10.0001, longitude=106.0001, provenance=Provenance(source="INTERNAL_DATABASE", source_id="2", retrieved_at=""))
    merged = mock_offline_provider._merge_and_deduplicate([p1], [f1])
    assert len(merged) == 1


def test_osm_timeout_does_not_break_agent(mock_osm_provider):
    mock_osm_provider._http_client.post.side_effect = httpx.TimeoutException("Timeout")
    res = mock_osm_provider.search_places("Hồ Chí Minh")
    assert isinstance(res, list)


def test_osm_http_error_fallback(mock_osm_provider):
    mock_osm_provider._http_client.post.side_effect = httpx.HTTPStatusError("Error", request=MagicMock(), response=MagicMock(status_code=500))
    res = mock_osm_provider.search_places("Hồ Chí Minh")
    assert isinstance(res, list)


# --- 5. Capacity Correctness (CRITICAL) ---

def test_capacity_correctness_category_aware():
    provider = OfflinePlacesProvider()
    
    attractions = [
        PlaceCandidate(place_id=f"A{i}", name=f"Attraction {i}", category="ATTRACTION", latitude=10, longitude=106, provenance=Provenance(source="INTERNAL_DATABASE", source_id="T", retrieved_at=""))
        for i in range(20)
    ]
    
    with patch("app.tools.places.OFFLINE_PLACES_DATA", {"HCM": attractions}):
        fallback_res = []
        for cat in ["HOTEL", "RESTAURANT", "CAFE"]:
            for i in range(5):
                fallback_res.append(
                    PlaceCandidate(place_id=f"{cat}{i}", name=f"{cat} {i}", category=cat, latitude=10, longitude=106, provenance=Provenance(source="INTERNAL_DATABASE", source_id="T", retrieved_at=""))
                )
                
        mock_fallback = MagicMock()
        mock_fallback.search_places_for_capacity.return_value = fallback_res
        provider.fallback = mock_fallback
        
        res = provider.search_places_for_capacity(
            "HCM", 
            categories=["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"],
            max_results=20
        )
        
        counts = {"HOTEL": 0, "RESTAURANT": 0, "CAFE": 0, "ATTRACTION": 0}
        for c in res:
            counts[c.category] += 1
            
        assert counts["HOTEL"] == 5
        assert counts["RESTAURANT"] == 5
        assert counts["CAFE"] == 5
        assert counts["ATTRACTION"] == 5
        assert len(res) == 20


# --- 6. Overpass query contract & Safety ---

def test_overpass_query_contract(mock_osm_provider):
    query = mock_osm_provider._build_overpass_query(10.0, 106.0, 5000, ["CAFE", "HOTEL"], 5)
    assert "[out:json][timeout:15];" in query
    assert 'nwr["amenity"="cafe"](around:5000,10.0,106.0)' in query
    assert 'out center 5;' in query
    assert 'nwr["tourism"~"hotel' in query
    assert query.count("out center 5;") == 2


def test_google_fallback_disabled_by_default():
    import app.tools.places
    app.tools.places._default_places_provider = None
    
    with patch("app.tools.places.settings") as mock_settings:
        mock_settings.use_google_places_fallback = False
        p = get_default_places_provider()
        assert p.fallback.fallback is None


def test_google_fallback_only_when_explicitly_enabled():
    import app.tools.places
    app.tools.places._default_places_provider = None
    
    with patch("app.tools.places.settings") as mock_settings:
        mock_settings.use_google_places_fallback = True
        p = get_default_places_provider()
        assert p.fallback.fallback is not None
        assert isinstance(p.fallback.fallback, GooglePlacesProvider)
