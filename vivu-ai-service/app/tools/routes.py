from __future__ import annotations

from abc import ABC, abstractmethod
import logging
import math
import time
from typing import List, Optional, Sequence, Dict

import httpx

from app.core.config import settings
from app.schemas.common import Provenance, utc_now_iso
from app.schemas.itinerary import RouteSegment
from app.schemas.place import PlaceCandidate

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
ROAD_DISTANCE_FACTOR = 1.4
AVERAGE_URBAN_SPEED_KMH = 25.0
MIN_TRAVEL_MINUTES = 3


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_duration_minutes(distance_km: float) -> int:
    if distance_km <= 0:
        return 0
    return max(
        MIN_TRAVEL_MINUTES,
        int(math.ceil(distance_km / AVERAGE_URBAN_SPEED_KMH * 60)),
    )


def estimate_road_duration_minutes(straight_line_distance_km: float) -> int:
    """Conservative planning estimate: Haversine × ROAD_DISTANCE_FACTOR."""
    return estimate_duration_minutes(straight_line_distance_km * ROAD_DISTANCE_FACTOR)


def _haversine_segment(origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
    straight_line = haversine_km(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
    )
    road_estimate = straight_line * ROAD_DISTANCE_FACTOR
    return RouteSegment(
        from_place_id=origin.place_id,
        to_place_id=destination.place_id,
        distance_km=round(road_estimate, 2),
        duration_minutes=estimate_duration_minutes(road_estimate),
        provenance=Provenance(
            source="INTERNAL_ESTIMATE",
            is_estimate=True,
            retrieved_at=utc_now_iso(),
        ),
    )


class RouteProvider(ABC):
    @abstractmethod
    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        raise NotImplementedError

    def calculate_route_segments(self, places: Sequence[PlaceCandidate]) -> List[RouteSegment]:
        return [
            self.calculate_route(places[i], places[i + 1])
            for i in range(len(places) - 1)
        ]

    def calculate_matrix(self, places: Sequence[PlaceCandidate]) -> Dict[str, Dict[str, RouteSegment]]:
        matrix = {}
        for p1 in places:
            matrix[p1.place_id] = {}
            for p2 in places:
                if p1.place_id == p2.place_id:
                    matrix[p1.place_id][p2.place_id] = RouteSegment(
                        from_place_id=p1.place_id,
                        to_place_id=p2.place_id,
                        distance_km=0,
                        duration_minutes=0,
                        provenance=Provenance(source="SAME_LOCATION", retrieved_at=utc_now_iso(), is_estimate=False)
                    )
                else:
                    matrix[p1.place_id][p2.place_id] = self.calculate_route(p1, p2)
        return matrix


class HaversineRouteProvider(RouteProvider):
    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        return _haversine_segment(origin, destination)


class GoogleRoutesProvider(RouteProvider):
    ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
    FIELD_MASK = "routes.duration,routes.distanceMeters"

    def __init__(
        self,
        fallback_provider: Optional[RouteProvider] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.fallback = fallback_provider or HaversineRouteProvider()
        self.api_key = settings.google_maps_api_key
        self._http_client = http_client

    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        if not self.api_key:
            return self.fallback.calculate_route(origin, destination)

        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                return self._request_google_route(origin, destination)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                logger.warning(
                    "Google Routes timeout/transport, attempt=%s/2",
                    attempt + 1,
                )
            except Exception as exc:
                last_error = exc
                logger.exception("Google Routes lỗi; dùng Haversine estimate")
                break

        if last_error:
            logger.warning("Google Routes fallback Haversine: %s", last_error)
        return self.fallback.calculate_route(origin, destination)

    def _request_google_route(
        self,
        origin: PlaceCandidate,
        destination: PlaceCandidate,
    ) -> RouteSegment:
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK,
        }
        body = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": origin.latitude,
                        "longitude": origin.longitude,
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": destination.latitude,
                        "longitude": destination.longitude,
                    }
                }
            },
            "travelMode": "DRIVE",
            "languageCode": "vi",
        }
        timeout = settings.google_routes_timeout_seconds
        if self._http_client:
            response = self._http_client.post(
                self.ROUTES_URL,
                headers=headers,
                json=body,
                timeout=timeout,
            )
        else:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(
                    self.ROUTES_URL,
                    headers=headers,
                    json=body,
                )

        if response.status_code != 200:
            raise RuntimeError(f"Google Routes HTTP {response.status_code}")

        routes = response.json().get("routes") or []
        if not routes:
            raise RuntimeError("Google Routes empty result")

        route = routes[0]
        meters = float(route.get("distanceMeters") or 0)
        duration_raw = str(route.get("duration") or "0s")
        if duration_raw.endswith("s"):
            seconds = int(float(duration_raw.rstrip("s")))
        else:
            seconds = int(float(duration_raw))

        return RouteSegment(
            from_place_id=origin.place_id,
            to_place_id=destination.place_id,
            distance_km=round(meters / 1000.0, 2),
            duration_minutes=(
                max(0, int(math.ceil(seconds / 60)))
                if seconds
                else estimate_duration_minutes(meters / 1000.0)
            ),
            provenance=Provenance(
                source="GOOGLE_ROUTES",
                source_id=f"{origin.place_id}->{destination.place_id}",
                retrieved_at=utc_now_iso(),
                is_estimate=False,
            ),
        )

class OSRMRoutesProvider(RouteProvider):
    def __init__(
        self,
        fallback_provider: Optional[RouteProvider] = None,
        http_client: Optional[httpx.Client] = None,
        base_url: str = "http://localhost:5000",
    ):
        self.fallback = fallback_provider or HaversineRouteProvider()
        # Allows configuring via .env later
        self.base_url = getattr(settings, "osrm_base_url", base_url)
        if not self.base_url:
            self.base_url = base_url
        timeout = getattr(settings, "osrm_timeout_seconds", 5.0)
        self._http_client = http_client or httpx.Client(timeout=timeout)
        self._cache: Dict[str, RouteSegment] = {}

    def calculate_route(self, origin: PlaceCandidate, destination: PlaceCandidate) -> RouteSegment:
        cache_key = f"{origin.place_id}->{destination.place_id}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                res = self._request_osrm_route(origin, destination)
                self._cache[cache_key] = res
                return res
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code < 500:
                    last_error = exc
                    break
                last_error = exc
                time.sleep(0.15)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                logger.warning(
                    "OSRM Routes timeout/transport, attempt=%s/2",
                    attempt + 1,
                )
                time.sleep(0.15)
            except Exception as exc:
                last_error = exc
                logger.exception("OSRM Routes lỗi; fallback sang provider khác")
                break

        if last_error:
            logger.warning("OSRM Routes fallback: %s", last_error)
        
        fallback_res = self.fallback.calculate_route(origin, destination)
        self._cache[cache_key] = fallback_res
        return fallback_res

    def _request_osrm_route(
        self,
        origin: PlaceCandidate,
        destination: PlaceCandidate,
    ) -> RouteSegment:
        # Format OSRM: lon,lat
        url = f"{self.base_url}/route/v1/driving/{origin.longitude},{origin.latitude};{destination.longitude},{destination.latitude}?overview=false"

        response = self._http_client.get(url)
        response.raise_for_status()

        data = response.json()
        if data.get("code") != "Ok":
            raise RuntimeError(f"OSRM returned code: {data.get('code')}")

        routes = data.get("routes") or []
        if not routes:
            raise RuntimeError("OSRM empty result")

        route = routes[0]
        meters = float(route.get("distance") or 0)
        seconds = int(float(route.get("duration") or 0))

        return RouteSegment(
            from_place_id=origin.place_id,
            to_place_id=destination.place_id,
            distance_km=round(meters / 1000.0, 2),
            duration_minutes=(
                max(0, int(math.ceil(seconds / 60)))
                if seconds
                else estimate_duration_minutes(meters / 1000.0)
            ),
            provenance=Provenance(
                source="OSRM",
                source_id=f"{origin.place_id}->{destination.place_id}",
                retrieved_at=utc_now_iso(),
                is_estimate=False,
            ),
        )

    def calculate_matrix(self, places: Sequence[PlaceCandidate]) -> Dict[str, Dict[str, RouteSegment]]:
        if not places:
            return {}
            
        MAX_OSRM_TABLE_LOCATIONS = 100
        if len(places) > MAX_OSRM_TABLE_LOCATIONS:
            logger.warning(f"OSRM Table size {len(places)} exceeds limit {MAX_OSRM_TABLE_LOCATIONS}. Fallback to Haversine matrix.")
            return self.fallback.calculate_matrix(places)
            
        coords = ";".join([f"{p.longitude},{p.latitude}" for p in places])
        url = f"{self.base_url}/table/v1/driving/{coords}?annotations=distance,duration"

        last_error = None
        for attempt in range(2):
            try:
                response = self._http_client.get(url)
                response.raise_for_status()
                data = response.json()
                if data.get("code") != "Ok":
                    raise RuntimeError(f"OSRM returned code: {data.get('code')}")

                durations = data.get("durations", [])
                distances = data.get("distances", [])
                
                matrix = {}
                for i, p1 in enumerate(places):
                    matrix[p1.place_id] = {}
                    for j, p2 in enumerate(places):
                        if i == j:
                            matrix[p1.place_id][p2.place_id] = RouteSegment(
                                from_place_id=p1.place_id,
                                to_place_id=p2.place_id,
                                distance_km=0,
                                duration_minutes=0,
                                provenance=Provenance(source="SAME_LOCATION", retrieved_at=utc_now_iso(), is_estimate=False)
                            )
                            continue
                            
                        dist_raw = distances[i][j] if distances and i < len(distances) and j < len(distances[i]) else None
                        dur_raw = durations[i][j] if durations and i < len(durations) and j < len(durations[i]) else None
                        
                        if dist_raw is None or dur_raw is None:
                            seg = self.fallback.calculate_route(p1, p2)
                        else:
                            meters = float(dist_raw)
                            seconds = int(float(dur_raw))
                            
                            seg = RouteSegment(
                                from_place_id=p1.place_id,
                                to_place_id=p2.place_id,
                                distance_km=round(meters / 1000.0, 2),
                                duration_minutes=(
                                    max(0, int(math.ceil(seconds / 60)))
                                    if seconds
                                    else estimate_duration_minutes(meters / 1000.0)
                                ),
                                provenance=Provenance(
                                    source="OSRM_TABLE",
                                    source_id=f"{p1.place_id}->{p2.place_id}",
                                    retrieved_at=utc_now_iso(),
                                    is_estimate=False,
                                )
                            )
                        matrix[p1.place_id][p2.place_id] = seg
                        self._cache[f"{p1.place_id}->{p2.place_id}"] = seg
                        
                return matrix
                
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code < 500:
                    last_error = exc
                    break
                last_error = exc
                time.sleep(0.15)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                logger.warning("OSRM Table timeout/transport, attempt=%s/2", attempt + 1)
                time.sleep(0.15)
            except Exception as exc:
                last_error = exc
                logger.exception("OSRM Table error")
                break
                
        logger.warning("OSRM Table fallback: %s. Using fallback.calculate_matrix.", last_error)
        return self.fallback.calculate_matrix(places)


_default_routes_provider: Optional[RouteProvider] = None

def get_default_routes_provider() -> RouteProvider:
    global _default_routes_provider
    if _default_routes_provider is None:
        # OSRM is primary, fallback to Haversine (bypassing Google to save quota)
        _default_routes_provider = OSRMRoutesProvider(fallback_provider=HaversineRouteProvider())
    return _default_routes_provider


def calculate_route(
    origin: PlaceCandidate,
    destination: PlaceCandidate,
    provider: Optional[RouteProvider] = None,
) -> RouteSegment:
    return (provider or get_default_routes_provider()).calculate_route(origin, destination)


def calculate_route_segments(
    places: Sequence[PlaceCandidate],
    provider: Optional[RouteProvider] = None,
) -> List[RouteSegment]:
    return (provider or get_default_routes_provider()).calculate_route_segments(places)
