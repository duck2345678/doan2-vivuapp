# Google Maps Integration Guide

## 📋 Overview

Uni Village hỗ trợ đầy đủ các Google Maps APIs:
- **Places API** - Tìm kiếm & autocomplete địa điểm
- **Directions API** - Chỉ đường chi tiết
- **Distance Matrix API** - Tính khoảng cách/thời gian
- **Geocoding API** - Chuyển đổi địa chỉ ↔ tọa độ

---

## 🔑 Bước 1: Cấu hình API Key

### Lấy API Key
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Enable các APIs:
   - **Places API (New)** - Autocomplete & search
   - **Directions API** - Turn-by-turn navigation
   - **Distance Matrix API** - Tính distance/ETA
   - **Geocoding API** - Address conversion
   - **Maps SDK for Android/iOS** (nếu build native)

### Thêm vào project

```bash
# .env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

> ⚠️ **QUAN TRỌNG:** Thêm `.env` vào `.gitignore`

---

## 🚀 Sử dụng API

### Places Autocomplete

```typescript
import { autocomplete, getPlaceDetails } from '@/features/map/services';

// Search for places
const predictions = await autocomplete('quán cà phê', {
  location: { latitude: 10.7626, longitude: 106.6824 },
  countries: ['vn'],
  limit: 5,
});

// Get place details
const details = await getPlaceDetails(predictions[0].placeId);
console.log(details.name, details.location);
```

### Directions

```typescript
import { getDirections } from '@/lib/maps/googleMapsService';

const route = await getDirections(
  { latitude: 10.7626, longitude: 106.6824 }, // origin
  { latitude: 10.7735, longitude: 106.7010 }, // destination
  { mode: 'driving' }
);

console.log(route.distance, route.duration);
console.log(route.steps); // Turn-by-turn instructions
```

### Distance Matrix

```typescript
import { getDistance, findNearest } from '@/features/map/services';

// Get distance between two points
const result = await getDistance(
  { latitude: 10.7626, longitude: 106.6824 },
  { latitude: 10.7735, longitude: 106.7010 }
);
console.log(result?.distance?.text, result?.duration?.text);

// Find nearest from multiple destinations
const nearest = await findNearest(origin, destinations);
console.log(`Nearest is index ${nearest?.index}`);
```

### Geocoding

```typescript
import { geocodeFirst, getReadableAddress } from '@/features/map/services';

// Address → Coordinates
const result = await geocodeFirst('123 Nguyễn Văn Cừ, Quận 5, TP.HCM');
console.log(result?.location.latitude, result?.location.longitude);

// Coordinates → Address (for pin drop)
const address = await getReadableAddress(10.7626, 106.6824);
console.log(address); // "123 Nguyễn Văn Cừ, Phường 4"
```

---

## 🧩 Components

### PlacesAutocomplete
Dropdown hiển thị gợi ý địa điểm khi người dùng gõ.

```tsx
<PlacesAutocomplete
  query={searchQuery}
  isVisible={isSearching}
  onPlaceSelect={(place) => navigateToPlace(place)}
  onClose={() => setIsSearching(false)}
  userLocation={currentLocation}
/>
```

### LocationPicker
Cho phép người dùng chọn vị trí bằng cách kéo bản đồ.

```tsx
<LocationPicker
  initialLocation={currentLocation}
  onLocationSelect={(location) => {
    console.log(location.address, location.latitude, location.longitude);
  }}
  onCancel={() => navigation.goBack()}
/>
```

### RouteOverlay
Hiển thị thông tin route và hướng dẫn chi tiết.

```tsx
<RouteOverlay
  route={navigationRoute}
  isLoading={isLoadingRoute}
  onStartNavigation={() => startNavigation()}
  onClose={() => setShowRoute(false)}
/>
```

---

## 💰 Pricing & Optimization

### Free Credit
Google Maps Platform cấp **$200 free/tháng** (~40,000 requests).

### Tips tiết kiệm
1. **Caching** - Tất cả services đều có built-in cache
2. **Debouncing** - Autocomplete chờ 300ms trước khi gọi API
3. **Fallback** - Tự động dùng mock data nếu API lỗi

### Clear cache khi cần

```typescript
import { clearPlacesCache, clearGeocodingCache, clearDistanceCache } from '@/features/map/services';

clearPlacesCache();
clearGeocodingCache();
clearDistanceCache();
```

---

## 🐛 Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `API key not valid` | Key chưa enable API | Enable APIs trong Cloud Console |
| `OVER_QUERY_LIMIT` | Hết quota | Check billing |
| `REQUEST_DENIED` | Key bị restrict | Check Application restrictions |
| Fallback to mock | Không có key/.env | Thêm `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` |

---

## 📚 Resources

- [Places API Docs](https://developers.google.com/maps/documentation/places)
- [Directions API Docs](https://developers.google.com/maps/documentation/directions)
- [Distance Matrix Docs](https://developers.google.com/maps/documentation/distance-matrix)
- [Geocoding Docs](https://developers.google.com/maps/documentation/geocoding)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)

---

**Happy Coding! 🚀**
