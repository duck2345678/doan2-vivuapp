export type ItineraryStatus = "ongoing" | "upcoming" | "past";

// ============================================
// Backend API Types (matching Java DTOs)
// ============================================

export enum TourStatus {
  SCHEDULED = "SCHEDULED", // upcoming
  ONGOING = "ONGOING", // ongoing
  COMPLETED = "COMPLETED", // past
  CANCELLED = "CANCELLED",
}

export interface TourStopResponse {
  id: number;
  tourId: number;
  placeId: number;
  placeName: string;
  sequenceOrder: number;
  note?: string;
  // Place details (from PlaceResponse)
  place?: {
    id: number;
    googlePlaceId?: string;
    name: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    addressDetail?: string;
  };
}

export interface TourResponse {
  id: number;
  userId: number;
  userName?: string;
  name: string; // Backend uses 'name' instead of 'tourName'
  description?: string;
  startDate: string; // ISO datetime
  startTime: string; // ISO datetime
  endTime?: string;
  status: TourStatus;
  sharedAsPost?: boolean;
  originalTourId?: number;
  stops: TourStopResponse[];
  staticMapUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TourRequest {
  name: string; // Backend uses 'name' instead of 'tourName'
  description?: string;
  startDate: string; // ISO datetime
  startTime: string; // ISO datetime
  endTime?: string;
  stops?: TourStopRequest[]; // Optional stops with database Place IDs
  googlePlaceStops?: TourStopWithGooglePlaceRequest[]; // Stops from Google Maps
}

export interface TourStopRequest {
  placeId: number;
  sequenceOrder?: number;
  note?: string;
}

/**
 * Request for creating TourStop with Google Place data
 */
export interface TourStopWithGooglePlaceRequest {
  googlePlaceId: string;
  placeName: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  sequenceOrder?: number;
  note?: string;
}

export interface CheckInRequest {
  placeId: number;
  tourId?: number;
  tourStopId?: number;
}

export interface CheckInResponse {
  id: number;
  userId: number;
  placeId: number;
  placeName: string;
  tourId?: number;
  tourStopId?: number;
  checkedInAt: string;
}

// AI Itinerary Types
export interface ItinerarySuggestRequest {
  mood: string;
  budget: string;
  startLocation: {
    lat: number;
    lng: number;
  };
  maxDistance?: number;
  categories?: string[];
}

export interface SuggestedItineraryStop {
  placeId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  lat: number;
  lng: number;
  order: number;
  aiReason?: string;
}

export interface SuggestedItinerary {
  mood: string;
  stops: SuggestedItineraryStop[];
  totalDistance: number;
  estimatedDuration: number;
}

// ============================================
// Frontend Types (for local state)
// ============================================

/**
 * Represents a stop/destination within an itinerary
 */
export interface ItineraryStop {
  id: string;
  name: string;
  /** Google Place ID for matching with map places */
  googlePlaceId?: string;
  /** Duration in minutes at this stop */
  durationMinutes: number;
  /** Optional image URL for the stop */
  imageUrl?: string;
  /** Order in the itinerary */
  order: number;
  /** Latitude */
  lat?: number;
  /** Longitude */
  lng?: number;
  /** Address */
  address?: string;
}

export interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  status: ItineraryStatus;
  locations?: string[];
  note?: string;
  /** User-uploaded cover image URL (optional, defaults to first stop's image) */
  coverImageUrl?: string;
  /** Stops/destinations in the itinerary */
  stops?: ItineraryStop[];
}

/**
 * Helper to get the cover image for an itinerary
 * Priority: coverImageUrl > first stop's image > default placeholder
 */
export function getItineraryCoverImage(itinerary: Itinerary): string {
  if (itinerary.coverImageUrl) {
    return itinerary.coverImageUrl;
  }
  if (itinerary.stops?.[0]?.imageUrl) {
    return itinerary.stops[0].imageUrl;
  }
  // Default placeholder
  return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop";
}

/**
 * Calculate total duration from stops (in hours)
 * Returns null if no stops available
 */
export function calculateItineraryDuration(
  itinerary: Itinerary,
): number | null {
  if (!itinerary.stops || itinerary.stops.length === 0) {
    return null;
  }
  const totalMinutes = itinerary.stops.reduce(
    (sum, stop) => sum + stop.durationMinutes,
    0,
  );
  return Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal
}

/**
 * Get destinations count from stops or locations
 */
export function getItineraryDestinationsCount(itinerary: Itinerary): number {
  return itinerary.stops?.length ?? itinerary.locations?.length ?? 0;
}

export interface ItineraryShareStop {
  id: string;
  time: string;
  name: string;
  address: string;
  note?: string;
  order: number;
  thumbnail?: string;
}

export interface ItineraryShareData {
  id: string;
  dayLabel: string;
  date: string;
  stopsCount: number;
  timeRange: string;
  tags: string[];
  stops: ItineraryShareStop[];
  /** Original trip data for "Sử dụng chuyến đi" feature */
  originalTripData?: any;
}
