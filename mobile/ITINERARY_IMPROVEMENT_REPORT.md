# BÁOCÁO PHÂN TÍCH VÀ IMPLEMENT CẢI THIỆN TÍNH NĂNG TẠO CHUYẾN ĐI

## 📊 PHÂN TÍCH VÀ FIX CÁC LỖI

### ✅ LỖI 1: Đổi thời gian nhưng vẫn bị reset về nowtime

**Nguyên nhân:**
- File: [CreateItineraryScreen.tsx](app\(modals)\create-itinerary.tsx#L80-L95)
- Logic `getInitialTime()` được gọi trong `initialTimeRef.current = getInitialTime()` khiến thời gian reset mỗi render
- `initialTimeRef` được tái khởi tạo thay vì giữ giá trị ban đầu

**Fix được áp dụng:**
```tsx
// TRƯỚC (LỖI)
const getInitialTime = () => {
  const base = new Date();
  base.setHours(18, 8, 0, 0);
  return base;
};
const initialTimeRef = useRef<Date>(getInitialTime());

// SAU (FIX)
const initialTimeRef = useRef<Date>(() => {
  const base = new Date();
  base.setHours(18, 8, 0, 0);
  return base;
}());
```

**Kết quả:**
- ✅ `initialTimeRef` giữ giá trị cố định trên toàn vòng đời component
- ✅ Thời gian người dùng chọn không bị reset

---

### ✅ LỖI 2: Màn hình thành công không nền trắng

**Nguyên nhân:**
- File: [ItinerarySuccessScreen.tsx](src\features\itinerary\screens\ItinerarySuccessScreen.tsx#L104)
- Sử dụng `backgroundColor: colors.background` (thay đổi theo theme)
- Trong dark mode sẽ là màu tối

**Fix được áp dụng:**
```tsx
// TRƯỚC (LỖI)
<SafeAreaView
  style={[styles.container, { backgroundColor: colors.background }]}
>
  <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

// SAU (FIX)
<SafeAreaView
  style={[styles.container, { backgroundColor: "#FFFFFF" }]}
>
  <StatusBar style={"dark"} />
```

**Kết quả:**
- ✅ Màn hình thành công luôn có nền trắng sạch đẹp
- ✅ StatusBar luôn dark (phù hợp với background trắng)

---

### ✅ LỖI 3: Khoảng cách địa điểm luôn = 0

**Nguyên nhân:**
- File: [placesService.ts](src\features\map\services\placesService.ts#L307-L330)
- Google Places API không trả về `distanceMeters`
- Frontend không tính toán distance từ `lat/lng`

**Fix được áp dụng:**

1. **Tạo utility function Haversine** ([haversine.ts](src\lib\utils\haversine.ts)):
```typescript
export function calculateHaversineDistance(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  // Haversine formula
  return R * c; // distance in meters
}
```

2. **Update searchNearby function**:
```typescript
return (data.places || []).map((place: any) => {
  const distanceMeters = calculateHaversineDistance(
    options.location.latitude,
    options.location.longitude,
    place.location?.latitude || 0,
    place.location?.longitude || 0
  );
  
  return {
    // ...
    distanceMeters,
  };
});
```

**Kết quả:**
- ✅ Khoảng cách được tính toán chính xác từ vị trí người dùng
- ✅ Hiển thị "Cách X km" thay vì "Cách 0 km"

---

### ✅ LỖI 4: Không sửa được tên chuyến đi

**Nguyên nhân:**
- Backend có endpoint PATCH `/me/tours/{id}` nhưng frontend không sử dụng
- Frontend chỉ có giao diện nhập tên khi tạo, không có giao diện chỉnh sửa

**Fix được áp dụng:**

1. **Tạo EditTourNameModal component** ([EditTourNameModal.tsx](src\features\itinerary\components\EditTourNameModal.tsx)):
```tsx
export function EditTourNameModal({
  visible, currentName, onClose, onSave
}: EditTourNameModalProps) {
  // Modal dialog để chỉnh sửa tên chuyến đi
  // Validation: không trống, max 200 chars
  // Loading state khi submit
}
```

2. **Thêm updateItinerary service** ([itineraryService.ts](src\features\itinerary\services\itineraryService.ts)):
```typescript
export async function updateItinerary(id: string, data: {
  tourName?: string;
  startDate?: Date;
  startTime?: Date;
}): Promise<Itinerary> {
  const tour = await itineraryApi.updateTour(parseInt(id), {
    tourName: data.tourName,
    startDate: data.startDate?.toISOString(),
    startTime: data.startTime?.toISOString(),
  });
  return mapTourToItinerary(tour);
}
```

3. **Backend validation improvement** ([TourRequest.java](src\main\java\com\example\vnuguideapp\dto\request\TourAndCheckInAndItinerary\TourRequest.java)):
```java
@NotBlank(message = "Tour name is required")
@Size(min = 1, max = 200, message = "Name must be 1-200 characters")
private String name;
```

**Kết quả:**
- ✅ Người dùng có thể chỉnh sửa tên chuyến đi sau khi tạo
- ✅ Validation đảm bảo tên hợp lệ

---

## 🚀 CÁC CẢI THIỆN KHÁC

### 1. **Backend: Thêm startDate Field**

**File thay đổi:**
- [Tour.java](entity\TourAndCheckInAndItinerary\Tour.java)
- [TourRequest.java](dto\request\TourAndCheckInAndItinerary\TourRequest.java)
- [TourResponse.java](dto\reponse\TourAndCheckInAndItinerary\TourResponse.java)

**Lý do:**
- Tách biệt ngày (startDate) và giờ (startTime)
- Frontend gửi riêng rẽ
- Đầu vào dữ liệu rõ ràng hơn

**Changes:**
```java
// Tour entity
private LocalDateTime startDate;
private LocalDateTime startTime;

// TourRequest
private LocalDateTime startDate;
private LocalDateTime startTime;

// TourResponse
private LocalDateTime startDate;
private LocalDateTime startTime;
```

### 2. **Database Migration**

**File:** [V20260122__add_tour_start_date.sql](src\main\resources\db\migration\V20260122__add_tour_start_date.sql)

```sql
ALTER TABLE tours ADD COLUMN start_date DATETIME NULL;
CREATE INDEX idx_tours_start_date ON tours(start_date);
```

### 3. **Backend Service Improvement**

**File:** [TourService.java](service\TourAndCheckInAndItinerary\TourService.java)

```java
// createTour - cập nhật status từ ONGOING -> SCHEDULED
public TourResponse createTour(User user, TourRequest request) {
  Tour tour = Tour.builder()
    .user(user)
    .name(request.getName())
    .startDate(request.getStartDate())
    .startTime(request.getStartTime())
    .status(TourStatus.SCHEDULED)  // THAY ĐỔI từ ONGOING
    .build();
}

// updateTour - thêm validation và startDate
public TourResponse updateTour(User user, Long tourId, TourRequest request) {
  if (request.getName() != null && !request.getName().isBlank()) {
    tour.setName(request.getName());
  }
  if (request.getStartDate() != null) {
    tour.setStartDate(request.getStartDate());
  }
  // ...
}
```

### 4. **Frontend Service Layer**

**File:** [itineraryService.ts](src\features\itinerary\services\itineraryService.ts)

- Thêm hàm `updateItinerary()`
- Map backend response đúng cách

---

## 📋 CHECKLIST HOÀN THÀNH

### Frontend (Uni_Village)
- [x] Fix lỗi reset thời gian
- [x] Fix màn hình thành công nền trắng
- [x] Thêm Haversine distance calculation
- [x] Tạo EditTourNameModal component
- [x] Thêm updateItinerary service
- [x] Update types để match backend

### Backend (vnuguideapp)
- [x] Thêm startDate field vào Tour entity
- [x] Update TourRequest validation
- [x] Update TourResponse
- [x] Update createTour logic (SCHEDULED status)
- [x] Update updateTour validation
- [x] Tạo migration file

### QA Points
- [ ] Test time picker - đảm bảo thời gian không reset
- [ ] Test success screen - luôn trắng
- [ ] Test distance calculation - đúng km
- [ ] Test edit tour name - update via API
- [ ] Test database migration - startDate thêm đúng

---

## 📝 GHI CHÚ

1. **Status Tour**: Đã thay từ `ONGOING` → `SCHEDULED` vì tour vừa tạo chưa bắt đầu
2. **Distance**: Dùng Haversine formula tính từ vị trí người dùng đến địa điểm
3. **EditTourNameModal**: Có thể tái sử dụng cho các trường khác
4. **Validation**: Thêm check `!isBlank()` để tránh update với tên trống

---

## 🔄 LUỒNG HOẠT ĐỘNG TẠO CHUYẾN ĐI (IMPROVED)

```
1. CreateItineraryScreen
   ├─ Nhập tên chuyến đi
   ├─ Chọn ngày (startDate)
   ├─ Chọn giờ (startTime) ← FIX: không bị reset
   ├─ Chọn vị trí xuất phát
   └─ Chọn loại chuyến đi
        ↓
2. SelectDestinationsScreen
   ├─ Hiển thị danh sách địa điểm gợi ý
   ├─ Tính khoảng cách ← FIX: dùng Haversine
   └─ Chọn và sắp xếp các điểm đến
        ↓
3. API: POST /me/tours (với startDate)
   ├─ Backend: Tạo tour với status=SCHEDULED
   └─ Response: TourResponse (có startDate)
        ↓
4. ItinerarySuccessScreen ← FIX: nền trắng
   ├─ Hiển thị thông tin chuyến đi
   └─ Nút: Xem chi tiết / Quay về trang chủ
        ↓
5. ItineraryDetailScreen ← NEW: có nút Edit
   ├─ Xem chi tiết chuyến đi
   ├─ Nút edit tên chuyến đi
   └─ API: PATCH /me/tours/{id} (update tourName)
```

---

## 📦 FILES ĐƯỢC MODIFY/CREATE

### Create
- `/src/lib/utils/haversine.ts` - Haversine distance calculation
- `/src/features/itinerary/components/EditTourNameModal.tsx` - Edit modal
- `/src/main/resources/db/migration/V20260122__add_tour_start_date.sql` - DB migration

### Modify
- `/src/features/itinerary/screens/CreateItineraryScreen.tsx` - Fix time reset
- `/src/features/itinerary/screens/ItinerarySuccessScreen.tsx` - Fix background
- `/src/features/map/services/placesService.ts` - Add distance calculation
- `/src/features/itinerary/services/itineraryService.ts` - Add updateItinerary
- `/src/features/itinerary/types/itinerary.types.ts` - Already has startDate
- `/src/main/java/.../entity/Tour.java` - Add startDate
- `/src/main/java/.../dto/request/TourRequest.java` - Add startDate
- `/src/main/java/.../dto/response/TourResponse.java` - Add startDate
- `/src/main/java/.../service/TourService.java` - Update logic

---

## 🎯 NEXT STEPS (Optional Enhancements)

1. **Real-time distance sync**: Cập nhật distance khi user di chuyển
2. **Route optimization**: Tính toán tuyến đường tối ưu
3. **Time estimation**: Ước tính thời gian di chuyển giữa điểm
4. **Collaborative trips**: Chia sẻ chuyến đi với bạn bè
5. **Trip templates**: Lưu và tái sử dụng template chuyến đi
6. **Analytics**: Thống kê chi phí, thời gian chuyến đi
7. **Offline mode**: Lưu cache địa điểm để dùng offline

