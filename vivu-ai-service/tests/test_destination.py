from app.agents.destination import DestinationAgent
from app.schemas.common import Provenance
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.places import PlacesProvider


class FakeProvider(PlacesProvider):
    def search_places(self, city, categories=None):
        category = categories[0]
        records = {
            "HOTEL": PlaceCandidate(
                place_id="h1", name="Hotel A", category="HOTEL", rating=4.5,
                user_ratings_total=500, address="Đà Lạt", latitude=11.94, longitude=108.44,
                estimated_room_cost_per_night=700_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
            "ATTRACTION": PlaceCandidate(
                place_id="a1", name="Attraction A", category="ATTRACTION", interests=["NATURE"],
                rating=4.7, user_ratings_total=4000, address="Đà Lạt", latitude=11.95, longitude=108.45,
                estimated_cost_per_person=50_000, ticket_price=100_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
            "CAFE": PlaceCandidate(
                place_id="c1", name="Cafe A", category="CAFE", interests=["CAFE"],
                rating=4.6, user_ratings_total=1000, address="Đà Lạt", latitude=11.96, longitude=108.46,
                estimated_cost_per_person=70_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
            "RESTAURANT": PlaceCandidate(
                place_id="r1", name="Restaurant A", category="RESTAURANT", interests=["FOOD"],
                rating=4.4, user_ratings_total=2000, address="Đà Lạt", latitude=11.97, longitude=108.47,
                estimated_cost_per_person=120_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
        }
        return [records[category]]


def test_destination_fetches_all_categories_and_scores():
    agent = DestinationAgent(FakeProvider())
    request = ParsedUserRequest(
        destination_city="Đà Lạt", duration_days=3, num_travelers=2,
        total_budget=5_000_000, interests=["CAFE", "NATURE"],
    )
    result = agent.process(request)
    assert {x.category for x in result} == {"HOTEL", "ATTRACTION", "CAFE", "RESTAURANT"}
    assert all(0 <= x.score <= 1 for x in result)
