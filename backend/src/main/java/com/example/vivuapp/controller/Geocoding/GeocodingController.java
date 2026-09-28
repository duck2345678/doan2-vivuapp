package com.example.vivuapp.controller.Geocoding;

import com.example.vivuapp.dto.Geocoding.GeocodingResponse;
import com.example.vivuapp.dto.Geocoding.GeocodingResult;
import com.example.vivuapp.service.Geocoding.GeocodingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/geocoding")
@RequiredArgsConstructor
public class GeocodingController {

    private final GeocodingService geocodingService;

    @GetMapping("/search")
    public ResponseEntity<GeocodingResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = false) String lang,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon
    ) {
        String normalizedQuery = q != null ? q.trim() : "";
        if (normalizedQuery.length() < 2) {
            return ResponseEntity.badRequest().build();
        }
        
        if ((lat != null && lon == null) || (lat == null && lon != null)) {
            return ResponseEntity.badRequest().build();
        }
        
        if (lat != null && lon != null) {
            if (!Double.isFinite(lat) || !Double.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                return ResponseEntity.badRequest().build();
            }
        }
        
        int safeLimit = Math.min(Math.max(limit, 1), 10);
        List<GeocodingResult> results = geocodingService.search(normalizedQuery, safeLimit, lang, lat, lon);
        return ResponseEntity.ok(GeocodingResponse.builder().results(results).build());
    }

    @GetMapping("/reverse")
    public ResponseEntity<GeocodingResponse> reverse(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(required = false) String lang
    ) {
        if (!Double.isFinite(lat) || !Double.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return ResponseEntity.badRequest().build();
        }
        
        List<GeocodingResult> results = geocodingService.reverse(lat, lon, lang);
        return ResponseEntity.ok(GeocodingResponse.builder().results(results).build());
    }
}
