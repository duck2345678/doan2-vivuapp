from collections import Counter

from app.agents.destination import DestinationAgent
from app.data.offline_places import OFFLINE_PLACES_DATA, OFFLINE_SUPPORTED_CITIES
from app.schemas.request import ParsedUserRequest
from app.tools.places import OfflinePlacesProvider

EXPECTED_CATEGORIES = {"HOTEL", "ATTRACTION", "CAFE", "RESTAURANT"}


def test_offline_catalog_has_12_supported_cities():
    assert len(OFFLINE_PLACES_DATA) == 12
    assert OFFLINE_SUPPORTED_CITIES == frozenset(OFFLINE_PLACES_DATA.keys())


def test_offline_catalog_integrity():
    all_ids = []
    for city, places in OFFLINE_PLACES_DATA.items():
        assert places, city
        assert EXPECTED_CATEGORIES.issubset({place.category for place in places}), city
        for place in places:
            all_ids.append(place.place_id)
            assert place.place_id
            assert place.name
            assert place.rating >= 3.0
            assert -90 <= place.latitude <= 90
            assert -180 <= place.longitude <= 180
            assert not (place.latitude == 0.0 and place.longitude == 0.0)

    counts = Counter(all_ids)
    assert not [place_id for place_id, count in counts.items() if count > 1]


def test_offline_provider_category_filter():
    provider = OfflinePlacesProvider()
    cafes = provider.search_places("Đà Lạt", ["CAFE"])
    assert cafes
    assert all(place.category == "CAFE" for place in cafes)


def test_destination_agent_works_for_every_offline_city():
    agent = DestinationAgent(OfflinePlacesProvider())
    for city in OFFLINE_PLACES_DATA:
        request = ParsedUserRequest(
            destination_city=city,
            duration_days=3,
            num_travelers=2,
            total_budget=5_000_000,
            interests=["FOOD", "NATURE"],
        )
        candidates = agent.process(request)
        assert EXPECTED_CATEGORIES.issubset({c.category for c in candidates}), city
        assert agent.select_hotel(candidates) is not None, city
