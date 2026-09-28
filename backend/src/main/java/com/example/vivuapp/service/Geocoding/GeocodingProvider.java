package com.example.vivuapp.service.Geocoding;

import com.example.vivuapp.dto.Geocoding.GeocodingResult;

import java.util.List;

public interface GeocodingProvider {
    /**
     * Search for places by text query (autocomplete)
     * @param query the search query
     * @param limit maximum number of results
     * @param lang language code (e.g. "vi", "en")
     * @param lat optional latitude for location bias
     * @param lon optional longitude for location bias
     * @return List of normalized geocoding results
     */
    List<GeocodingResult> search(String query, int limit, String lang, Double lat, Double lon);

    /**
     * Reverse geocoding (coordinates to address)
     * @param lat latitude
     * @param lon longitude
     * @param lang language code
     * @return List of normalized geocoding results (usually just 1 result)
     */
    List<GeocodingResult> reverse(double lat, double lon, String lang);
}
