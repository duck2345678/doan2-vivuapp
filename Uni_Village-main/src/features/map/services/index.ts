/**
 * Map Services Index
 * 
 * Exports all map-related services for Google Maps API integration.
 */

// Google Maps Client (unified API client)
export {
    GoogleMapsClient,
    MapError, getGoogleMapsClient, resetGoogleMapsClient,
    type ClientConfig,
    type MapErrorCode
} from './GoogleMapsClient';

// Places API Service
export {
    autocomplete,
    clearPlacesCache,
    getPhotoUrl,
    getPlaceDetails,
    mapPlaceTypeToCategory,
    searchNearby,
    type AutocompleteOptions,
    type NearbyPlace,
    type NearbySearchOptions,
    type PlaceDetails,
    type PlacePhoto,
    type PlacePrediction
} from './placesService';

// Geocoding API Service
export {
    clearGeocodingCache,
    geocode,
    geocodeFirst,
    getReadableAddress,
    parseAddressComponents,
    reverseGeocode,
    reverseGeocodeFirst,
    type AddressComponent,
    type GeocodeOptions,
    type GeocodingResult,
    type ReverseGeocodeOptions,
    type StructuredAddress
} from './geocodingService';

// Distance Matrix API Service
export {
    clearDistanceCache,
    findNearest,
    formatDistanceText,
    formatDuration,
    getDistance,
    getDistanceMatrix,
    getDistancesFromOrigin,
    sortByDistance,
    type DistanceMatrixElement,
    type DistanceMatrixLocation,
    type DistanceMatrixOptions,
    type DistanceMatrixResult,
    type DistanceMatrixRow,
    type TravelMode
} from './distanceMatrixService';

// Offline Cache Service
export {
    cacheNearbyPlaces, cachePlaceDetails, cleanupExpiredCache, clearMapCache,
    getCacheStats, getCachedNearbyPlaces,
    getCachedPlaceDetails
} from './placesCacheService';

