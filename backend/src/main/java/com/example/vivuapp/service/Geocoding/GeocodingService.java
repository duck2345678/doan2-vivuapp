package com.example.vivuapp.service.Geocoding;

import com.example.vivuapp.dto.Geocoding.GeocodingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeocodingService {

    private final GeocodingProvider geocodingProvider;

    @Cacheable(value = "geocodingSearch", key = "#query + '-' + #limit + '-' + #lang + '-' + #lat + '-' + #lon", unless = "#result == null or #result.isEmpty()")
    public List<GeocodingResult> search(String query, int limit, String lang, Double lat, Double lon) {
        log.info("Geocoding search query: {}", query);
        return geocodingProvider.search(query, limit, lang, lat, lon);
    }

    @Cacheable(value = "geocodingReverse", key = "#lat + '-' + #lon + '-' + #lang", unless = "#result == null or #result.isEmpty()")
    public List<GeocodingResult> reverse(double lat, double lon, String lang) {
        log.info("Geocoding reverse for lat: {}, lon: {}", lat, lon);
        return geocodingProvider.reverse(lat, lon, lang);
    }
}
