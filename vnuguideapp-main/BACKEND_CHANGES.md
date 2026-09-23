# BACKEND CHANGES - TẠO CHUYẾN ĐI IMPROVEMENT

## 📋 SUMMARY

Các thay đổi backend hỗ trợ:
1. ✅ Tách startDate riêng khỏi startTime
2. ✅ Improve validation TourRequest
3. ✅ Add startDate field vào database
4. ✅ Update tour status từ ONGOING → SCHEDULED

---

## 📝 DANH SÁCH THAY ĐỔI

### 1. Entity Layer
**File:** `src/main/java/com/example/vnuguideapp/entity/TourAndCheckInAndItinerary/Tour.java`

```java
// THÊM
private LocalDateTime startDate;

// GIỮ NGUYÊN
private LocalDateTime startTime;
private LocalDateTime endTime;
```

**Lý do:** Phân tách ngày và giờ xuất phát để quản lý dữ liệu rõ ràng hơn

---

### 2. DTO Layer - Request
**File:** `src/main/java/com/example/vnuguideapp/dto/request/TourAndCheckInAndItinerary/TourRequest.java`

**Changes:**
```java
// TRƯỚC
@NotBlank(message = "Tour name is required")
@Size(max = 200, message = "Name must be at most 200 characters")
private String name;

// SAU
@NotBlank(message = "Tour name is required")
@Size(min = 1, max = 200, message = "Name must be 1-200 characters")
private String name;

// THÊM
private LocalDateTime startDate;
```

**Lý do:** 
- Cải thiện validation (min = 1 rõ ràng hơn)
- Nhận startDate từ frontend

---

### 3. DTO Layer - Response
**File:** `src/main/java/com/example/vnuguideapp/dto/reponse/TourAndCheckInAndItinerary/TourResponse.java`

**Changes:**
```java
// THÊM
private LocalDateTime startDate;

// GIỮ NGUYÊN
private LocalDateTime startTime;
```

**Lý do:** Response phải match request để frontend có đủ dữ liệu

---

### 4. Service Layer
**File:** `src/main/java/com/example/vnuguideapp/service/TourAndCheckInAndItinerary/TourService.java`

#### 4.1 Method: createTour()
```java
// TRƯỚC
.status(TourStatus.ONGOING)

// SAU
.status(TourStatus.SCHEDULED)
```

**Lý do:** Tour vừa tạo chưa bắt đầu, nên status là SCHEDULED chứ không ONGOING

#### 4.2 Method: updateTour()
```java
// TRƯỚC
if (request.getStartTime() != null) {
  tour.setStartTime(request.getStartTime());
}

// SAU
if (request.getStartDate() != null) {
  tour.setStartDate(request.getStartDate());
}
if (request.getStartTime() != null) {
  tour.setStartTime(request.getStartTime());
}
```

**Lý do:** Hỗ trợ cập nhật cả startDate khi chỉnh sửa chuyến đi

#### 4.3 Method: toResponse()
```java
// THÊM
.startDate(tour.getStartDate())
```

**Lý do:** Mapper phải include startDate để response đầy đủ

---

### 5. Database Migration
**File:** `src/main/resources/db/migration/V20260122__add_tour_start_date.sql`

```sql
-- Thêm column startDate vào bảng tours
ALTER TABLE tours ADD COLUMN start_date DATETIME NULL COMMENT 'Tour start date';

-- Tạo index để tối ưu query
CREATE INDEX idx_tours_start_date ON tours(start_date);
```

**Lý do:** 
- Lưu startDate vào database
- Index cải thiện performance khi query theo ngày

---

## 🔄 LUỒNG DỮ LIỆU

### Create Tour Flow
```
Frontend: CreateItineraryScreen
  ↓
POST /me/tours
  {
    "tourName": "Chuyến đi cuối tuần",
    "startDate": "2026-01-22T00:00:00.000Z",
    "startTime": "2026-01-22T18:08:00.000Z"
  }
  ↓
Backend: TourController.createTour()
  ├─ Validate TourRequest
  ├─ Create Tour entity
  ├─ Set status = SCHEDULED
  ├─ Save to DB
  └─ Return TourResponse
  ↓
Frontend: ItinerarySuccessScreen
  (với startDate + startTime)
```

### Update Tour Flow
```
Frontend: ItineraryDetailScreen
  → Click Edit Tour Name
  → EditTourNameModal
  ↓
PATCH /me/tours/{id}
  {
    "tourName": "Tên chuyến đi mới"
  }
  ↓
Backend: TourService.updateTour()
  ├─ Validate ownership
  ├─ Update tour.name
  ├─ Save to DB
  └─ Return TourResponse
  ↓
Frontend: Refresh detail
```

---

## ✅ TESTING CHECKLIST

### Unit Tests
- [ ] TourService.createTour() - status = SCHEDULED
- [ ] TourService.updateTour() - validate name not blank
- [ ] TourRequest validation - name size 1-200
- [ ] Tour entity - startDate field initialized

### Integration Tests
- [ ] POST /me/tours - create with startDate
- [ ] PATCH /me/tours/{id} - update tourName
- [ ] GET /tours/{id} - startDate in response
- [ ] Database migration - startDate column added

### Manual Tests
- [ ] Create tour via app - backend nhận startDate
- [ ] Edit tour name - update thành công
- [ ] Check DB - startDate saved correctly
- [ ] GET tour - response có startDate

---

## 📊 IMPACT ANALYSIS

| Component | Status | Impact |
|-----------|--------|--------|
| Tour entity | ADD | +1 field, +1 index |
| TourRequest | MODIFY | +1 field, improve validation |
| TourResponse | MODIFY | +1 field |
| TourService | MODIFY | create: status logic, update: add startDate |
| Migration | ADD | 1 new migration file |

---

## 🚀 DEPLOYMENT NOTES

1. **DB Migration**: Chạy V20260122__add_tour_start_date.sql trước deploy
2. **Backward compatibility**: startDate nullable, nên không break existing records
3. **API versioning**: Không cần versioning vì là additive change
4. **Monitoring**: Theo dõi query performance trên startDate index

---

## 📚 REFERENCES

- [Tour.java](entity/TourAndCheckInAndItinerary/Tour.java)
- [TourRequest.java](dto/request/TourAndCheckInAndItinerary/TourRequest.java)
- [TourResponse.java](dto/reponse/TourAndCheckInAndItinerary/TourResponse.java)
- [TourService.java](service/TourAndCheckInAndItinerary/TourService.java)
- [Migration](db/migration/V20260122__add_tour_start_date.sql)

---

## 💡 FUTURE ENHANCEMENTS

1. Add `totalDistance` field - tính tổng khoảng cách chuyến đi
2. Add `estimatedDuration` - ước tính thời gian chuyến đi
3. Add `stops` relationship improvement - track chi tiết từng điểm dừng
4. Add `budget` field - theo dõi chi phí chuyến đi
5. Add `participants` - hỗ trợ chuyến đi theo nhóm

