import { useEffect, useState } from 'react';

import { fetchItineraries } from '../services/itineraryService';
import type { Itinerary } from '../types/itinerary.types';

export function useItineraries() {
    const [data, setData] = useState<Itinerary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchItineraries();
            setData(res);
        } catch (err) {
            setError((err as Error).message ?? 'Failed to load itineraries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return { itineraries: data, loading, error, reload: load };
}
