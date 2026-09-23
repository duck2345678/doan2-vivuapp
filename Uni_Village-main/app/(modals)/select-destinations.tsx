import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { SelectDestinationsScreen } from '@/features/itinerary';

export default function SelectDestinationsRoute() {
    const params = useLocalSearchParams<{
        tripName?: string;
        startDate?: string;
        startTime?: string;
        categories?: string;
        tripId?: string;
        existingDestinations?: string;
        isAddingToExisting?: string;
    }>();

    const tripData = params.tripName ? {
        tripName: params.tripName,
        startDate: params.startDate ? new Date(params.startDate) : new Date(),
        startTime: params.startTime ? new Date(params.startTime) : new Date(),
        categories: params.categories ? params.categories.split(',') : [],
    } : undefined;

    // Parse existing destinations if adding to existing trip
    const existingDestinations = params.existingDestinations 
        ? JSON.parse(params.existingDestinations) 
        : undefined;

    return (
        <SelectDestinationsScreen 
            tripData={tripData} 
            tripId={params.tripId}
            existingDestinations={existingDestinations}
            isAddingToExisting={params.isAddingToExisting === 'true'}
        />
    );
}
