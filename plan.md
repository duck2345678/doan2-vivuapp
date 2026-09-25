# KẾ HOẠCH TRIỂN KHAI — VIVU AI v2.0

## Multi-Agent Intelligent Travel Planning System

> **Dự án:** ViVu AI — mở rộng từ ViVu App hiện có
> **Phạm vi:** Đồ án môn học / Luận văn tốt nghiệp
> **Timeline:** 8 tuần phát triển + 2 tuần testing, báo cáo và buffer
> **Stack:** React Native + Spring Boot + Python FastAPI + LangGraph + PostgreSQL
> **Optional:** Redis
> **AI/LLM:** Gemini
> **External Data:** Google Places API + Google Routes API + Offline Catalog
>
> **Nguyên tắc:** Tài liệu này là nguồn chuẩn cho kiến trúc, contract, implementation, test, báo cáo và slide.

---

# 1. TẦM NHÌN

ViVu AI không được xây dựng như một chatbot du lịch chỉ sinh văn bản.

Hệ thống phải là một **Multi-Agent Planning System** có khả năng:

1. Hiểu yêu cầu du lịch bằng tiếng Việt.
2. Thu thập địa điểm từ nguồn dữ liệu có kiểm chứng.
3. Tạo lịch trình nhiều ngày.
4. Kiểm tra khoảng cách và thời gian.
5. Tính chi phí bằng công thức deterministic.
6. Phát hiện vượt ngân sách.
7. Tự điều chỉnh lịch trình.
8. Giải thích vì sao hệ thống đưa ra quyết định đó.
9. Cho người dùng chỉnh sửa kế hoạch qua hội thoại.
10. Chỉ lưu chuyến đi khi người dùng xác nhận.

---

# 2. CÂU DEMO CHÍNH

```text
"Đà Lạt 3 ngày 2 đêm, 2 người,
ngân sách 5 triệu,
thích cà phê và thiên nhiên."
```

Luồng xử lý:

```text
User
 ↓
Supervisor Agent
 ↓
Destination Agent
 ↓
Itinerary Agent
 ↓
Budget Agent
 ↓
BUDGET_OK?
 ├─ YES → Finalize
 │
 └─ NO
     ↓
   Optimization Target
     ↓
   Itinerary Re-plan
     ↓
   Budget Re-check
     ↓
   tối đa 3 vòng
```

---

# 3. MỤC TIÊU KỸ THUẬT

Hệ thống cần chứng minh 7 năng lực chính:

| Năng lực            | Yêu cầu                                              |
| ------------------- | ---------------------------------------------------- |
| Natural Language    | Hiểu yêu cầu tiếng Việt                              |
| Multi-Agent         | 4 Agent có trách nhiệm riêng                         |
| Tool Usage          | Agent lấy dữ liệu qua Tool                           |
| Multi-day Planning  | Lịch trình nhiều ngày                                |
| Constraint Planning | Không duplicate, hạn chế di chuyển xa, không overlap |
| Budget Optimization | Phát hiện và tự điều chỉnh khi vượt ngân sách        |
| Explainability      | Reason code và explanation có cấu trúc               |

---

# 4. NHỮNG THỨ KHÔNG LÀM TRONG MVP

Không thêm:

```text
Weather Agent
Food Agent
Hotel Agent
Recommendation Agent
Transport Agent riêng
RAG
Qdrant
Vector Database
Voice Assistant
Booking Agoda / Grab / Be
Admin AI Portal
Kubernetes
Complex CI/CD
```

Những phần này chỉ ghi trong **Future Work**.

Ưu tiên tuyệt đối:

```text
1. Correctness
2. Reliability
3. Testing
4. Demo stability
5. UI polish
6. Optional features
```

---

# 5. KIẾN TRÚC TỔNG THỂ

```text
┌──────────────────────────────────────┐
│         React Native Mobile          │
│                                      │
│ AI Wizard                            │
│ AI Chat                              │
│ Trip Plan                            │
│ Budget Breakdown                     │
└─────────────────┬────────────────────┘
                  │ HTTPS / WebSocket
                  ▼
┌──────────────────────────────────────┐
│             Spring Boot              │
│                                      │
│ Authentication                       │
│ AI Proxy                             │
│ Session Management                   │
│ Persistence                          │
│ WebSocket Gateway                    │
└─────────────────┬────────────────────┘
                  │ Internal HTTP
                  ▼
┌──────────────────────────────────────┐
│       Python FastAPI + LangGraph     │
│                                      │
│ Supervisor                           │
│      ↓                               │
│ Destination                          │
│      ↓                               │
│ Itinerary                            │
│      ↓                               │
│ Budget                               │
│      ↓                               │
│ Optimization Loop                    │
└────────┬───────────────────┬─────────┘
         │                   │
         ▼                   ▼
   Google APIs           Gemini API
 Places / Routes

         │
         ▼
 Offline Places Catalog
```

## Phân chia trách nhiệm

### Spring Boot

```text
Auth
User
CRUD
Database
AI Gateway
Session
WebSocket
Persistence
```

### Python AI Service

```text
NLP parsing
Agent orchestration
Candidate selection
Planning
Constraint validation
Budget calculation
Optimization
Explainability
```

Python AI Service **không trực tiếp lưu Tour chính thức vào database**.

---

# 6. CONTRACT CHUẨN TOÀN HỆ THỐNG

Các tên sau là canonical contract của Python AI Service.

Không thay đổi tùy ý.

## Input

```text
session_id
user_id
raw_prompt
user_preferences
```

## Parsed request

```text
destination_city
duration_days
num_travelers
total_budget
interests
travel_style
travel_pace
hotel_preference
```

## Destination

```text
candidate_pool
selected_place_ids
selected_hotel
```

## Itinerary

```text
itinerary_days
```

## Budget

```text
budget_breakdown
optimization_targets
optimization_context
```

## Optimization

```text
loop_count
max_loops
optimization_exhausted
```

## Observability

```text
trace_logs
warnings
errors
```

## Final

```text
final_plan
final_response_text
```

Không dùng song song các alias như:

```text
destination
num_days
num_people
budget_limit
candidate_places
agent_trace
optimization_round
```

---

# 7. SHARED STATE

`TravelPlanState` là trung tâm của LangGraph.

```python
class TravelPlanState(TypedDict):

    # INPUT
    session_id: str
    user_id: Optional[str]
    raw_prompt: str
    user_preferences: Optional[dict]

    # SUPERVISOR
    intent: Optional[str]
    clarification_question: Optional[str]
    parsed_request: Optional[ParsedUserRequest]

    # DESTINATION
    candidate_pool: list[PlaceCandidate]
    selected_place_ids: list[str]
    selected_hotel: Optional[PlaceCandidate]

    # ITINERARY
    itinerary_days: list[DayItinerary]

    # BUDGET
    budget_breakdown: Optional[BudgetBreakdown]

    # OPTIMIZATION
    optimization_targets: list[OptimizationTarget]
    optimization_context: Optional[OptimizationContext]
    loop_count: int
    max_loops: int
    optimization_exhausted: bool

    # OBSERVABILITY
    trace_logs: list[AgentTraceLog]
    warnings: list[str]
    errors: list[AgentError]

    # FINAL
    final_plan: Optional[FinalTripPlan]
    final_response_text: Optional[str]
```

Giới hạn:

```python
MAX_OPTIMIZATION_LOOPS = 3
```

---

# 8. SUPERVISOR AGENT

## Vai trò

Supervisor chịu trách nhiệm:

```text
Understand
Parse
Clarify
Route
Coordinate
Finalize
```

Supervisor **không tìm địa điểm** và **không tự tính budget**.

## 4 trường bắt buộc

```text
destination_city
duration_days
num_travelers
total_budget
```

Thiếu bất kỳ trường nào → `CLARIFICATION_NEEDED`.

Ví dụ:

```text
User:
"Tôi muốn đi Đà Lạt 3 ngày."

Supervisor:
"Chuyến đi này có bao nhiêu người và
ngân sách dự kiến khoảng bao nhiêu?"
```

Không tự đoán.

## Intent

```text
CREATE_PLAN
CLARIFICATION_NEEDED
GENERAL_CHAT
```

Giai đoạn Multi-turn bổ sung:

```text
MODIFY_PLAN
MODIFY_DAY
CHANGE_PLACE
REDUCE_COST
```

## User preferences

Nếu prompt không ghi rõ:

```text
travel_style
travel_pace
interests
```

Supervisor có thể lấy từ `user_preferences`.

Prompt mới luôn ưu tiên hơn preference cũ.

---

# 9. DESTINATION AGENT

## Trách nhiệm

Destination Agent:

```text
Fetch
Normalize
Validate
Filter
Score
Diversify
Select Hotel
```

Destination **không tạo itinerary**.

## Data source

```text
PlacesProvider
   ├── GooglePlacesProvider
   └── OfflinePlacesProvider
```

Agent không gọi Google trực tiếp.

---

# 10. GOOGLE PLACES STRATEGY

Không chỉ query:

```text
"top places to visit in Da Lat"
```

Thay vào đó:

```text
ATTRACTION query
CAFE query
RESTAURANT query
HOTEL query
        ↓
merge
        ↓
deduplicate place_id
        ↓
normalize
        ↓
validate
        ↓
score
```

Nếu API không có key hoặc lỗi:

```text
Google
 ↓ FAIL
Offline Catalog
```

Không crash toàn workflow.

---

# 11. OFFLINE CATALOG

Offline catalog là fallback chính thức.

Hiện tại gồm:

```text
12 thành phố
77 địa điểm
```

Mỗi thành phố tối thiểu có:

```text
HOTEL
ATTRACTION
CAFE
RESTAURANT
```

Mỗi record phải đảm bảo:

```text
place_id unique
latitude hợp lệ
longitude hợp lệ
không có (0, 0)
category hợp lệ
rating 0..5
provenance tồn tại
```

Không tự generate tọa độ hoặc giá giả.

---

# 12. PLACE PROVENANCE

Các source chuẩn:

```text
GOOGLE_PLACES
GOOGLE_ROUTES
INTERNAL_DATABASE
INTERNAL_ESTIMATE
USER_INPUT
```

Ví dụ:

```json
{
  "source": "GOOGLE_PLACES",
  "source_id": "place-id",
  "retrieved_at": "...",
  "is_estimate": true
}
```

`is_estimate=true` không có nghĩa địa điểm giả.

Nó có nghĩa record có **ít nhất một trường estimate**.

---

# 13. DESTINATION SCORING

Scoring phải tách:

```text
Preference Fit
Quality
Popularity
Travel Style Fit
Budget Fit
```

Không dùng logic:

```text
LUXURY = càng đắt càng tốt
```

Luxury có nghĩa là phù hợp phong cách cao cấp, không phải chỉ có giá cao.

## Budget fit

Budget fit phải xét:

```text
total_budget
duration_days
num_travelers
estimated place cost
```

Ví dụ tính budget allowance thô:

```text
budget_per_person_day
=
total_budget
/
num_travelers
/
duration_days
```

Đây chỉ là **ranking signal**, không phải Budget Agent final calculation.

---

# 14. CANDIDATE POOL SIZE

Không cố định:

```text
5 attractions
3 cafes
3 restaurants
```

cho mọi chuyến đi.

Candidate pool phải phụ thuộc:

```text
duration_days
travel_pace
```

Ví dụ:

```text
RELAXED
≈ 1–2 main activities/day

MODERATE
≈ 2 main activities/day

FAST
≈ 3 main activities/day
```

Destination Agent nên lấy dư candidate để Itinerary có lựa chọn.

Ví dụ:

```text
required stops ≈ 8

candidate pool nên có
12–16 lựa chọn phù hợp
```

---

# 15. ITINERARY AGENT — GIAI ĐOẠN 3

## Mục tiêu

Biến `candidate_pool` thành lịch trình nhiều ngày khả thi.

Pipeline:

```text
candidate_pool
 ↓
remove duplicate
 ↓
geographic grouping
 ↓
allocate candidates to days
 ↓
category balancing
 ↓
time-slot scheduling
 ↓
route validation
 ↓
schedule validation
 ↓
DayItinerary[]
```

---

# 16. GEOGRAPHIC GROUPING

Không dùng K-means như quyết định cuối cùng.

Clustering chỉ là heuristic hỗ trợ.

Ưu tiên đơn giản cho MVP:

```text
Haversine Distance
+
Greedy Geographic Grouping
```

Sau này nếu cần mới dùng:

```text
K-Means
DBSCAN
```

Ví dụ:

```text
Cluster A
Datanla
Thiền viện Trúc Lâm
Hồ Tuyền Lâm

Cluster B
Quảng trường Lâm Viên
Chợ Đà Lạt
Cafe trung tâm
```

Nhưng sau clustering vẫn phải validate:

```text
category
time
pace
cost
opening hours
route
```

---

# 17. ITINERARY SLOT TEMPLATE

Có thể bắt đầu deterministic.

Ví dụ MODERATE:

```text
08:00–09:30  MORNING
10:00–12:00  ATTRACTION
12:15–13:30  LUNCH
14:00–16:00  ATTRACTION
18:00–19:30  DINNER
```

RELAXED:

```text
ít slot hơn
thời lượng dài hơn
buffer lớn hơn
```

FAST:

```text
nhiều activity hơn
buffer ngắn hơn
```

Không để LLM tự phát minh time structure không kiểm soát.

---

# 18. ROUTE TOOL

Tạo:

```text
tools/routes.py
```

Interface tối thiểu:

```python
calculate_route(
    origin,
    destination
)

calculate_route_segments(
    places
)
```

Kết quả:

```text
distance_km
duration_minutes
provenance
```

---

# 19. ROUTE OPTIMIZATION STRATEGY

Không gọi Google Routes cho toàn bộ N² candidate pair.

Pipeline:

```text
Candidate Pool
 ↓
Haversine local calculation
 ↓
Tentative itinerary
 ↓
Google Routes
chỉ validate segment được chọn
```

Ví dụ 5 stops/ngày:

```text
4 route segments
```

thay vì hàng trăm API request.

---

# 20. ROUTES FALLBACK

```text
Google Routes OK
→ dùng dữ liệu thật

Google Routes timeout
→ retry 1 lần

vẫn fail
→ Haversine estimate

provenance:
INTERNAL_ESTIMATE

is_estimate:
true
```

Không crash plan chỉ vì Routes API unavailable.

---

# 21. OPENING HOURS POLICY

Nếu có `start_date`:

```text
strict weekday validation
```

Nếu không có `start_date`:

```text
best-effort validation
```

Không claim:

```text
"Địa điểm chắc chắn mở cửa"
```

khi chưa biết ngày thực tế.

Missing opening hours → neutral, không tự động loại candidate.

---

# 22. ITINERARY VALIDATION

Validator phải kiểm tra:

```text
day_number hợp lệ
không duplicate place
start_time < end_time
không overlap
không quá nhiều activity
travel time hợp lý
place_id thuộc candidate_pool
```

Nếu fail:

```text
repair deterministic nếu có thể

hoặc

retry planning tối đa 1 lần
```

Không loop vô hạn.

---

# 23. BUDGET AGENT — GIAI ĐOẠN 4

Budget Agent là validator tài chính độc lập.

LLM **không được tính tổng tiền**.

Input:

```text
parsed_request
itinerary_days
selected_hotel
candidate_pool
route_segments
```

Output:

```text
BudgetBreakdown
optimization_targets
```

---

# 24. COST SEMANTICS

## Hotel

Ưu tiên:

```text
selected_hotel.estimated_room_cost_per_night
```

Nếu không có:

```text
COST_TABLE[travel_style]["hotel_per_room"]
```

Công thức:

```text
rooms = ceil(num_travelers / 2)

hotel_cost
=
rooms
× num_nights
× room_price
```

---

# 25. FOOD

Chọn đúng một trong hai.

### Có explicit food estimate đáng tin cậy

```text
food_cost = sum(explicit food slots)
```

### Không có

```text
food_cost
=
num_travelers
× duration_days
× meal_per_person_day
```

Không cộng cả hai.

Canonical cost table:

```python
COST_TABLE = {
    "BUDGET": {
        "hotel_per_room": 300_000,
        "meal_per_person_day": 180_000,
    },
    "BALANCED": {
        "hotel_per_room": 700_000,
        "meal_per_person_day": 350_000,
    },
    "LUXURY": {
        "hotel_per_room": 1_500_000,
        "meal_per_person_day": 750_000,
    },
}
```

---

# 26. TICKET

Bắt buộc:

```text
ticket_cost
=
Σ (
    selected_attraction.ticket_price
    × num_travelers
)
```

Không chỉ cộng ticket_price một lần.

---

# 27. TRANSPORT

```text
transport_cost
=
Σ (
route_segment.distance_km
× transport_rate_per_km
)
```

Nếu không có Routes:

```text
estimated distance
+
is_estimate=true
```

---

# 28. MISC COST

Canonical:

```python
MISC_CONTINGENCY_PERCENT = 10
```

```text
subtotal
=
hotel
+ food
+ ticket
+ transport
```

```text
misc_cost
=
subtotal × 10%
```

```text
total_calculated
=
subtotal + misc_cost
```

Không hard-code:

```python
subtotal // 10
```

nếu constant đã tồn tại.

Nên dùng:

```python
misc_cost = (
    subtotal
    * MISC_CONTINGENCY_PERCENT
    // 100
)
```

---

# 29. BUDGET STATUS

```text
total <= total_budget
→ BUDGET_OK
```

```text
total > total_budget
→ OVER_BUDGET
```

Kèm:

```text
remaining
over_amount
```

---

# 30. VÍ DỤ BUDGET ĐÚNG TOÁN

```text
Hotel       1,400,000
Food        1,400,000
Ticket        600,000
Transport     500,000
──────────────────────
Subtotal    3,900,000

Misc 10%      390,000

Total       4,290,000

Budget      5,000,000
Remaining     710,000

Status:
BUDGET_OK
```

---

# 31. OPTIMIZATION LOOP — SIGNATURE FEATURE

Ví dụ:

```text
Initial Plan
total = 5.61M

Budget:
OVER_BUDGET
over = 610k
 ↓
Optimization targets
 ↓
Itinerary re-plan
 ↓
New subtotal = 4.3M
misc = 430k
total = 4.73M
 ↓
BUDGET_OK
```

---

# 32. THỨ TỰ OPTIMIZATION

Không xóa random.

Ưu tiên:

```text
1. Thay lựa chọn đắt bằng lựa chọn tương đương rẻ hơn

2. Thay activity có preference score thấp

3. Bỏ optional stop

4. Thay restaurant/cafe đắt

5. Thay hotel nếu cần

6. Cuối cùng mới bỏ main attraction
```

---

# 33. OPTIMIZATION TARGET

Ví dụ:

```json
{
  "target_category": "ATTRACTION",
  "day_number": 2,
  "slot_index": 3,
  "current_place_id": "DN_ATTR_002",
  "current_cost": 1800000,
  "target_reduction": 600000,
  "reason": "HIGH_COST_LOW_PRIORITY"
}
```

Itinerary Agent phải biết chính xác cần sửa phần nào.

---

# 34. LOOP GUARDS

Mỗi vòng phải đảm bảo:

```text
new_total < previous_total
```

Nếu không giảm:

```text
đổi strategy
hoặc
dừng optimization
```

Giới hạn:

```python
MAX_OPTIMIZATION_LOOPS = 3
```

Sau vòng cuối vẫn quá budget:

```text
optimization_exhausted = true
```

Trả plan tốt nhất tìm được + warning.

Không sửa giả chi phí để ép `BUDGET_OK`.

---

# 35. LANGGRAPH FINAL FLOW

```text
START
  ↓
SUPERVISOR
  │
  ├─ GENERAL_CHAT
  │      ↓
  │     END
  │
  ├─ CLARIFICATION_NEEDED
  │      ↓
  │     END
  │
  └─ CREATE_PLAN
         ↓
    DESTINATION
         ↓
     ITINERARY
         ↓
       BUDGET
        /   \
       /     \
 BUDGET_OK  OVER_BUDGET
     ↓          ↓
 FINALIZE   loop_count < 3?
              /     \
            YES      NO
             ↓        ↓
         OPTIMIZE   FINALIZE
             ↓       WARNING
        ITINERARY
          REPLAN
             ↓
           BUDGET
```

Supervisor không nhất thiết phải chạy lại toàn bộ parse khi optimization.

---

# 36. AGENT TRACE

Status enum:

```text
STARTED
RUNNING
COMPLETED
FAILED
OPTIMIZING
SKIPPED
```

Không thêm `OVER_BUDGET` vào status.

Dùng `stage`.

Ví dụ:

```json
{
  "agent_name": "BudgetAgent",
  "stage": "OVER_BUDGET",
  "status": "COMPLETED",
  "message": "Plan vượt ngân sách 610000 VND"
}
```

Replan:

```json
{
  "agent_name": "ItineraryAgent",
  "stage": "REPLANNING",
  "status": "OPTIMIZING"
}
```

---

# 37. ERROR HANDLING

Agent error:

```text
agent_name
error_code
message
recoverable
timestamp
```

Ví dụ:

```text
NO_CANDIDATES_FOUND
PLACES_API_TIMEOUT
ROUTES_API_TIMEOUT
INVALID_AGENT_OUTPUT
MAX_LOOPS_EXCEEDED
```

Recoverable:

```text
ghi error
ghi warning
fallback
tiếp tục nếu an toàn
```

Non-recoverable:

```text
stop graph
return APIErrorResponse
```

---

# 38. TOOL LAYER

Cấu trúc cuối:

```text
tools/
├── places.py
├── routes.py
├── cost.py
└── validation.py
```

Agent chỉ sử dụng Tool interface.

Không gọi API trực tiếp trong Agent.

---

# 39. VALIDATION LAYER

## Destination

```text
place_id
coordinates
category
region
provenance
```

## Itinerary

```text
duplicate
time overlap
day number
place reference
travel feasibility
```

## Budget

```text
non-negative cost
subtotal correctness
misc correctness
total correctness
status correctness
```

Budget correctness phải đạt:

```text
100%
```

---

# 40. FASTAPI

Internal Python endpoint:

```text
POST /api/v1/plan/generate
```

Input:

```json
{
  "session_id": "...",
  "user_id": "...",
  "raw_prompt": "...",
  "user_preferences": {}
}
```

Output:

```text
intent
parsed_request
candidate_pool
selected_hotel
final_plan
trace_logs
warnings
optimization_exhausted
```

---

# 41. SPRING BOOT API

Public mobile-facing API:

```text
POST /api/ai/plan
POST /api/ai/chat
GET  /api/ai/session/{id}
POST /api/itineraries/{id}/save
```

Spring Boot translate:

```text
Mobile contract
↕
Python internal contract
```

Không bắt Python phải dùng tên field giống Mobile.

---

# 42. WEBSOCKET

WebSocket dùng để stream **agent progress**, không stream chain-of-thought.

Ví dụ:

```json
{
  "type": "AGENT_STATUS",
  "agent": "ITINERARY",
  "status": "RUNNING",
  "stage": "ROUTE_VALIDATION",
  "timestamp": "..."
}
```

Mobile disconnect:

```text
WebSocket fail
 ↓
REST polling fallback
```

---

# 43. PERSISTENCE

Flow:

```text
AI generates plan
 ↓
Preview only
 ↓
User reviews
 ↓
User presses Save
 ↓
Spring Boot validation
 ↓
DB transaction
```

Transaction:

```text
Tour
TourStop[]
BudgetBreakdown
```

Python AI Service không tự persist Tour chính thức.

---

# 44. MULTI-TURN — GIAI ĐOẠN 8

Ví dụ:

```text
"Ngày 2 nhẹ nhàng hơn."
```

Supervisor:

```text
intent = MODIFY_DAY
day_number = 2
```

Chỉ:

```text
Day 2 → replan
```

Giữ:

```text
Day 1
Day 3
```

Sau đó Budget chạy lại.

---

# 45. EXPLAINABILITY

Không lưu raw chain-of-thought.

Lưu decision explanation.

Reason codes chuẩn:

```text
MATCH_PREFERENCE
MATCH_TRAVEL_STYLE
HIGH_RATING
POPULAR_DESTINATION
BUDGET_FIT
LOW_COST
NEARBY_CLUSTER
OPENING_HOURS
HOTEL_PREFERENCE_MATCH
AVOID_DUPLICATE
ROUTE_EFFICIENT
```

UI map reason code thành câu tiếng Việt.

Ví dụ:

```text
MATCH_PREFERENCE
→ "Phù hợp sở thích thiên nhiên của bạn."

NEARBY_CLUSTER
→ "Gần các địa điểm khác trong ngày."

BUDGET_FIT
→ "Phù hợp ngân sách chuyến đi."
```

---

# 46. MOBILE FLOW

```text
Home
 ↓
AI Planner Wizard
 ↓
AI Chat
 ↓
Trip Plan
 ↓
Budget Breakdown
 ↓
Save Trip
```

---

# 47. AI WIZARD

Wizard dùng cho input có cấu trúc:

```text
Destination
Duration
People
Travel style
Travel pace
Interests
Budget
Start date optional
```

Chat dùng cho flexible input.

Hai chức năng bổ trợ nhau.

---

# 48. AI CHAT SCREEN

Hiển thị:

```text
✓ Supervisor
✓ Destination
⏳ Itinerary
○ Budget
```

Không hiển thị nội bộ reasoning của model.

Chỉ hiển thị:

```text
stage
progress
human-readable status
```

---

# 49. TRIP PLAN SCREEN

```text
DAY 1 | DAY 2 | DAY 3
```

Activity:

```text
08:00
Cafe

10:00
Attraction

12:00
Restaurant
```

Hiển thị:

```text
time
place
category
estimated cost
reason
travel time
```

---

# 50. BUDGET UI

Hiển thị:

```text
Budget
Total
Remaining / Over
```

Breakdown:

```text
Hotel
Food
Ticket
Transport
Misc
```

Nếu optimization:

```text
"AI đã điều chỉnh lịch trình
để giảm chi phí 880.000đ."
```

---

# 51. TIẾN ĐỘ HIỆN TẠI

## Giai đoạn 1 — Foundation

```text
[x] Config
[x] Schemas
[x] TravelPlanState
[x] Provenance
[x] Cost Engine foundation
[x] Optimization schemas
```

## Giai đoạn 2 — Supervisor + Destination

```text
[x] Supervisor parsing
[x] Intent
[x] Clarification
[x] Destination Agent
[x] Places Provider
[x] Google fallback
[x] Offline catalog
[x] Candidate scoring
[x] Selected hotel
[x] Phase-2 LangGraph
[x] FastAPI foundation
```

---

# 52. TUẦN 3 — ITINERARY AGENT

Mục tiêu:

```text
candidate_pool
→ itinerary_days
```

Task:

```text
[ ] routes.py interface
[ ] Haversine calculation
[ ] geographic grouping
[ ] category-balanced day allocation
[ ] travel pace rules
[ ] time slot generation
[ ] duplicate protection
[ ] Google Routes validation
[ ] route fallback
[ ] itinerary validator
[ ] reason codes
```

Tests:

```text
3-day itinerary
no duplicate
no overlap
long-distance penalty
RELAXED vs FAST
route API fail
opening hours unknown
```

Deliverable:

```text
Structured DayItinerary[]
```

---

# 53. TUẦN 4 — BUDGET + OPTIMIZATION

Task:

```text
[ ] BudgetAgent
[ ] explicit hotel cost
[ ] fallback hotel table
[ ] explicit food cost
[ ] fallback food table
[ ] ticket × travelers
[ ] transport cost
[ ] 10% misc
[ ] Budget validator
[ ] optimization_targets
[ ] optimization_context
[ ] re-plan logic
[ ] loop_count
[ ] MAX 3 loops
[ ] optimization exhausted
```

Killer test:

```text
Initial:
5.61M
→ OVER_BUDGET

Re-plan:
4.73M
→ BUDGET_OK
```

Deliverable:

```text
4 Agent backend chạy end-to-end
```

Đây là milestone quan trọng nhất.

---

# 54. TUẦN 5 — SPRING BOOT BRIDGE

```text
[ ] AIOrchestratorService
[ ] Python HTTP client
[ ] AI controllers
[ ] DTO mapping
[ ] authentication forwarding
[ ] timeout handling
[ ] WebSocket agent events
[ ] Python → Spring error mapping
```

Deliverable:

```text
Mobile
→ Spring
→ Python
→ Spring
→ Mobile
```

---

# 55. TUẦN 6 — AI CHAT

```text
[ ] AIChatScreen
[ ] message list
[ ] composer
[ ] AgentProgressCard
[ ] WebSocket
[ ] reconnect
[ ] polling fallback
[ ] completed navigation
```

---

# 56. TUẦN 7 — TRIP PLAN + BUDGET UI

```text
[ ] DayTabs
[ ] ActivityTimeline
[ ] selected-day map
[ ] ExplanationCard
[ ] BudgetProgress
[ ] Budget Breakdown
[ ] over-budget warning
[ ] optimization explanation
```

---

# 57. TUẦN 8 — MULTI-TURN + SAVE

Multi-turn:

```text
[ ] MODIFY_DAY
[ ] REDUCE_COST
[ ] CHANGE_PLACE
[ ] partial itinerary replan
```

Persistence:

```text
[ ] save AI plan
[ ] DB transaction
[ ] session restore
[ ] conversation history
```

Reliability:

```text
[ ] Places timeout
[ ] Routes timeout
[ ] Gemini error
[ ] invalid structured output
[ ] impossible budget
[ ] WebSocket disconnect
```

---

# 58. TUẦN 9 — TEST + EVALUATION + DEPLOY

```text
[ ] Agent unit tests
[ ] Graph integration tests
[ ] 30–50 evaluation prompts
[ ] Docker Compose
[ ] staging deployment
[ ] performance measurement
```

Evaluation dataset:

```text
10 normal planning
10 varied preferences
5 budget constrained
5 clarification
5 multi-turn
5 edge cases
```

---

# 59. TUẦN 10 — REPORT + DEMO + BUFFER

```text
[ ] freeze feature
[ ] fix bugs
[ ] UI polish
[ ] architecture diagram
[ ] agent collaboration diagram
[ ] sequence diagram
[ ] ERD
[ ] API docs
[ ] evaluation result
[ ] slides
[ ] demo script
```

Không thêm feature mới.

---

# 60. TESTING STRATEGY

## Supervisor

```text
full input
missing destination
missing days
missing travelers
missing budget
general chat
5 triệu
5.5 triệu
500k
5.000.000 VND
phone number not budget
user_preferences fallback
```

## Destination

```text
valid region
invalid region
diversity
budget fit
preference fit
selected hotel
offline fallback
duplicate place
duration-aware pool
pace-aware pool
```

## Itinerary

```text
correct day count
no duplicate
no overlap
reasonable slots
route segments
RELAXED
MODERATE
FAST
```

## Budget

```text
rooms
hotel
food
ticket × travelers
transport
misc 10%
subtotal
total
remaining
over_amount
BUDGET_OK
OVER_BUDGET
```

## Graph

```text
GENERAL_CHAT
CLARIFICATION
CREATE_PLAN
happy path
budget optimization
optimization exhausted
provider failure
routes failure
```

---

# 61. INTEGRATION SCENARIOS

## Scenario A — Happy path

```text
User
→ Supervisor
→ Destination
→ Itinerary
→ Budget OK
→ Final plan
```

## Scenario B — Optimization

```text
Plan
→ OVER_BUDGET
→ Target
→ Re-plan
→ Budget OK
```

## Scenario C — Impossible budget

```text
Plan
→ OVER
→ round 1
→ OVER
→ round 2
→ OVER
→ round 3
→ OVER
→ warning
```

Không fake budget.

## Scenario D — API failure

```text
Google Places timeout
→ retry
→ offline fallback
→ plan continues
```

## Scenario E — Routes failure

```text
Routes timeout
→ estimate
→ is_estimate=true
→ plan continues
```

## Scenario F — Multi-turn

```text
"Ngày 2 nhẹ hơn"

Day 2 changes
Day 1 remains
Day 3 remains
Budget recalculated
```

---

# 62. METRICS

## Parsing

```text
≥ 90%
```

Fields:

```text
destination
duration
travelers
budget
interests
```

## Place validity

```text
100%
```

## Schedule validity

```text
100% no duplicate
100% no overlap
```

## Budget mathematical correctness

```text
100%
```

## Budget optimization

Với case khả thi:

```text
≥ 90% đạt BUDGET_OK trong <= 3 vòng
```

## Agent trace

Chỉ áp dụng cho:

```text
CREATE_PLAN
```

Target:

```text
100% request thành công
có đủ Supervisor
Destination
Itinerary
Budget
```

Không áp dụng cho GENERAL_CHAT / CLARIFICATION.

---

# 63. PERFORMANCE TARGET

Không đặt mục tiêu quá lý tưởng trước benchmark.

MVP target:

```text
Simple plan warm p95
≤ 10 sec

Multi-day plan warm p95
≤ 20 sec

Optimization plan
≤ 30 sec
```

Sau khi đo thật mới tối ưu thêm.
