import * as itineraryApi from "../api";
import type { Itinerary, TourResponse } from "../types/itinerary.types";
import { TourStatus } from "../types/itinerary.types";

/**
 * Itinerary Service - Business logic layer
 * Maps backend responses to frontend types
 */

/**
 * Map backend TourStatus to frontend ItineraryStatus
 */
function mapTourStatusToItineraryStatus(
  status: TourStatus,
): "ongoing" | "upcoming" | "past" {
  switch (status) {
    case TourStatus.ONGOING:
      return "ongoing";
    case TourStatus.SCHEDULED:
      return "upcoming";
    case TourStatus.COMPLETED:
    case TourStatus.CANCELLED:
      return "past";
    default:
      return "upcoming";
  }
}

/**
 * Map backend TourResponse to frontend Itinerary
 */
function mapTourToItinerary(tour: TourResponse): Itinerary {
  const stops = tour.stops || []; // Handle null/undefined stops
  return {
    id: tour.id.toString(),
    title: tour.name, // Backend uses 'name' instead of 'tourName'
    startDate: tour.startDate,
    endDate: tour.status === TourStatus.COMPLETED ? tour.updatedAt : undefined,
    status: mapTourStatusToItineraryStatus(tour.status),
    locations: stops.map((stop) => stop.placeName),
    coverImageUrl: stops[0]?.place?.imageUrl,
    stops: stops.map((stop) => ({
      id: stop.id.toString(),
      name: stop.placeName,
      googlePlaceId: stop.place?.googlePlaceId,
      durationMinutes: 60, // Default 1 hour, adjust as needed
      imageUrl: stop.place?.imageUrl,
      order: stop.sequenceOrder,
      lat: stop.place?.latitude,
      lng: stop.place?.longitude,
      address: stop.place?.addressDetail,
    })),
  };
}

/**
 * Fetch user's itineraries with optional status filter
 * Note: The list API doesn't return full stop details, so we fetch each tour by ID
 */
export async function fetchItineraries(
  status?: "ongoing" | "upcoming" | "past",
): Promise<Itinerary[]> {
  try {
    // Map frontend status to backend status
    let backendStatus: TourStatus | undefined;
    if (status === "ongoing") backendStatus = TourStatus.ONGOING;
    else if (status === "upcoming") backendStatus = TourStatus.SCHEDULED;
    else if (status === "past") backendStatus = TourStatus.COMPLETED;

    const result = await itineraryApi.getMyTours(backendStatus, 0, 50);
    
    // The list API doesn't return full stop details, so fetch each tour by ID
    // Use Promise.all for parallel fetching to improve performance
    const toursWithDetails = await Promise.all(
      result.content.map(async (tour) => {
        try {
          const fullTour = await itineraryApi.getTourById(tour.id);
          return fullTour;
        } catch (error) {
          // If fetching details fails, use the basic tour data
          console.warn(`Failed to fetch details for tour ${tour.id}:`, error);
          return tour;
        }
      })
    );
    
    return toursWithDetails.map(mapTourToItinerary);
  } catch (error) {
    console.error("Failed to fetch itineraries:", error);
    return [];
  }
}

/**
 * Get current ongoing itinerary
 */
export async function getCurrentItinerary(): Promise<Itinerary | null> {
  try {
    const tour = await itineraryApi.getCurrentTour();
    return tour ? mapTourToItinerary(tour) : null;
  } catch (error) {
    console.error("Failed to fetch current itinerary:", error);
    return null;
  }
}

/**
 * Get itinerary details by ID
 */
export async function getItineraryById(id: string): Promise<Itinerary | null> {
  try {
    const tour = await itineraryApi.getTourById(parseInt(id));
    return mapTourToItinerary(tour);
  } catch (error) {
    console.error("Failed to fetch itinerary:", error);
    return null;
  }
}

/**
 * Create a new itinerary
 */
export async function createItinerary(data: {
  name: string;
  description?: string;
  startDate: Date;
  startTime: Date;
  endTime?: Date;
  stops?: Array<{
    placeId: number;
    sequenceOrder?: number;
    note?: string;
  }>;
  googlePlaceStops?: Array<{
    googlePlaceId: string;
    placeName: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    sequenceOrder?: number;
    note?: string;
  }>;
}): Promise<Itinerary> {
  const tour = await itineraryApi.createTour({
    name: data.name,
    description: data.description,
    startDate: data.startDate.toISOString(),
    startTime: data.startTime.toISOString(),
    endTime: data.endTime?.toISOString(),
    stops: data.stops,
    googlePlaceStops: data.googlePlaceStops,
  });
  return mapTourToItinerary(tour);
}

/**
 * Update an itinerary
 */
export async function updateItinerary(
  id: string,
  data: {
    name?: string;
    description?: string;
    startDate?: Date;
    startTime?: Date;
    endTime?: Date;
    googlePlaceStops?: Array<{
      googlePlaceId: string;
      placeName: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      imageUrl?: string;
      sequenceOrder?: number;
      note?: string;
    }>;
  },
): Promise<Itinerary> {
  const tour = await itineraryApi.updateTour(parseInt(id), {
    name: data.name,
    description: data.description,
    startDate: data.startDate?.toISOString(),
    startTime: data.startTime?.toISOString(),
    endTime: data.endTime?.toISOString(),
    googlePlaceStops: data.googlePlaceStops,
  });
  return mapTourToItinerary(tour);
}

/**
 * Complete an itinerary
 */
export async function completeItinerary(id: string): Promise<Itinerary> {
  const tour = await itineraryApi.completeTour(parseInt(id));
  return mapTourToItinerary(tour);
}

/**
 * Start an itinerary (change status to ONGOING)
 */
export async function startItinerary(id: string): Promise<Itinerary> {
  const tour = await itineraryApi.startTour(parseInt(id));
  return mapTourToItinerary(tour);
}

/**
 * Copy/reuse an itinerary
 */
export async function copyItinerary(id: string): Promise<Itinerary> {
  const tour = await itineraryApi.copyTour(parseInt(id));
  return mapTourToItinerary(tour);
}

/**
 * Check in at a destination
 */
export async function checkInAtDestination(
  placeId: number,
  tourId?: number,
  tourStopId?: number,
) {
  return await itineraryApi.checkIn({
    placeId,
    tourId,
    tourStopId,
  });
}

/**
 * Get AI itinerary suggestions
 */
export async function getAISuggestions(data: {
  mood: string;
  budget: string;
  location: { lat: number; lng: number };
}) {
  return await itineraryApi.suggestItinerary({
    mood: data.mood,
    budget: data.budget,
    startLocation: data.location,
  });
}
