from __future__ import annotations

from abc import ABC, abstractmethod
import logging
import re
from typing import Any, List, Optional

import httpx
import time

from app.core.config import settings
from app.data.offline_places import OFFLINE_PLACES_DATA
from app.schemas.common import Provenance, utc_now_iso
from app.schemas.place import BusinessStatus, PlaceCandidate

logger = logging.getLogger(__name__)


class PlacesProvider(ABC):
    @abstractmethod
    def search_places(
        self,
        city: str,
        categories: Optional[List[str]] = None,
    ) -> List[PlaceCandidate]:
        raise NotImplementedError

    def search_places_for_capacity(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        max_results: Optional[int] = None,
    ) -> List[PlaceCandidate]:
        """Capacity-aware API with backward-compatible default behavior.

        Providers that support pagination can override this method. A custom test
        provider only needs the original search_places method and automatically
        remains compatible with DestinationAgent.
        """
        results = self.search_places(city, categories)
        if max_results is None or max_results <= 0:
            return results
        return results[:max_results]


class OfflinePlacesProvider(PlacesProvider):
    def __init__(self, fallback_provider: Optional[PlacesProvider] = None):
        self.fallback = fallback_provider

    def search_places(
        self,
        city: str,
        categories: Optional[List[str]] = None,
    ) -> List[PlaceCandidate]:
        return self.search_places_for_capacity(city, categories)

    def search_places_for_capacity(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        max_results: Optional[int] = None,
    ) -> List[PlaceCandidate]:
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
        
        candidates: List[PlaceCandidate] = []
        if matched_city:
            candidates = [c.model_copy(deep=True) for c in OFFLINE_PLACES_DATA[matched_city]]

        if categories:
            allowed = {c.upper() for c in categories}
            candidates = [c for c in candidates if (c.category or "").upper() in allowed]

        # Calculate quota per category
        requested_capacity = max_results or 20
        cats_to_fetch = categories or ["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"]
        quota_per_cat = max(1, requested_capacity // len(cats_to_fetch)) if cats_to_fetch else requested_capacity
        
        current_counts = {}
        for c in candidates:
            cat = (c.category or "").upper()
            current_counts[cat] = current_counts.get(cat, 0) + 1
            
        missing_categories = []
        for cat in cats_to_fetch:
            if current_counts.get(cat, 0) < quota_per_cat:
                missing_categories.append(cat)
                
        if missing_categories and self.fallback:
            logger.info(f"Offline catalog thiếu các category {missing_categories} cho {city}. Gọi fallback.")
            fallback_candidates = self.fallback.search_places_for_capacity(
                city=city,
                categories=missing_categories,
                max_results=len(missing_categories) * quota_per_cat
            )
            candidates = self._merge_and_deduplicate(candidates, fallback_candidates)
            
        if max_results and max_results > 0:
            final_selection = []
            selected_ids = set()
            
            # Step 1: Fill up to quota_per_cat for each requested category
            for cat in cats_to_fetch:
                count = 0
                for c in candidates:
                    if count >= quota_per_cat:
                        break
                    if len(final_selection) >= max_results:
                        break
                    if (c.category or "").upper() == cat and c.place_id not in selected_ids:
                        final_selection.append(c)
                        selected_ids.add(c.place_id)
                        count += 1
                        
            # Step 2: Fill remaining capacity with any remaining candidates
            for c in candidates:
                if len(final_selection) >= max_results:
                    break
                if c.place_id not in selected_ids:
                    final_selection.append(c)
                    selected_ids.add(c.place_id)
                    
            return final_selection
            
        return candidates

    def _merge_and_deduplicate(self, primary: List[PlaceCandidate], fallback: List[PlaceCandidate]) -> List[PlaceCandidate]:
        from app.tools.routes import haversine_km
        merged = list(primary)
        
        for f in fallback:
            is_dup = False
            for p in primary:
                if p.place_id == f.place_id:
                    is_dup = True
                    break
                # Proximity & name match deduction
                if p.name.lower() == f.name.lower():
                    dist = haversine_km(p.latitude, p.longitude, f.latitude, f.longitude)
                    if dist < 0.2:  # 200m
                        is_dup = True
                        break
            if not is_dup:
                merged.append(f)
        return merged


class GooglePlacesProvider(PlacesProvider):
    PLACES_API_NEW_URL = "https://places.googleapis.com/v1/places:searchText"
    FIELD_MASK = (
        "places.id,places.displayName,places.formattedAddress,"
        "places.location,places.rating,places.userRatingCount,"
        "places.priceLevel,places.primaryType,places.types,"
        "places.regularOpeningHours,places.currentOpeningHours,"
        "places.businessStatus,nextPageToken"
    )

    TYPE_MAP = {
        "HOTEL": "lodging",
        "RESTAURANT": "restaurant",
        "CAFE": "cafe",
        "ATTRACTION": "tourist_attraction",
    }

    MAX_API_PAGES = 3
    API_PAGE_SIZE = 20

    def __init__(
        self,
        fallback_provider: Optional[PlacesProvider] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.fallback = fallback_provider or OfflinePlacesProvider()
        self.api_key = settings.google_maps_api_key
        self._http_client = http_client

    def search_places(
        self,
        city: str,
        categories: Optional[List[str]] = None,
    ) -> List[PlaceCandidate]:
        return self.search_places_for_capacity(
            city=city,
            categories=categories,
            max_results=self.API_PAGE_SIZE,
        )

    def search_places_for_capacity(
        self,
        city: str,
        categories: Optional[List[str]] = None,
        max_results: Optional[int] = None,
    ) -> List[PlaceCandidate]:
        requested_capacity = self.API_PAGE_SIZE if max_results is None else max_results
        requested_capacity = max(1, min(int(requested_capacity), 60))

        if not self.api_key:
            return self.fallback.search_places_for_capacity(
                city,
                categories,
                requested_capacity,
            )

        query = self._build_query(city, categories)
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK,
        }

        normalized: List[PlaceCandidate] = []
        seen: set[str] = set()
        page_token: Optional[str] = None

        for page_index in range(self.MAX_API_PAGES):
            remaining = requested_capacity - len(normalized)
            if remaining <= 0:
                break

            body: dict[str, Any] = {
                "textQuery": query,
                "languageCode": "vi",
                "pageSize": min(self.API_PAGE_SIZE, remaining),
            }

            if categories and len(categories) == 1:
                included_type = self.TYPE_MAP.get(categories[0].upper())
                if included_type:
                    body["includedType"] = included_type
                    body["strictTypeFiltering"] = True

            if page_token:
                body["pageToken"] = page_token

            response_json: Optional[dict[str, Any]] = None
            last_error: Optional[Exception] = None

            for attempt in range(2):
                try:
                    response = self._post(body, headers)
                    if response.status_code != 200:
                        raise RuntimeError(
                            f"Google Places HTTP {response.status_code}"
                        )
                    response_json = response.json()
                    break
                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_error = exc
                    logger.warning(
                        "Google Places timeout/transport page=%s attempt=%s/2",
                        page_index + 1,
                        attempt + 1,
                    )
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "Google Places lỗi page=%s attempt=%s/2: %s",
                        page_index + 1,
                        attempt + 1,
                        exc,
                    )
                    break

            if response_json is None:
                if last_error:
                    logger.warning("Google Places fallback offline: %s", last_error)
                break

            places_raw = response_json.get("places", []) or []
            for item in places_raw:
                candidate = self._normalize_google_place(item)
                if candidate is None or candidate.place_id in seen:
                    continue
                if categories and (candidate.category or "").upper() not in {
                    category.upper() for category in categories
                }:
                    continue
                seen.add(candidate.place_id)
                normalized.append(candidate)
                if len(normalized) >= requested_capacity:
                    break

            if len(normalized) >= requested_capacity:
                break

            page_token = response_json.get("nextPageToken")
            if not page_token:
                break

        if normalized:
            return normalized[:requested_capacity]

        logger.warning(
            "Google Places không có candidate usable cho %s; dùng offline fallback",
            city,
        )
        return self.fallback.search_places_for_capacity(
            city,
            categories,
            requested_capacity,
        )

    def _post(
        self,
        body: dict[str, Any],
        headers: dict[str, str],
    ) -> httpx.Response:
        timeout = settings.google_places_timeout_seconds
        if self._http_client:
            return self._http_client.post(
                self.PLACES_API_NEW_URL,
                headers=headers,
                json=body,
                timeout=timeout,
            )
        with httpx.Client(timeout=timeout) as client:
            return client.post(
                self.PLACES_API_NEW_URL,
                headers=headers,
                json=body,
            )

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

    def _normalize_google_place(self, item: dict[str, Any]) -> Optional[PlaceCandidate]:
        try:
            location = item.get("location") or item.get("geometry", {}).get("location", {})
            lat = location.get("latitude") if "latitude" in location else location.get("lat")
            lng = location.get("longitude") if "longitude" in location else location.get("lng")
            if lat is None or lng is None:
                return None
            if float(lat) == 0.0 and float(lng) == 0.0:
                return None

            place_id = item.get("id") or item.get("place_id")
            display_name = item.get("displayName")
            name = (
                display_name.get("text")
                if isinstance(display_name, dict)
                else item.get("name")
            )
            if not place_id or not name:
                return None

            primary_type = item.get("primaryType")
            types = item.get("types", []) or []
            category = (
                self._map_primary_type_to_category(primary_type)
                if primary_type
                else None
            )
            category = category or self._map_google_types_to_category(types)
            if category is None:
                return None

            price_level = (
                item.get("priceLevel")
                if "priceLevel" in item
                else item.get("price_level")
            )
            estimate = self._map_price_level_to_estimated_cost(price_level)
            room_cost = (
                self._map_hotel_price_level_to_room_cost(price_level)
                if category == "HOTEL"
                else None
            )
            has_estimate = estimate is not None or room_cost is not None

            rating_raw = item.get("rating")
            reviews_raw = (
                item.get("userRatingCount")
                if "userRatingCount" in item
                else item.get("user_ratings_total")
            )

            business_status = item.get("businessStatus")
            if business_status not in {
                "OPERATIONAL",
                "CLOSED_TEMPORARILY",
                "CLOSED_PERMANENTLY",
                "FUTURE_OPENING",
                None,
            }:
                business_status = None

            return PlaceCandidate(
                place_id=str(place_id),
                name=str(name),
                category=category,
                interests=self._extract_interests_from_types(types),
                rating=float(rating_raw) if rating_raw is not None else None,
                user_ratings_total=int(reviews_raw) if reviews_raw is not None else 0,
                address=item.get("formattedAddress") or item.get("formatted_address", ""),
                latitude=float(lat),
                longitude=float(lng),
                opening_hours=item.get("regularOpeningHours"),
                current_opening_hours=item.get("currentOpeningHours"),
                business_status=business_status,
                estimated_cost_per_person=(
                    None if category == "HOTEL" else estimate
                ),
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
            logger.debug(
                "Bỏ qua Google Place có format không hợp lệ",
                exc_info=True,
            )
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
            "lodging": "HOTEL",
            "hotel": "HOTEL",
            "resort_hotel": "HOTEL",
            "bed_and_breakfast": "HOTEL",
            "guest_house": "HOTEL",
            "hostel": "HOTEL",
            "motel": "HOTEL",
            "inn": "HOTEL",
            "cafe": "CAFE",
            "coffee_shop": "CAFE",
            "tea_house": "CAFE",
            "restaurant": "RESTAURANT",
            "meal_takeaway": "RESTAURANT",
            "meal_delivery": "RESTAURANT",
            "bakery": "RESTAURANT",
            "bar": "RESTAURANT",
            "food": "RESTAURANT",
            "food_court": "RESTAURANT",
            "tourist_attraction": "ATTRACTION",
            "amusement_park": "ATTRACTION",
            "aquarium": "ATTRACTION",
            "art_gallery": "ATTRACTION",
            "beach": "ATTRACTION",
            "campground": "ATTRACTION",
            "church": "ATTRACTION",
            "hindu_temple": "ATTRACTION",
            "museum": "ATTRACTION",
            "national_park": "ATTRACTION",
            "natural_feature": "ATTRACTION",
            "park": "ATTRACTION",
            "place_of_worship": "ATTRACTION",
            "point_of_interest": "ATTRACTION",
            "stadium": "ATTRACTION",
            "zoo": "ATTRACTION",
            "historical_landmark": "ATTRACTION",
            "monument": "ATTRACTION",
            "botanical_garden": "ATTRACTION",
            "scenic_viewpoint": "ATTRACTION",
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
        if types_set & {
            "lodging",
            "hotel",
            "resort",
            "resort_hotel",
            "bed_and_breakfast",
            "guest_house",
            "hostel",
            "motel",
            "inn",
        }:
            return "HOTEL"
        if types_set & {"cafe", "coffee_shop", "tea_house"}:
            return "CAFE"
        if types_set & {
            "restaurant",
            "food",
            "meal_takeaway",
            "meal_delivery",
            "bakery",
            "bar",
            "food_court",
        }:
            return "RESTAURANT"
        if types_set & {
            "tourist_attraction",
            "point_of_interest",
            "park",
            "natural_feature",
            "museum",
            "art_gallery",
            "amusement_park",
            "aquarium",
            "zoo",
            "beach",
            "church",
            "hindu_temple",
            "place_of_worship",
            "campground",
            "stadium",
            "national_park",
            "historical_landmark",
            "monument",
            "botanical_garden",
            "scenic_viewpoint",
        }:
            return "ATTRACTION"
        return None

    def _extract_interests_from_types(self, types: List[str]) -> List[str]:
        values = {t.lower() for t in types}
        interests: List[str] = []
        if values & {"cafe", "coffee_shop", "tea_house"}:
            interests.append("CAFE")
        if values & {
            "park",
            "natural_feature",
            "campground",
            "national_park",
            "beach",
        }:
            interests.append("NATURE")
        if values & {"restaurant", "food", "bakery"}:
            interests.append("FOOD")
        if values & {
            "museum",
            "art_gallery",
            "church",
            "hindu_temple",
            "place_of_worship",
            "historical_landmark",
        }:
            interests.append("CULTURE")
        if values & {
            "tourist_attraction",
            "point_of_interest",
            "amusement_park",
            "aquarium",
            "zoo",
            "scenic_viewpoint",
        }:
            interests.append("CHECKIN")
        if values & {"spa", "lodging", "resort_hotel"}:
            interests.append("RELAX")
        if "beach" in values:
            interests.append("BEACH")
        return interests


class OSMPlacesProvider(PlacesProvider):
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"

    DEFAULT_CITY_CENTERS = {
        "hồ chí minh": (10.7769, 106.7009),
        "ho chi minh": (10.7769, 106.7009),
        "hà nội": (21.0285, 105.8542),
        "ha noi": (21.0285, 105.8542),
        "đà nẵng": (16.0544, 108.2022),
        "da nang": (16.0544, 108.2022),
        "đà lạt": (11.9404, 108.4583),
        "da lat": (11.9404, 108.4583),
        "nha trang": (12.2451, 109.1943),
        "vũng tàu": (10.3460, 107.0843),
        "vung tau": (10.3460, 107.0843),
        "phú quốc": (10.2289, 103.9573),
        "phu quoc": (10.2289, 103.9573),
    }

    def __init__(self, fallback_provider: Optional[PlacesProvider] = None, http_client: Optional[httpx.Client] = None):
        self.fallback = fallback_provider
        timeout = getattr(settings, "osm_timeout_seconds", 15.0)
        # Using a distinct client for OSM to respect timeout and connection pooling
        self._http_client = http_client or httpx.Client(timeout=timeout)

    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        return self.search_places_for_capacity(city, categories)

    def search_places_for_capacity(self, city: str, categories: Optional[List[str]] = None, max_results: Optional[int] = None) -> List[PlaceCandidate]:
        center = self._get_city_center(city)
        if not center:
            logger.warning(f"OSMPlacesProvider: Không tìm thấy center cho city={city}. Bỏ qua OSM.")
            return self.fallback.search_places_for_capacity(city, categories, max_results) if self.fallback else []
            
        lat, lon = center
        radius_km = getattr(settings, "osm_search_radius_km", 10)
        radius_m = int(radius_km * 1000)
        
        limit_total = max_results or 50
        cats_to_fetch = categories or ["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"]
        quota_per_cat = max(1, limit_total // len(cats_to_fetch)) if cats_to_fetch else 20
        
        query = self._build_overpass_query(lat, lon, radius_m, cats_to_fetch, quota_per_cat)
        if not query:
            return []
            
        candidates = []
        try:
            # Respect public Overpass limits slightly with sequential boundary
            time.sleep(0.5)
            response = self._http_client.post(self.OVERPASS_URL, data={"data": query})
            response.raise_for_status()
            data = response.json()
            
            elements = data.get("elements", [])
            for el in elements:
                candidate = self._normalize_osm_place(el)
                if candidate:
                    candidates.append(candidate)
                    
        except httpx.HTTPStatusError as exc:
            logger.warning(f"OSMPlacesProvider: Overpass HTTP error {exc.response.status_code}")
        except Exception as exc:
            logger.exception("OSMPlacesProvider: Lỗi khi truy vấn Overpass API")
            
        if not candidates and self.fallback:
            return self.fallback.search_places_for_capacity(city, categories, max_results)
            
        # Deduplicate internally
        seen = set()
        deduped = []
        for c in candidates:
            if c.place_id not in seen:
                seen.add(c.place_id)
                deduped.append(c)
                
        # Optional fallback to Google if OSM is also lacking
        if self.fallback and len(deduped) < limit_total:
            fallback_res = self.fallback.search_places_for_capacity(city, categories, limit_total - len(deduped))
            # Merge with fallback (Offline already merged OSM, now OSM merges Google)
            from app.tools.routes import haversine_km
            for f in fallback_res:
                is_dup = False
                for p in deduped:
                    if p.place_id == f.place_id:
                        is_dup = True
                        break
                    if p.name.lower() == f.name.lower():
                        if haversine_km(p.latitude, p.longitude, f.latitude, f.longitude) < 0.2:
                            is_dup = True
                            break
                if not is_dup:
                    deduped.append(f)
            
        return deduped[:limit_total] if max_results else deduped

    def _get_city_center(self, city: str) -> Optional[tuple[float, float]]:
        c = city.casefold()
        centers = getattr(settings, "osm_city_centers", self.DEFAULT_CITY_CENTERS)
        for k, v in centers.items():
            if k in c or c in k:
                return v
        return None

    def _build_overpass_query(self, lat: float, lon: float, radius: int, categories: List[str], limit_per_cat: int) -> str:
        statements = []
        cats = [c.upper() for c in categories]
        
        if "CAFE" in cats:
            statements.append(f'( nwr["amenity"="cafe"](around:{radius},{lat},{lon}); ); out center {limit_per_cat};')
        if "RESTAURANT" in cats:
            statements.append(f'( nwr["amenity"~"restaurant|fast_food"](around:{radius},{lat},{lon}); ); out center {limit_per_cat};')
        if "HOTEL" in cats:
            statements.append(f'( nwr["tourism"~"hotel|hostel|guest_house|motel"](around:{radius},{lat},{lon}); ); out center {limit_per_cat};')
        if "ATTRACTION" in cats:
            statements.append(
                f'(\n  nwr["tourism"~"museum|attraction|viewpoint|gallery|theme_park"](around:{radius},{lat},{lon});\n'
                f'  nwr["historic"~"monument|memorial|ruins"](around:{radius},{lat},{lon});\n); out center {limit_per_cat};'
            )
            
        if not statements:
            return ""
            
        query = "[out:json][timeout:15];\n" + "\n".join(statements)
        return query

    def _normalize_osm_place(self, el: dict) -> Optional[PlaceCandidate]:
        try:
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("name:en")
            if not name:
                return None
                
            lat = el.get("lat")
            if lat is None:
                lat = (el.get("center") or {}).get("lat")
                
            lon = el.get("lon")
            if lon is None:
                lon = (el.get("center") or {}).get("lon")
                
            if lat is None or lon is None:
                return None
                
            el_id = el.get("id")
            place_id = f"osm_{el.get('type')}_{el_id}"
            
            metadata = {}
            
            amenity = tags.get("amenity")
            tourism = tags.get("tourism")
            
            if amenity == "cafe":
                category = "CAFE"
            elif amenity in ["restaurant", "fast_food"]:
                category = "RESTAURANT"
            elif tourism in ["hotel", "hostel", "guest_house", "motel"]:
                category = "HOTEL"
                metadata["accommodation_type"] = tourism.upper()
            else:
                category = "ATTRACTION"
                
            address = tags.get("addr:street", "")
            if "addr:housenumber" in tags:
                address = f"{tags['addr:housenumber']} {address}"
                
            opening_hours = tags.get("opening_hours")
            
            # NOTE: Rating and price/fee are explicitly set to None (Unknown).
            # business_status=None to avoid faking operational status.
            return PlaceCandidate(
                place_id=place_id,
                name=name,
                category=category,
                interests=self._extract_interests_from_osm_tags(tags, category),  
                rating=None,   
                user_ratings_total=0,
                address=address.strip(),
                latitude=float(lat),
                longitude=float(lon),
                opening_hours=None,
                current_opening_hours=None,
                opening_hours_text=opening_hours,
                business_status=None, 
                estimated_cost_per_person=None,
                ticket_price=None,
                estimated_room_cost_per_night=None,
                provenance=Provenance(
                    source="OSM_OVERPASS",
                    source_id=place_id,
                    retrieved_at=utc_now_iso(),
                    is_estimate=True
                ),
            )
        except (TypeError, ValueError, AttributeError):
            logger.debug("Bỏ qua OSM Place có format không hợp lệ", exc_info=True)
            return None

    def _extract_interests_from_osm_tags(self, tags: dict, category: str) -> List[str]:
        interests = set()
        tourism = tags.get("tourism", "")
        
        if category == "CAFE":
            interests.add("CAFE")
        elif category == "RESTAURANT":
            interests.add("FOOD")
        elif category == "ATTRACTION":
            if tourism in ["museum", "gallery"]:
                interests.add("CULTURE")
            elif tourism in ["viewpoint"]:
                interests.add("CHECKIN")
            if "historic" in tags:
                interests.add("CULTURE")
            if tags.get("natural") == "beach":
                interests.update(["NATURE", "BEACH"])
            if tags.get("leisure") == "park":
                interests.add("NATURE")
        return list(interests)


_default_places_provider: Optional[PlacesProvider] = None

def get_default_places_provider() -> PlacesProvider:
    global _default_places_provider
    if _default_places_provider is None:
        use_google = getattr(settings, "use_google_places_fallback", False)
        
        # 1. OPTIONAL/LEGACY: GooglePlacesProvider (chỉ bật khi có cờ)
        google_fallback = GooglePlacesProvider() if use_google else None
        
        # 2. FILL GAP: OSMPlacesProvider
        osm_fallback = OSMPlacesProvider(fallback_provider=google_fallback)
        
        # 3. PRIMARY: OfflinePlacesProvider
        _default_places_provider = OfflinePlacesProvider(fallback_provider=osm_fallback)
        
    return _default_places_provider
