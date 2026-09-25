import type { Destination, ItineraryResponse } from '@/lib/ai/geminiService';
import type { AIPlanGenerateResult } from './ai-plan.api';

type Candidate = {
  place_id: string;
  name: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number | null;
};

type TimeSlot = {
  start_time?: string;
  end_time?: string;
  place_id?: string;
  place_name?: string;
  activity_description?: string;
  slot_type?: string;
};

type Day = {
  day_number?: number;
  date_label?: string | null;
  time_slots?: TimeSlot[];
};

function minutesBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return undefined;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : undefined;
}

function asCandidate(value: unknown): Candidate | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Candidate>;
  if (!candidate.place_id || !candidate.name) return null;
  return candidate as Candidate;
}

export function adaptPythonPlanToLegacyItinerary(
  result: AIPlanGenerateResult,
): ItineraryResponse | null {
  const finalPlan = result.final_plan as
    | {
        destination_city?: string;
        duration_days?: number;
        itinerary_days?: Day[];
      }
    | null
    | undefined;

  const days = (finalPlan?.itinerary_days ?? result.itinerary_days ?? []) as Day[];
  const candidates = new Map(
    (result.candidate_pool ?? [])
      .map(asCandidate)
      .filter((item): item is Candidate => item !== null)
      .map((item) => [item.place_id, item]),
  );

  const destinations: Destination[] = [];

  for (const day of days) {
    for (const slot of day.time_slots ?? []) {
      const candidate = slot.place_id ? candidates.get(slot.place_id) : undefined;
      const lat = candidate?.latitude;
      const lng = candidate?.longitude;

      if (lat == null || lng == null || !slot.place_name) continue;

      destinations.push({
        id: `${day.day_number ?? 1}-${slot.place_id}`,
        name: slot.place_name,
        description: slot.activity_description || 'Địa điểm được ViVu AI đề xuất.',
        time: slot.start_time || '--:--',
        duration: slot.end_time
          ? `~${minutesBetween(slot.start_time, slot.end_time) ?? 0} phút`
          : undefined,
        category: slot.slot_type || candidate?.category || 'Khám phá',
        place: {
          name: slot.place_name,
          address: candidate?.address || 'Địa chỉ chưa cập nhật',
          rating: candidate?.rating ?? 0,
          lat,
          lng,
        },
        isCheckedIn: false,
        isSkipped: false,
      });
    }
  }

  if (!destinations.length) return null;

  const city = finalPlan?.destination_city || 'chuyến đi';
  const duration = finalPlan?.duration_days;

  return {
    title: duration ? `Lịch trình ${city} ${duration} ngày` : `Lịch trình ${city}`,
    destinations,
  };
}
