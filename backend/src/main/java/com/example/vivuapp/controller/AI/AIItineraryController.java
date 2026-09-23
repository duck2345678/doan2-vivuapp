package com.example.vivuapp.controller.AI;

import com.example.vivuapp.dto.reponse.AI.SuggestedItinerary;
import com.example.vivuapp.dto.request.AI.ItinerarySuggestRequest;
import com.example.vivuapp.service.AI.AIItineraryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for AI-powered itinerary features.
 * Endpoint: POST /ai/itineraries/suggest
 */
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AI Itinerary", description = "AI-powered travel itinerary generation")
public class AIItineraryController {

    AIItineraryService aiItineraryService;

    /**
     * Generate AI-powered itinerary suggestions based on user preferences.
     * 
     * Flow:
     * 1. Fetches candidate places from Google Places API
     * 2. Uses AI (Gemini) to score and select best places for the mood
     * 3. Optimizes route order using Google Routes API
     * 4. Returns structured itinerary with stops, timing, and map preview
     *
     * @param request user preferences including mood, location, and constraints
     * @return suggested itinerary with optimized route
     */
    @PostMapping("/itineraries/suggest")
    @Operation(summary = "Generate AI itinerary suggestion", description = "Creates a personalized travel itinerary based on mood and preferences")
    public ResponseEntity<SuggestedItinerary> suggestItinerary(
            @RequestBody ItinerarySuggestRequest request) {

        SuggestedItinerary suggestion = aiItineraryService.suggestItinerary(request);
        return ResponseEntity.ok(suggestion);
    }
}
