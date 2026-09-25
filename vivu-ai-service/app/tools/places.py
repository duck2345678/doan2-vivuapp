from __future__ import annotations

from abc import ABC, abstractmethod
import logging
from typing import Any, List, Optional

import httpx

from app.core.config import settings
from app.data.offline_places import OFFLINE_PLACES_DATA
from app.schemas.common import Provenance, utc_now_iso
from app.schemas.place import PlaceCandidate

logger = logging.getLogger(__name__)


class PlacesProvider(ABC):
    @abstractmethod
    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        raise NotImplementedError


class OfflinePlacesProvider(PlacesProvider):
    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        matched_city = next(
            (
                key
                for key in OFFLINE_PLACES_DATA
                if key.casefold() == city.casefold()
                or key.casefold() in city.casefold()
                or city.casefold() in key.casefold()
            ),
            None,
        )
        if not matched_city:
            logger.warning("Offline catalog không có dữ liệu cho %s", city)
            return []

        candidates = OFFLINE_PLACES_DATA[matched_city]
        if categories:
            allowed = {c.upper() for c in categories}
            candidates = [c for c in candidates if c.category in allowed]
        return [c.model_copy(deep=True) for c in candidates]


class GooglePlacesProvider(PlacesProvider):
    PLACES_API_NEW_URL = "https://places.googleapis.com/v1/places:searchText"
    FIELD_MASK = (
        "places.id,places.displayName,places.formattedAddress,"
        "places.location,places.rating,places.userRatingCount,"
        "places.priceLevel,places.primaryType,places.types,"
        "places.regularOpeningHours"
    )

    def __init__(self, fallback_provider: Optional[PlacesProvider] = None, http_client: Optional[httpx.Client] = None):
        self.fallback = fallback_provider or OfflinePlacesProvider()
        self.api_key = settings.google_maps_api_key
        self._http_client = http_client

    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        if not self.api_key:
            return self.fallback.search_places(city, categories)

        try:
            query = self._build_query(city, categories)
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": self.FIELD_MASK,
            }
            body = {"textQuery": query, "languageCode": "vi", "pageSize": 20}

            if self._http_client:
                response = self._http_client.post(
                    self.PLACES_API_NEW_URL,
                    headers=headers,
                    json=body,
                    timeout=settings.google_places_timeout_seconds,
                )
            else:
                with httpx.Client(timeout=settings.google_places_timeout_seconds) as client:
                    response = client.post(self.PLACES_API_NEW_URL, headers=headers, json=body)

            if response.status_code != 200:
                logger.warning("Google Places trả HTTP %s; dùng offline fallback", response.status_code)
                return self.fallback.search_places(city, categories)

            places_raw = response.json().get("places", [])
            normalized: List[PlaceCandidate] = []
            seen: set[str] = set()
            for item in places_raw:
                candidate = self._normalize_google_place(item)
                if candidate and candidate.place_id not in seen:
                    seen.add(candidate.place_id)
                    normalized.append(candidate)

            if categories:
                allowed = {c.upper() for c in categories}
                normalized = [c for c in normalized if c.category in allowed]

            return normalized or self.fallback.search_places(city, categories)
        except Exception:
            logger.exception("GooglePlacesProvider lỗi; dùng offline fallback")
            return self.fallback.search_places(city, categories)

    def _build_query(self, city: str, categories: Optional[List[str]]) -> str:
        if categories and len(categories) == 1:
            category = categories[0].upper()
            mapping = {
                "HOTEL": f"hotels in {city} Vietnam",
                "RESTAURANT": f"restaurants in {city} Vietnam",
                "CAFE": f"cafes in {city} Vietnam",
                "ATTRACTION": f"tourist attractions in {city} Vietnam",
            }
            if category in mapping:
                return mapping[category]
        return f"places to visit in {city} Vietnam"

    def _normalize_google_place(self, item: dict) -> Optional[PlaceCandidate]:
        try:
            location = item.get("location") or item.get("geometry", {}).get("location", {})
            lat = location.get("latitude") if "latitude" in location else location.get("lat")
            lng = location.get("longitude") if "longitude" in location else location.get("lng")
            if lat is None or lng is None or (float(lat) == 0.0 and float(lng) == 0.0):
                return None

            place_id = item.get("id") or item.get("place_id")
            display_name = item.get("displayName")
            name = display_name.get("text") if isinstance(display_name, dict) else item.get("name")
            if not place_id or not name:
                return None

            primary_type = item.get("primaryType")
            types = item.get("types", []) or []
            category = self._map_primary_type_to_category(primary_type) if primary_type else None
            category = category or self._map_google_types_to_category(types)
            if category is None:
                return None

            price_level = item.get("priceLevel") if "priceLevel" in item else item.get("price_level")
            estimate = self._map_price_level_to_estimated_cost(price_level)
            room_cost = self._map_hotel_price_level_to_room_cost(price_level) if category == "HOTEL" else None
            has_estimate = estimate is not None or room_cost is not None

            rating_raw = item.get("rating")
            reviews_raw = item.get("userRatingCount") if "userRatingCount" in item else item.get("user_ratings_total")

            return PlaceCandidate(
                place_id=str(place_id),
                name=str(name),
                category=category,
                interests=self._extract_interests_from_types(types),
                rating=float(rating_raw) if rating_raw is not None else 0.0,
                user_ratings_total=int(reviews_raw) if reviews_raw is not None else 0,
                address=item.get("formattedAddress") or item.get("formatted_address", ""),
                latitude=float(lat),
                longitude=float(lng),
                opening_hours=item.get("regularOpeningHours"),
                estimated_cost_per_person=None if category == "HOTEL" else estimate,
                ticket_price=None,
                estimated_room_cost_per_night=room_cost,
                provenance=Provenance(
                    source="GOOGLE_PLACES",
                    source_id=str(place_id),
                    retrieved_at=utc_now_iso(),
                    is_estimate=has_estimate,
                ),
            )
        except (TypeError, ValueError, AttributeError):
            logger.debug("Bỏ qua Google Place có format không hợp lệ", exc_info=True)
            return None

    def _map_price_level_to_estimated_cost(self, value: Any) -> Optional[int]:
        new_map = {
            "PRICE_LEVEL_FREE": 0,
            "PRICE_LEVEL_INEXPENSIVE": 70_000,
            "PRICE_LEVEL_MODERATE": 180_000,
            "PRICE_LEVEL_EXPENSIVE": 400_000,
            "PRICE_LEVEL_VERY_EXPENSIVE": 900_000,
        }
        legacy_map = {0: 0, 1: 70_000, 2: 180_000, 3: 400_000, 4: 900_000}
        if isinstance(value, str):
            return new_map.get(value)
        if isinstance(value, int):
            return legacy_map.get(value)
        return None

    def _map_hotel_price_level_to_room_cost(self, value: Any) -> Optional[int]:
        new_map = {
            "PRICE_LEVEL_INEXPENSIVE": 500_000,
            "PRICE_LEVEL_MODERATE": 900_000,
            "PRICE_LEVEL_EXPENSIVE": 1_800_000,
            "PRICE_LEVEL_VERY_EXPENSIVE": 3_500_000,
        }
        legacy_map = {1: 500_000, 2: 900_000, 3: 1_800_000, 4: 3_500_000}
        if isinstance(value, str):
            return new_map.get(value)
        if isinstance(value, int):
            return legacy_map.get(value)
        return None

    def _map_primary_type_to_category(self, primary_type: str) -> Optional[str]:
        p = primary_type.lower()
        exact = {
            "lodging": "HOTEL", "hotel": "HOTEL", "resort_hotel": "HOTEL",
            "bed_and_breakfast": "HOTEL", "guest_house": "HOTEL", "hostel": "HOTEL", "motel": "HOTEL", "inn": "HOTEL",
            "cafe": "CAFE", "coffee_shop": "CAFE", "tea_house": "CAFE",
            "restaurant": "RESTAURANT", "meal_takeaway": "RESTAURANT", "meal_delivery": "RESTAURANT",
            "bakery": "RESTAURANT", "bar": "RESTAURANT", "food": "RESTAURANT", "food_court": "RESTAURANT",
            "tourist_attraction": "ATTRACTION", "amusement_park": "ATTRACTION", "aquarium": "ATTRACTION",
            "art_gallery": "ATTRACTION", "beach": "ATTRACTION", "campground": "ATTRACTION", "church": "ATTRACTION",
            "hindu_temple": "ATTRACTION", "museum": "ATTRACTION", "national_park": "ATTRACTION", "natural_feature": "ATTRACTION",
            "park": "ATTRACTION", "place_of_worship": "ATTRACTION", "point_of_interest": "ATTRACTION", "stadium": "ATTRACTION",
            "zoo": "ATTRACTION", "historical_landmark": "ATTRACTION", "monument": "ATTRACTION",
            "botanical_garden": "ATTRACTION", "scenic_viewpoint": "ATTRACTION",
        }
        if p in exact:
            return exact[p]
        if p.endswith("_restaurant"):
            return "RESTAURANT"
        if p.endswith("_cafe") or p.endswith("_coffee_shop"):
            return "CAFE"
        if p.endswith("_hotel") or p.endswith("_resort") or p.endswith("_lodging"):
            return "HOTEL"
        if p.endswith("_park") or p.endswith("_museum") or p.endswith("_garden"):
            return "ATTRACTION"
        return None

    def _map_google_types_to_category(self, types: List[str]) -> Optional[str]:
        types_set = {t.lower() for t in types}
        if types_set & {"lodging", "hotel", "resort", "resort_hotel", "bed_and_breakfast", "guest_house", "hostel", "motel", "inn"}:
            return "HOTEL"
        if types_set & {"cafe", "coffee_shop", "tea_house"}:
            return "CAFE"
        if types_set & {"restaurant", "food", "meal_takeaway", "meal_delivery", "bakery", "bar", "food_court"}:
            return "RESTAURANT"
        if types_set & {
            "tourist_attraction", "point_of_interest", "park", "natural_feature", "museum", "art_gallery",
            "amusement_park", "aquarium", "zoo", "beach", "church", "hindu_temple", "place_of_worship",
            "campground", "stadium", "national_park", "historical_landmark", "monument", "botanical_garden", "scenic_viewpoint",
        }:
            return "ATTRACTION"
        return None

    def _extract_interests_from_types(self, types: List[str]) -> List[str]:
        values = {t.lower() for t in types}
        interests: List[str] = []
        if values & {"cafe", "coffee_shop", "tea_house"}:
            interests.append("CAFE")
        if values & {"park", "natural_feature", "campground", "national_park", "beach"}:
            interests.append("NATURE")
        if values & {"restaurant", "food", "bakery"}:
            interests.append("FOOD")
        if values & {"museum", "art_gallery", "church", "hindu_temple", "place_of_worship", "historical_landmark"}:
            interests.append("CULTURE")
        if values & {"tourist_attraction", "point_of_interest", "amusement_park", "aquarium", "zoo", "scenic_viewpoint"}:
            interests.append("CHECKIN")
        if values & {"spa", "lodging", "resort_hotel"}:
            interests.append("RELAX")
        if "beach" in values:
            interests.append("BEACH")
        return interests


def get_default_places_provider() -> PlacesProvider:
    return GooglePlacesProvider()
