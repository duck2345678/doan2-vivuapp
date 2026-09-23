# Itinerary Module - Backend API Integration

## 📋 Tổng quan

Module itinerary đã được tích hợp với backend API từ VNU Guide App. Tất cả mock data đã được thay thế bằng real API calls.

## 🔗 Backend APIs

### **Tours (Itineraries)**
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/me/tours` | Lấy danh sách tours của user |
| GET | `/api/v1/me/tours/current` | Lấy tour đang diễn ra |
| POST | `/api/v1/me/tours` | Tạo tour mới |
| GET | `/api/v1/tours/{id}` | Lấy chi tiết tour |
| PATCH | `/api/v1/me/tours/{id}` | Cập nhật tour |
| POST | `/api/v1/me/tours/{id}/complete` | Hoàn thành tour |
| POST | `/api/v1/me/tours/{id}/cancel` | Hủy tour |
| POST | `/api/v1/tours/{id}/copy` | Sao chép tour (reuse) |

### **Tour Stops (Destinations)**
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/tours/{id}/stops` | Lấy danh sách điểm đến |
| POST | `/api/v1/me/tours/{id}/stops` | Thêm điểm đến |
| PUT | `/api/v1/me/tours/{id}/stops/reorder` | Sắp xếp lại điểm đến |
| DELETE | `/api/v1/me/tours/{id}/stops/{stopId}` | Xóa điểm đến |

### **Check-ins**
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/check-ins` | Check-in tại địa điểm |
| GET | `/api/v1/me/check-ins` | Lịch sử check-in |

### **AI Itinerary**
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/ai/itineraries/suggest` | Tạo lịch trình bằng AI |

### **Places**
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/places` | Tìm kiếm địa điểm |
| GET | `/api/v1/places/nearby` | Địa điểm gần đây |
| GET | `/api/v1/places/{id}` | Chi tiết địa điểm |

## 📁 Cấu trúc File

```
src/features/itinerary/
├── api/
│   └── index.ts              # ✅ API client functions
├── services/
│   └── itineraryService.ts   # ✅ Business logic layer
├── types/
│   └── itinerary.types.ts    # ✅ TypeScript types (frontend + backend)
├── hooks/
│   └── useItineraries.ts     # ✅ React hooks
└── screens/                   # ✅ All screens updated
```

## 🔄 Status Mapping

Backend sử dụng `TourStatus` enum khác với frontend:

| Backend Status | Frontend Status | Mô tả |
|----------------|----------------|-------|
| `SCHEDULED` | `upcoming` | Lịch trình sắp tới |
| `IN_PROGRESS` | `ongoing` | Đang diễn ra |
| `COMPLETED` | `past` | Đã hoàn thành |
| `CANCELLED` | `past` | Đã hủy |

Service layer tự động map giữa 2 formats.

## 🔧 Cách sử dụng

### 1. Fetch Itineraries
```typescript
import { fetchItineraries } from '@/features/itinerary';

// Lấy tất cả
const allItineraries = await fetchItineraries();

// Lọc theo status
const ongoingItineraries = await fetchItineraries('ongoing');
const upcomingItineraries = await fetchItineraries('upcoming');
const pastItineraries = await fetchItineraries('past');
```

### 2. Sử dụng Hook
```typescript
import { useItineraries } from '@/features/itinerary';

function MyComponent() {
    const { itineraries, loading, error, reload } = useItineraries();
    
    // itineraries: Itinerary[]
    // loading: boolean
    // error: string | null
    // reload: () => Promise<void>
}
```

### 3. Create Itinerary
```typescript
import { createItinerary } from '@/features/itinerary';

const newItinerary = await createItinerary({
    tourName: 'Chuyến đi Đà Lạt',
    startDate: new Date('2026-02-01'),
    startTime: new Date('2026-02-01T08:00:00'),
});
```

### 4. Check-in
```typescript
import { checkInAtDestination } from '@/features/itinerary';

await checkInAtDestination(
    placeId: 123,
    tourId: 456,
    tourStopId: 789
);
```

### 5. AI Suggestions
```typescript
import { getAISuggestions } from '@/features/itinerary';

const suggestions = await getAISuggestions({
    mood: 'romantic',
    budget: 'medium',
    location: { lat: 10.762622, lng: 106.660172 }
});
```

## 🔑 Authentication

Tất cả authenticated endpoints tự động thêm Bearer token từ `authStore`. Xem [src/lib/api/client.ts](../../lib/api/client.ts) cho chi tiết.

## ⚠️ Error Handling

Sử dụng `ApiError` từ `@/lib/errors`:

```typescript
import { ApiError } from '@/lib/errors';

try {
    await createItinerary(data);
} catch (error) {
    if (error instanceof ApiError) {
        console.error(error.statusCode, error.message);
    }
}
```

## 📝 Types Reference

### TourResponse
```typescript
interface TourResponse {
    id: number;
    userId: number;
    tourName: string;
    startDate: string;
    startTime: string;
    status: TourStatus;
    stops: TourStopResponse[];
    createdAt: string;
    updatedAt: string;
}
```

### TourStopResponse
```typescript
interface TourStopResponse {
    id: number;
    tourId: number;
    placeId: number;
    placeName: string;
    placeImageUrl?: string;
    order: number;
    visitTime?: string;
    isCheckedIn: boolean;
    isSkipped: boolean;
    checkedInAt?: string;
    lat?: number;
    lng?: number;
}
```

## 🚀 Migration từ Mock Data

**Trước (Mock):**
```typescript
const trips = await AsyncStorage.getItem('@trips');
const data = trips ? JSON.parse(trips) : [];
```

**Sau (Real API):**
```typescript
import { fetchItineraries } from '@/features/itinerary';
const data = await fetchItineraries();
```

## ✅ Completed Integration

- ✅ API Client functions (`api/index.ts`)
- ✅ Service layer với type mapping (`services/itineraryService.ts`)
- ✅ Backend types (`types/itinerary.types.ts`)
- ✅ Endpoints constants (`lib/api/endpoints.ts`)
- ✅ Error handling
- ✅ Authentication flow
- ✅ React hooks

## 🔜 Next Steps

1. Test với real backend server
2. Update screens để sử dụng API thay vì AsyncStorage
3. Add loading states và error handling UI
4. Implement offline caching với React Query
5. Add retry logic cho failed requests

## 📞 Backend Repository

Backend API source: [MKwang151/vnuguideapp](https://github.com/MKwang151/vnuguideapp)

---

**Last Updated:** January 20, 2026  
**Integration Status:** ✅ Complete
