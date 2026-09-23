/**
 * AI Itinerary Service
 *
 * This service provides AI-generated itinerary suggestions.
 *
 * Priority:
 * 1. Call Backend API (/ai/itineraries/suggest) - uses Google Places + Gemini
 * 2. Fallback to direct Gemini API if backend fails
 * 3. Return mock data as last resort
 */

import { env } from "@/config/env";
import type { SuggestedItinerary, SuggestedStop } from "@/features/tours/types";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

// ==========================================
// Types for frontend UI
// ==========================================

export interface ItineraryRequest {
  activity: "deadline" | "food-tour" | "date-chill" | "hangout";
  transport: "walking-bus" | "motorbike";
  budget: "low" | "high";
  timeSlot?: "morning" | "afternoon" | "evening" | "fullday";
  groupSize?: "solo" | "couple" | "small-group" | "large-group";
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Destination {
  id: string;
  name: string;
  description: string;
  time: string;
  duration?: string;
  category: string;
  budget?: string;
  place: {
    name: string;
    address: string;
    rating: number;
    lat: number;
    lng: number;
  };
  isCheckedIn: boolean;
  isSkipped: boolean;
}

export interface ItineraryResponse {
  title: string;
  destinations: Destination[];
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
}

// ==========================================
// Main export function
// ==========================================

/**
 * Generate an itinerary based on user preferences
 * Uses Backend API with fallback to direct Gemini and mock data
 */
export async function generateItinerary(
  request: ItineraryRequest,
): Promise<ItineraryResponse> {
  console.log("🚀 Starting itinerary generation...");

  // Try backend API first
  try {
    const result = await generateFromBackend(request);
    if (result) {
      console.log("✅ Got itinerary from backend API");
      return result;
    }
  } catch (error) {
    console.warn("⚠️ Backend API failed, trying Gemini direct...", error);
  }

  // Fallback to direct Gemini API
  try {
    const result = await generateFromGeminiDirect(request);
    if (result) {
      console.log("✅ Got itinerary from Gemini direct");
      return result;
    }
  } catch (error) {
    console.warn("⚠️ Gemini direct failed, using mock data...", error);
  }

  // Last resort: mock data
  console.log("📦 Using mock data as fallback");
  return generateMockItinerary(request);
}

// ==========================================
// Backend API Integration
// ==========================================

/**
 * Call backend API to generate itinerary
 */
async function generateFromBackend(
  request: ItineraryRequest,
): Promise<ItineraryResponse | null> {
  // Map frontend activity to backend mood
  const moodMapping: Record<string, string> = {
    deadline: "relaxing", // quiet places for work
    "food-tour": "foodie",
    "date-chill": "romantic",
    hangout: "adventurous",
  };

  // Default location: VNU HCM
  const defaultLat = 10.87;
  const defaultLng = 106.8031;

  const backendRequest = {
    mood: moodMapping[request.activity] || "cultural",
    startLatitude: request.location?.lat || defaultLat,
    startLongitude: request.location?.lng || defaultLng,
    radiusKm: request.transport === "walking-bus" ? 3 : 10,
    maxStops: request.timeSlot === "fullday" ? 6 : 4,
    maxDurationHours: request.timeSlot === "fullday" ? 10 : 4,
    timeSlot: request.timeSlot || "afternoon",
    groupSize: request.groupSize || "couple",
    budget: request.budget,
    transport: request.transport,
  };

  console.log("📡 Calling backend API...", backendRequest);

  const backendResponse = await apiClient.post<SuggestedItinerary>(
    API_ENDPOINTS.AI.SUGGEST_ITINERARY,
    backendRequest,
  );

  // Transform backend response to frontend format
  return transformBackendResponse(backendResponse, request);
}

/**
 * Transform backend SuggestedItinerary to frontend ItineraryResponse
 */
function transformBackendResponse(
  backend: SuggestedItinerary,
  request: ItineraryRequest,
): ItineraryResponse {
  const startTimes: Record<string, string> = {
    morning: "08:00",
    afternoon: "14:00",
    evening: "18:00",
    fullday: "09:00",
  };
  const startTime = startTimes[request.timeSlot || "afternoon"];

  const destinations: Destination[] = (backend.stops || []).map(
    (stop: SuggestedStop, index: number) => {
      // Calculate time based on index and duration
      const baseHour = parseInt(startTime.split(":")[0], 10);
      const hour = baseHour + index;
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;

      return {
        id: String(index + 1),
        name: stop.placeName || "Địa điểm",
        description: stop.aiReason || "Địa điểm được AI gợi ý",
        time: timeStr,
        duration: stop.suggestedDurationMinutes
          ? `~${stop.suggestedDurationMinutes} phút`
          : "~30 phút",
        category: getCategoryFromMood(request.activity),
        budget: request.budget === "low" ? "~50k" : "~150k",
        place: {
          name: stop.placeName || "Địa điểm",
          address: stop.address || "Địa chỉ chưa cập nhật",
          rating: stop.rating || 4.0,
          lat: stop.latitude || 10.87,
          lng: stop.longitude || 106.8,
        },
        isCheckedIn: false,
        isSkipped: false,
      };
    },
  );

  const activityTitles: Record<string, string> = {
    deadline: "Chạy deadline cực căng 🔥",
    "food-tour": "Tour ăn ngon Sài Gòn 😋",
    "date-chill": "Hẹn hò lãng mạn 💖",
    hangout: "Tụ tập bạn bè vui vẻ 🎮",
  };

  return {
    title:
      backend.name || activityTitles[request.activity] || "Lịch trình gợi ý",
    destinations,
    totalDistanceKm: backend.totalDistanceKm,
    totalDurationMinutes: backend.totalDurationMinutes,
  };
}

function getCategoryFromMood(activity: string): string {
  const categories: Record<string, string> = {
    deadline: "Học tập",
    "food-tour": "Ăn uống",
    "date-chill": "Giải trí",
    hangout: "Giải trí",
  };
  return categories[activity] || "Khám phá";
}

// ==========================================
// Direct Gemini API (Fallback)
// ==========================================

/**
 * Call Gemini API directly as fallback
 */
async function generateFromGeminiDirect(
  request: ItineraryRequest,
): Promise<ItineraryResponse | null> {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found");
    return null;
  }

  const prompt = buildPrompt(request);

    console.log('🤖 Calling Gemini AI...');

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!aiText) {
    throw new Error("No response from Gemini AI");
  }

  return parseAIResponse(aiText, request);
}

function buildPrompt(request: ItineraryRequest): string {
  const activityDescriptions: Record<string, string> = {
    deadline: "chạy deadline, cần nơi yên tĩnh để làm việc và học tập",
    "food-tour": "đi ăn uống, khám phá ẩm thực",
    "date-chill": "hẹn hò, cần không gian riêng tư và lãng mạn",
    hangout: "tụ tập bạn bè, vui chơi giải trí",
  };

  const transportDescriptions: Record<string, string> = {
    "walking-bus": "đi bộ hoặc xe buýt, các địa điểm nên gần nhau",
    motorbike: "xe máy, có thể đi xa hơn",
  };

  const budgetDescriptions: Record<string, string> = {
    low: "ngân sách thấp, các địa điểm giá rẻ, sinh viên",
    high: "ngân sách cao hơn, có thể đến các nơi cao cấp",
  };

  const timeSlotDescriptions: Record<string, string> = {
    morning: "buổi sáng (7:00 - 11:00)",
    afternoon: "buổi chiều (13:00 - 17:00)",
    evening: "buổi tối (18:00 - 22:00)",
    fullday: "cả ngày",
  };

  const groupSizeDescriptions: Record<string, string> = {
    solo: "đi một mình",
    couple: "hai người",
    "small-group": "nhóm 3-5 người",
    "large-group": "nhóm 6+ người",
  };

  const timeSlot = request.timeSlot || "afternoon";
  const groupSize = request.groupSize || "couple";
  const startTimes: Record<string, string> = {
    morning: "08:00",
    afternoon: "14:00",
    evening: "18:00",
    fullday: "09:00",
  };
  const startTime = startTimes[timeSlot];
  const numDestinations = timeSlot === "fullday" ? "4-6" : "2-4";

  return `
Bạn là trợ lý AI chuyên tạo lịch trình du lịch cho sinh viên ở Sài Gòn.

Yêu cầu của người dùng:
- Mục đích: ${activityDescriptions[request.activity]}
- Phương tiện: ${transportDescriptions[request.transport]}
- Ngân sách: ${budgetDescriptions[request.budget]}
- Khung giờ: ${timeSlotDescriptions[timeSlot]}
- Số người: ${groupSizeDescriptions[groupSize]}

Hãy đề xuất một lịch trình từ 2-4 địa điểm phù hợp ở khu vực Đại học Quốc Gia TP.HCM hoặc các khu vực gần đó.

Trả về kết quả dưới dạng JSON với format sau:
{
  "title": "Tên lịch trình (tối đa 8 từ)",
  "destinations": [
    {
      "id": "1",
      "name": "Tên địa điểm",
      "description": "Mô tả ngắn gọn 10-15 từ",
      "time": "14:00",
      "duration": "~30 phút",
      "category": "Học tập/Ăn uống/Giải trí",
      "budget": "~50k",
      "place": {
        "name": "Tên địa điểm",
        "address": "Địa chỉ ngắn",
        "rating": 4.5,
        "lat": 10.7630,
        "lng": 106.6830
      },
      "isCheckedIn": false,
      "isSkipped": false
    }
  ]
}

Lưu ý:
- Thời gian bắt đầu từ 14:00
- Khoảng cách giữa các điểm phù hợp với phương tiện di chuyển
- Mô tả ngắn gọn, có emoji phù hợp
- Tọa độ chính xác của địa điểm thực tế
`;
}

function parseAIResponse(
  aiText: string,
  request: ItineraryRequest,
): ItineraryResponse {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonText = jsonMatch ? jsonMatch[1] : aiText;
    
    const parsed = JSON.parse(jsonText);

    if (!parsed.title || !Array.isArray(parsed.destinations)) {
      throw new Error('Invalid response structure');
    }
    
    return parsed as ItineraryResponse;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    // Return fallback mock data
    return generateMockItinerary(request);
  }
}

// ==========================================
// Mock Data (Last resort)
// ==========================================

function generateMockItinerary(request: ItineraryRequest): ItineraryResponse {
  const mockDestinations: Destination[] = [
    {
      id: "1",
      name: "Thư Viện Tổng Hợp",
      description: "Nơi lý tưởng để học bài và làm việc 📚",
      time: "14:00",
      duration: "~2 giờ",
      category: "Học tập",
      budget: request.budget === "low" ? "~50k" : "~100k",
      place: {
        name: "Thư Viện Tổng Hợp",
        address: "Khu A, Đại học Quốc Gia TP.HCM",
        rating: 4.5,
        lat: 10.8705,
        lng: 106.8027,
      },
      isCheckedIn: false,
      isSkipped: false,
    },
    {
      id: "2",
      name: "Canteen Đại học",
      description: "Căn tin sinh viên, cơm tấm ngon giá rẻ 🍚",
      time: "18:30",
      duration: "~1 giờ",
      category: "Ăn uống",
      budget: request.budget === "low" ? "~30k" : "~80k",
      place: {
        name: "Canteen Đại học",
        address: "Khu A, Đại học Quốc Gia TP.HCM",
        rating: 4.0,
        lat: 10.8715,
        lng: 106.8035,
      },
      isCheckedIn: false,
      isSkipped: false,
    },
  ];

  const activityTitles: Record<string, string> = {
    deadline: "Chạy deadline cực căng 🔥",
    "food-tour": "Tour ăn ngon Sài Gòn 😋",
    "date-chill": "Hẹn hò lãng mạn 💖",
    hangout: "Tụ tập bạn bè vui vẻ 🎮",
  };

  return {
    title: activityTitles[request.activity] || "Lịch trình gợi ý",
    destinations: mockDestinations,
  };
}
