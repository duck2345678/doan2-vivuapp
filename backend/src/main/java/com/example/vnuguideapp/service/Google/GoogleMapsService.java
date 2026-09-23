package com.example.vnuguideapp.service.Google;

import com.example.vnuguideapp.dto.reponse.Google.PlaceSearchResult;
import com.example.vnuguideapp.dto.reponse.Google.RouteResult;
import com.example.vnuguideapp.dto.request.Google.NearbySearchRequest;
import com.example.vnuguideapp.entity.TourAndCheckInAndItinerary.TourStop;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for integrating with Google Maps Platform APIs.
 * Handles Places API (New), Routes API, Geocoding API, and Maps Static API.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class GoogleMapsService {

    final RestTemplate restTemplate;
    final ObjectMapper objectMapper;

    @Value("${google.maps.api-key}")
    String apiKey;

    @Value("${google.places.api-key:${google.maps.api-key}}")
    String placesApiKey;

    @Value("${google.routes.api-key:${google.maps.api-key}}")
    String routesApiKey;

    private static final String PLACES_BASE_URL = "https://places.googleapis.com/v1/places";
    private static final String ROUTES_BASE_URL = "https://routes.googleapis.com";
    private static final String STATIC_MAP_BASE_URL = "https://maps.googleapis.com/maps/api/staticmap";
    private static final String GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

    // ==================== PLACES API (NEW) ====================

    /**
     * Search for nearby places using Google Places API (New).
     *
     * @param request search parameters including location, radius, and place types
     * @return list of matching places
     */
    public List<PlaceSearchResult> searchNearbyPlaces(NearbySearchRequest request) {
        try {
            String url = PLACES_BASE_URL + ":searchNearby";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Goog-Api-Key", placesApiKey);
            headers.set("X-Goog-FieldMask",
                    "places.id,places.displayName,places.formattedAddress,places.location," +
                            "places.rating,places.userRatingCount,places.types,places.photos");

            // Build request body
            String requestBody = objectMapper.writeValueAsString(buildNearbySearchBody(request));

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, entity, JsonNode.class);

            return parseNearbySearchResponse(response.getBody());
        } catch (Exception e) {
            log.error("Failed to search nearby places: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Get detailed information about a specific place.
     *
     * @param googlePlaceId the Google Place ID
     * @return place details or null if not found
     */
    public PlaceSearchResult getPlaceDetails(String googlePlaceId) {
        try {
            String url = PLACES_BASE_URL + "/" + googlePlaceId;

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Goog-Api-Key", placesApiKey);
            headers.set("X-Goog-FieldMask",
                    "id,displayName,formattedAddress,location,rating,userRatingCount," +
                            "types,photos,regularOpeningHours,priceLevel");

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);

            return parsePlaceDetails(response.getBody());
        } catch (Exception e) {
            log.error("Failed to get place details for {}: {}", googlePlaceId, e.getMessage(), e);
            return null;
        }
    }

    // ==================== ROUTES API ====================

    /**
     * Compute route between multiple waypoints.
     *
     * @param stops list of tour stops to route between
     * @return computed route with distance, duration, and polyline
     */
    public RouteResult computeRoute(List<TourStop> stops) {
        if (stops == null || stops.size() < 2) {
            log.warn("At least 2 stops are required to compute a route");
            return null;
        }

        try {
            String url = ROUTES_BASE_URL + "/directions/v2:computeRoutes";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Goog-Api-Key", routesApiKey);
            headers.set("X-Goog-FieldMask",
                    "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs");

            String requestBody = objectMapper.writeValueAsString(buildRouteRequestBody(stops));

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, entity, JsonNode.class);

            return parseRouteResponse(response.getBody());
        } catch (Exception e) {
            log.error("Failed to compute route: {}", e.getMessage(), e);
            return null;
        }
    }

    // ==================== MAPS STATIC API ====================

    /**
     * Build a Google Maps Static API URL for a tour route.
     * This generates a static map image showing the route with markers.
     *
     * @param stops list of tour stops
     * @return URL for the static map image
     */
    public String buildStaticMapUrl(List<TourStop> stops) {
        if (stops == null || stops.isEmpty()) {
            return null;
        }

        // Sort stops by sequence order
        List<TourStop> sortedStops = stops.stream()
                .sorted((a, b) -> a.getSequenceOrder().compareTo(b.getSequenceOrder()))
                .collect(Collectors.toList());

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(STATIC_MAP_BASE_URL)
                .queryParam("size", "600x400")
                .queryParam("scale", "2") // Retina support
                .queryParam("maptype", "roadmap")
                .queryParam("key", apiKey);

        // Build path connecting all stops
        StringBuilder pathPoints = new StringBuilder("color:0x4285F4FF|weight:4");
        for (TourStop stop : sortedStops) {
            pathPoints.append("|")
                    .append(stop.getPlace().getLatitude())
                    .append(",")
                    .append(stop.getPlace().getLongitude());
        }
        builder.queryParam("path", pathPoints.toString());

        // Add markers for each stop
        for (int i = 0; i < sortedStops.size(); i++) {
            TourStop stop = sortedStops.get(i);
            String label = String.valueOf((char) ('A' + i));
            String color;

            if (i == 0) {
                color = "green"; // Start
            } else if (i == sortedStops.size() - 1) {
                color = "red"; // End
            } else {
                color = "blue"; // Intermediate
            }

            String marker = String.format("color:%s|label:%s|%f,%f",
                    color, label,
                    stop.getPlace().getLatitude(),
                    stop.getPlace().getLongitude());
            builder.queryParam("markers", marker);
        }

        return builder.build().toUriString();
    }

    // ==================== GEOCODING API ====================

    /**
     * Convert an address to geographic coordinates.
     *
     * @param address the address to geocode
     * @return coordinates [latitude, longitude] or null if not found
     */
    public double[] geocodeAddress(String address) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(GEOCODING_BASE_URL)
                    .queryParam("address", URLEncoder.encode(address, StandardCharsets.UTF_8))
                    .queryParam("key", apiKey)
                    .build()
                    .toUriString();

            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);

            JsonNode results = response.getBody().get("results");
            if (results != null && results.isArray() && results.size() > 0) {
                JsonNode location = results.get(0).get("geometry").get("location");
                return new double[] {
                        location.get("lat").asDouble(),
                        location.get("lng").asDouble()
                };
            }
        } catch (Exception e) {
            log.error("Failed to geocode address '{}': {}", address, e.getMessage(), e);
        }
        return null;
    }

    /**
     * Convert coordinates to an address (reverse geocoding).
     *
     * @param latitude  the latitude
     * @param longitude the longitude
     * @return formatted address or null if not found
     */
    public String reverseGeocode(double latitude, double longitude) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(GEOCODING_BASE_URL)
                    .queryParam("latlng", latitude + "," + longitude)
                    .queryParam("key", apiKey)
                    .build()
                    .toUriString();

            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);

            JsonNode results = response.getBody().get("results");
            if (results != null && results.isArray() && results.size() > 0) {
                return results.get(0).get("formatted_address").asText();
            }
        } catch (Exception e) {
            log.error("Failed to reverse geocode ({}, {}): {}", latitude, longitude, e.getMessage(), e);
        }
        return null;
    }

    // ==================== PRIVATE HELPERS ====================

    private Object buildNearbySearchBody(NearbySearchRequest request) {
        return java.util.Map.of(
                "includedTypes",
                request.getPlaceTypes() != null ? request.getPlaceTypes() : List.of("restaurant", "tourist_attraction"),
                "maxResultCount", request.getMaxResults() != null ? request.getMaxResults() : 20,
                "locationRestriction", java.util.Map.of(
                        "circle", java.util.Map.of(
                                "center", java.util.Map.of(
                                        "latitude", request.getLatitude(),
                                        "longitude", request.getLongitude()),
                                "radius", request.getRadiusMeters() != null ? request.getRadiusMeters() : 5000.0)));
    }

    private List<PlaceSearchResult> parseNearbySearchResponse(JsonNode response) {
        List<PlaceSearchResult> results = new ArrayList<>();
        JsonNode places = response.get("places");

        if (places != null && places.isArray()) {
            for (JsonNode place : places) {
                results.add(parsePlaceDetails(place));
            }
        }
        return results;
    }

    private PlaceSearchResult parsePlaceDetails(JsonNode place) {
        return PlaceSearchResult.builder()
                .googlePlaceId(place.has("id") ? place.get("id").asText() : null)
                .name(place.has("displayName") ? place.get("displayName").get("text").asText() : null)
                .formattedAddress(place.has("formattedAddress") ? place.get("formattedAddress").asText() : null)
                .latitude(place.has("location") ? place.get("location").get("latitude").asDouble() : null)
                .longitude(place.has("location") ? place.get("location").get("longitude").asDouble() : null)
                .rating(place.has("rating") ? place.get("rating").asDouble() : null)
                .userRatingCount(place.has("userRatingCount") ? place.get("userRatingCount").asInt() : null)
                .build();
    }

    private Object buildRouteRequestBody(List<TourStop> stops) {
        List<TourStop> sortedStops = stops.stream()
                .sorted((a, b) -> a.getSequenceOrder().compareTo(b.getSequenceOrder()))
                .collect(Collectors.toList());

        TourStop origin = sortedStops.get(0);
        TourStop destination = sortedStops.get(sortedStops.size() - 1);
        List<TourStop> intermediates = sortedStops.size() > 2 ? sortedStops.subList(1, sortedStops.size() - 1)
                : List.of();

        java.util.Map<String, Object> request = new java.util.HashMap<>();
        request.put("origin", buildWaypoint(origin));
        request.put("destination", buildWaypoint(destination));
        request.put("travelMode", "DRIVE");
        request.put("routingPreference", "TRAFFIC_AWARE");
        request.put("computeAlternativeRoutes", false);
        request.put("languageCode", "vi");

        if (!intermediates.isEmpty()) {
            request.put("intermediates", intermediates.stream()
                    .map(this::buildWaypoint)
                    .collect(Collectors.toList()));
        }

        return request;
    }

    private java.util.Map<String, Object> buildWaypoint(TourStop stop) {
        return java.util.Map.of(
                "location", java.util.Map.of(
                        "latLng", java.util.Map.of(
                                "latitude", stop.getPlace().getLatitude(),
                                "longitude", stop.getPlace().getLongitude())));
    }

    private RouteResult parseRouteResponse(JsonNode response) {
        JsonNode routes = response.get("routes");
        if (routes == null || !routes.isArray() || routes.isEmpty()) {
            return null;
        }

        JsonNode route = routes.get(0);

        RouteResult.RouteResultBuilder builder = RouteResult.builder();

        if (route.has("distanceMeters")) {
            builder.distanceMeters(route.get("distanceMeters").asInt());
        }

        if (route.has("duration")) {
            String duration = route.get("duration").asText();
            // Duration is in format "123s"
            builder.durationSeconds(Integer.parseInt(duration.replace("s", "")));
        }

        if (route.has("polyline") && route.get("polyline").has("encodedPolyline")) {
            builder.encodedPolyline(route.get("polyline").get("encodedPolyline").asText());
        }

        return builder.build();
    }
}
