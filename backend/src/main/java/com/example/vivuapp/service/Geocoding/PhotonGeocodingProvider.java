package com.example.vivuapp.service.Geocoding;

import com.example.vivuapp.dto.Geocoding.GeocodingResult;
import com.example.vivuapp.exception.GeocodingProviderException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class PhotonGeocodingProvider implements GeocodingProvider {

    private final RestTemplate restTemplate;

    @Value("${geocoding.photon.url:https://photon.komoot.io/api}")
    private String photonUrl;

    @Value("${geocoding.photon.reverse-url:https://photon.komoot.io/reverse}")
    private String photonReverseUrl;

    public PhotonGeocodingProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public List<GeocodingResult> search(String query, int limit, String lang, Double lat, Double lon) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(photonUrl)
                    .queryParam("q", query)
                    .queryParam("limit", limit);

            if (lang != null && !lang.isEmpty()) {
                builder.queryParam("lang", lang);
            }
            if (lat != null && lon != null) {
                builder.queryParam("lat", lat)
                        .queryParam("lon", lon);
            }

            return fetchAndParse(builder.toUriString());
        } catch (GeocodingProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling Photon Geocoding API: {}", e.getMessage());
            throw new GeocodingProviderException("Error calling Geocoding API", e);
        }
    }

    @Override
    public List<GeocodingResult> reverse(double lat, double lon, String lang) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(photonReverseUrl)
                    .queryParam("lat", lat)
                    .queryParam("lon", lon);

            if (lang != null && !lang.isEmpty()) {
                builder.queryParam("lang", lang);
            }

            return fetchAndParse(builder.toUriString());
        } catch (GeocodingProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling Photon Reverse Geocoding API: {}", e.getMessage());
            throw new GeocodingProviderException("Error calling Reverse Geocoding API", e);
        }
    }

    private List<GeocodingResult> fetchAndParse(String url) {
        List<GeocodingResult> results = new ArrayList<>();
        try {
            log.info("Calling Photon API: {}", url);
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode features = response.getBody().get("features");
                if (features != null && features.isArray()) {
                    for (JsonNode feature : features) {
                        GeocodingResult parsedFeature = parseFeature(feature);
                        if (parsedFeature != null) {
                            results.add(parsedFeature);
                        }
                    }
                }
            }
        } catch (GeocodingProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse Photon response: {}", e.getMessage());
            throw new GeocodingProviderException("Failed to parse Photon response", e);
        }
        return results;
    }

    private GeocodingResult parseFeature(JsonNode feature) {
        if (feature == null || feature.isMissingNode() || !feature.isObject()) {
            return null;
        }

        JsonNode geometry = feature.path("geometry");
        JsonNode coordinates = geometry.path("coordinates");

        if (!"Point".equals(geometry.path("type").asText())
                || !coordinates.isArray()
                || coordinates.size() < 2
                || !coordinates.get(0).isNumber()
                || !coordinates.get(1).isNumber()) {
            return null;
        }

        double longitude = coordinates.get(0).asDouble();
        double latitude = coordinates.get(1).asDouble();

        if (!Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90
                || latitude > 90
                || longitude < -180
                || longitude > 180) {
            return null;
        }

        JsonNode properties = feature.path("properties");

        if (properties.isMissingNode() || !properties.isObject()) {
            return null;
        }

        String name = textOrNull(properties, "name");
        String street = textOrNull(properties, "street");
        String housenumber = textOrNull(properties, "housenumber");
        String city = textOrNull(properties, "city");
        String state = textOrNull(properties, "state");
        String country = textOrNull(properties, "country");
        String osmId = textOrNull(properties, "osm_id");

        StringBuilder displayName = new StringBuilder();

        if (name != null) {
            displayName.append(name);
        }

        String streetAddress = null;

        if (street != null) {
            streetAddress = housenumber != null
                    ? housenumber + " " + street
                    : street;
        }

        if (streetAddress != null && !streetAddress.equals(name)) {
            if (displayName.length() > 0) {
                displayName.append(", ");
            }
            displayName.append(streetAddress);
        }

        if (city != null && !city.equals(name)) {
            if (displayName.length() > 0) {
                displayName.append(", ");
            }
            displayName.append(city);
        }

        if (state != null && !state.equals(city)) {
            if (displayName.length() > 0) {
                displayName.append(", ");
            }
            displayName.append(state);
        }

        if (country != null) {
            if (displayName.length() > 0) {
                displayName.append(", ");
            }
            displayName.append(country);
        }

        if (displayName.isEmpty()) {
            return null;
        }

        return GeocodingResult.builder()
                .name(name)
                .displayName(displayName.toString())
                .latitude(latitude)
                .longitude(longitude)
                .city(city)
                .country(country)
                .osmId(osmId)
                .build();
    }

    private String textOrNull(JsonNode node, String field) {
        String value = node.path(field).asText(null);

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
