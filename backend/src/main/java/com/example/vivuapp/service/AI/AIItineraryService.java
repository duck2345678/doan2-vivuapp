package com.example.vivuapp.service.AI;

import com.example.vivuapp.dto.reponse.AI.SuggestedItinerary;
import com.example.vivuapp.dto.reponse.AI.SuggestedStop;
import com.example.vivuapp.dto.reponse.Google.PlaceSearchResult;
import com.example.vivuapp.dto.reponse.Google.RouteResult;
import com.example.vivuapp.dto.request.AI.ItinerarySuggestRequest;
import com.example.vivuapp.dto.request.Google.NearbySearchRequest;
import com.example.vivuapp.entity.PlaceAndMapping.Place;
import com.example.vivuapp.entity.TourAndCheckInAndItinerary.TourStop;
import com.example.vivuapp.repository.PlaceAndMapping.PlaceRepository;
import com.example.vivuapp.service.Google.GoogleMapsService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for AI-powered itinerary suggestions.
 * Implements the flow: Input Criteria -> Places API -> Filter -> Routes API ->
 * Optimize -> Return
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class AIItineraryService {

    final GoogleMapsService googleMapsService;
    final PlaceRepository placeRepository;
    final RestTemplate restTemplate;

    @Value("${gemini.api-key:}")
    String geminiApiKey;

    @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    String geminiBaseUrl;

    @Value("${gemini.model:gemini-2.5-flash}")
    String geminiModel;

    private static final int DEFAULT_MAX_STOPS = 5;
    private static final int DEFAULT_MAX_DURATION_HOURS = 8;
    private static final double DEFAULT_RADIUS_KM = 10;
    private static final double MIN_RATING = 4.0;

    /**
     * Generate AI-powered itinerary suggestions based on user preferences.
     * 
     * Flow:
     * 1. Fetch candidate places from Google Places API
     * 2. Filter and score candidates using AI (Gemini)
     * 3. Optimize route order using Routes API
     * 4. Calculate total duration and adjust if needed
     * 5. Return structured itinerary
     *
     * @param request user preferences including mood, location, and constraints
     * @return suggested itinerary with stops, route, and timing
     */
    public SuggestedItinerary suggestItinerary(ItinerarySuggestRequest request) {
        log.info("Generating AI itinerary for mood: {}", request.getMood());

        // Step 1: Fetch candidate places from Google Places API
        List<PlaceSearchResult> candidates = fetchCandidatePlaces(request);
        log.debug("Found {} candidate places", candidates.size());

        if (candidates.isEmpty()) {
            return SuggestedItinerary.builder()
                    .name("No places found")
                    .stops(Collections.emptyList())
                    .build();
        }

        // Step 2: Score and select places using AI
        int maxStops = request.getMaxStops() != null ? request.getMaxStops() : DEFAULT_MAX_STOPS;
        List<PlaceSearchResult> selectedPlaces = scoreAndSelectPlaces(candidates, request, maxStops);
        log.debug("AI selected {} places", selectedPlaces.size());

        // Step 3: Convert to tour stops for route calculation
        List<TourStop> mockStops = createMockTourStops(selectedPlaces);

        // Step 4: Compute route using Google Routes API
        RouteResult routeResult = googleMapsService.computeRoute(mockStops);

        // Step 5: Check duration constraint and adjust if needed
        int maxDurationMinutes = (request.getMaxDurationHours() != null ? request.getMaxDurationHours()
                : DEFAULT_MAX_DURATION_HOURS) * 60;

        if (routeResult != null && routeResult.getDurationMinutes() > maxDurationMinutes) {
            // Remove stops until within duration limit
            while (selectedPlaces.size() > 2 && routeResult.getDurationMinutes() > maxDurationMinutes) {
                selectedPlaces = selectedPlaces.subList(0, selectedPlaces.size() - 1);
                mockStops = createMockTourStops(selectedPlaces);
                routeResult = googleMapsService.computeRoute(mockStops);
            }
        }

        // Step 6: Build and return the suggested itinerary
        return buildSuggestedItinerary(request.getMood(), selectedPlaces, routeResult);
    }

    /**
     * Fetch candidate places from Google Places API based on user preferences.
     */
    private List<PlaceSearchResult> fetchCandidatePlaces(ItinerarySuggestRequest request) {
        double radiusMeters = (request.getRadiusKm() != null ? request.getRadiusKm() : DEFAULT_RADIUS_KM) * 1000;

        NearbySearchRequest searchRequest = NearbySearchRequest.builder()
                .latitude(request.getStartLatitude())
                .longitude(request.getStartLongitude())
                .radiusMeters(radiusMeters)
                .placeTypes(mapMoodToPlaceTypes(request.getMood(), request.getPlaceTypes()))
                .maxResults(20)
                .build();

        List<PlaceSearchResult> results = googleMapsService.searchNearbyPlaces(searchRequest);

        // Filter by minimum rating
        return results.stream()
                .filter(p -> p.getRating() == null || p.getRating() >= MIN_RATING)
                .collect(Collectors.toList());
    }

    /**
     * Map user mood to Google Places types.
     */
    private List<String> mapMoodToPlaceTypes(String mood, List<String> userTypes) {
        if (userTypes != null && !userTypes.isEmpty()) {
            return userTypes;
        }

        if (mood == null) {
            return List.of("tourist_attraction", "restaurant", "park");
        }

        return switch (mood.toLowerCase()) {
            case "adventurous" -> List.of("park", "stadium", "amusement_park", "zoo");
            case "relaxing" -> List.of("spa", "park", "cafe", "art_gallery");
            case "cultural" -> List.of("museum", "art_gallery", "church", "library");
            case "foodie" -> List.of("restaurant", "cafe", "bakery", "bar");
            case "romantic" -> List.of("restaurant", "park", "art_gallery", "movie_theater");
            case "family" -> List.of("zoo", "amusement_park", "aquarium", "park", "museum");
            default -> List.of("tourist_attraction", "restaurant", "park");
        };
    }

    /**
     * Use AI (Gemini) to score and select the best places based on mood.
     */
    private List<PlaceSearchResult> scoreAndSelectPlaces(
            List<PlaceSearchResult> candidates,
            ItinerarySuggestRequest request,
            int maxStops) {

        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            // Fallback: sort by rating if no AI available
            log.warn("Gemini API key not configured, using rating-based sorting");
            return candidates.stream()
                    .sorted((a, b) -> {
                        double ratingA = a.getRating() != null ? a.getRating() : 0;
                        double ratingB = b.getRating() != null ? b.getRating() : 0;
                        return Double.compare(ratingB, ratingA);
                    })
                    .limit(maxStops)
                    .collect(Collectors.toList());
        }

        try {
            // Build prompt for Gemini with full context
            String prompt = buildAIPrompt(candidates, request, maxStops);

            // Call Gemini API
            List<Integer> selectedIndices = callGeminiForSelection(prompt, candidates.size(), maxStops);

            // Return selected places in order
            return selectedIndices.stream()
                    .filter(i -> i >= 0 && i < candidates.size())
                    .map(candidates::get)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("AI selection failed, falling back to rating sort: {}", e.getMessage());
            return candidates.stream()
                    .sorted((a, b) -> Double.compare(
                            b.getRating() != null ? b.getRating() : 0,
                            a.getRating() != null ? a.getRating() : 0))
                    .limit(maxStops)
                    .collect(Collectors.toList());
        }
    }

    private String buildAIPrompt(List<PlaceSearchResult> candidates, ItinerarySuggestRequest request, int maxStops) {
        StringBuilder sb = new StringBuilder();

        String mood = request.getMood() != null ? request.getMood() : "general";
        String timeSlot = request.getTimeSlot() != null ? request.getTimeSlot() : "afternoon";
        String groupSize = request.getGroupSize() != null ? request.getGroupSize() : "couple";
        String budget = request.getBudget() != null ? request.getBudget() : "low";
        String transport = request.getTransport() != null ? request.getTransport() : "motorbike";

        sb.append("You are a travel expert helping to plan itineraries in Saigon, Vietnam.\n\n");
        sb.append("User preferences:\n");
        sb.append("- Mood/Purpose: ").append(mood).append("\n");
        sb.append("- Time slot: ").append(getTimeSlotDescription(timeSlot)).append("\n");
        sb.append("- Group size: ").append(getGroupSizeDescription(groupSize)).append("\n");
        sb.append("- Budget: ").append(budget.equals("high") ? "higher budget" : "student budget").append("\n");
        sb.append("- Transport: ").append(transport.equals("walking-bus") ? "walking/bus" : "motorbike").append("\n\n");

        sb.append("Select the best ").append(maxStops)
                .append(" places from the following list. Consider:\n");
        sb.append("- Places suitable for the time slot (e.g., cafes for morning, restaurants for evening)\n");
        sb.append("- Venues with appropriate capacity for the group size\n");
        sb.append("- Price range matching the budget\n");
        sb.append("- Distance appropriate for the transport mode\n\n");

        sb.append("Return ONLY the indices (0-based) of the selected places, ");
        sb.append("separated by commas, in the optimal visiting order.\n\nPlaces:\n");

        for (int i = 0; i < candidates.size(); i++) {
            PlaceSearchResult p = candidates.get(i);
            sb.append(i).append(". ").append(p.getName())
                    .append(" (Rating: ").append(p.getRating() != null ? p.getRating() : "N/A")
                    .append(", Reviews: ").append(p.getUserRatingCount() != null ? p.getUserRatingCount() : "N/A")
                    .append(")\n");
        }

        sb.append("\nRespond with ONLY comma-separated indices, no explanation.");
        return sb.toString();
    }

    private String getTimeSlotDescription(String timeSlot) {
        return switch (timeSlot) {
            case "morning" -> "morning (7:00-11:00), prefers breakfast/cafe spots";
            case "afternoon" -> "afternoon (13:00-17:00), good for sightseeing";
            case "evening" -> "evening (18:00-22:00), prefers restaurants/bars with nice ambiance";
            case "fullday" -> "full day trip, needs variety";
            default -> "afternoon";
        };
    }

    private String getGroupSizeDescription(String groupSize) {
        return switch (groupSize) {
            case "solo" -> "solo traveler, prefers quiet spots with single seating";
            case "couple" -> "couple, prefers romantic and private venues";
            case "small-group" -> "small group (3-5 people), needs group-friendly seating";
            case "large-group" -> "large group (6+), needs spacious venues";
            default -> "couple";
        };
    }

    private List<Integer> callGeminiForSelection(String prompt, int totalPlaces, int maxStops) {
        String url = geminiBaseUrl + "/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt)))));

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

            // Parse response to extract indices
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    String text = (String) parts.get(0).get("text");

                    return Arrays.stream(text.split(","))
                            .map(String::trim)
                            .filter(s -> s.matches("\\d+"))
                            .map(Integer::parseInt)
                            .filter(i -> i >= 0 && i < totalPlaces)
                            .limit(maxStops)
                            .collect(Collectors.toList());
                }
            }
        } catch (Exception e) {
            log.error("Gemini API call failed: {}", e.getMessage());
        }

        // Fallback: return first N indices
        return java.util.stream.IntStream.range(0, Math.min(maxStops, totalPlaces))
                .boxed()
                .collect(Collectors.toList());
    }

    /**
     * Create mock TourStop objects for route calculation.
     */
    private List<TourStop> createMockTourStops(List<PlaceSearchResult> places) {
        List<TourStop> stops = new ArrayList<>();

        for (int i = 0; i < places.size(); i++) {
            PlaceSearchResult p = places.get(i);

            // Create or get existing Place entity
            Place place = Place.builder()
                    .name(p.getName())
                    .latitude(p.getLatitude())
                    .longitude(p.getLongitude())
                    .build();

            TourStop stop = TourStop.builder()
                    .place(place)
                    .sequenceOrder(i + 1)
                    .build();

            stops.add(stop);
        }

        return stops;
    }

    /**
     * Build the final suggested itinerary response.
     */
    private SuggestedItinerary buildSuggestedItinerary(
            String mood,
            List<PlaceSearchResult> places,
            RouteResult routeResult) {

        List<SuggestedStop> stops = new ArrayList<>();

        for (int i = 0; i < places.size(); i++) {
            PlaceSearchResult p = places.get(i);
            stops.add(SuggestedStop.builder()
                    .sequenceOrder(i + 1)
                    .googlePlaceId(p.getGooglePlaceId())
                    .placeName(p.getName())
                    .address(p.getFormattedAddress())
                    .latitude(p.getLatitude())
                    .longitude(p.getLongitude())
                    .rating(p.getRating())
                    .suggestedDurationMinutes(60) // Default 1 hour per stop
                    .build());
        }

        return SuggestedItinerary.builder()
                .name("AI-Generated: " + (mood != null ? mood : "Custom") + " Adventure")
                .mood(mood)
                .stops(stops)
                .totalDistanceKm(routeResult != null ? routeResult.getDistanceKm() : null)
                .totalDurationMinutes(routeResult != null ? routeResult.getDurationMinutes() : null)
                .routePolyline(routeResult != null ? routeResult.getEncodedPolyline() : null)
                .mapPreviewUrl(routeResult != null ? buildMapPreviewUrl(places) : null)
                .build();
    }

    private String buildMapPreviewUrl(List<PlaceSearchResult> places) {
        // Build a simplified static map URL for preview
        StringBuilder url = new StringBuilder("https://maps.googleapis.com/maps/api/staticmap?size=400x300&scale=2");

        for (int i = 0; i < places.size(); i++) {
            PlaceSearchResult p = places.get(i);
            String label = String.valueOf((char) ('A' + i));
            url.append("&markers=label:").append(label)
                    .append("|").append(p.getLatitude())
                    .append(",").append(p.getLongitude());
        }

        // Note: API key would be added by the frontend or via server-side proxy
        return url.toString();
    }
}
