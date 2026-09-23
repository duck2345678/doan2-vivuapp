# ViVu App — Nền tảng Du lịch & Lập Kế hoạch Chuyến đi Thông minh với Multi-Agent AI

Dự án Monorepo gồm ứng dụng di động (**React Native / Expo**), máy chủ nghiệp vụ (**Spring Boot 3 / PostgreSQL / Redis**) và dịch vụ trí tuệ nhân tạo đa tác nhân (**Python FastAPI / LangGraph**).

---

## 📁 Cấu trúc Thư mục Monorepo

```text
doan2-vivuapp/
├── mobile/                   # Ứng dụng di động (React Native 0.81 + Expo SDK 54)
│   ├── app/                  # File-based navigation (Expo Router v6)
│   ├── src/                  # Components, Screens, API client, Hooks
│   ├── assets/               # Hình ảnh, fonts, icons
│   ├── app.json              # Cấu hình Expo
│   └── package.json          # Quản lý dependencies frontend
│
├── backend/                  # Business & Application Server (Spring Boot 3 / Java 21)
│   ├── src/                  # Mã nguồn Java (Auth, CRUD, WebSocket Gateway, Proxy)
│   │   └── main/resources/db/migration/ # Flyway DB migrations
│   ├── pom.xml               # Maven configuration (vivu-backend)
│   ├── Dockerfile            # Container build image
│   └── README.md             # Hướng dẫn chi tiết backend
│
├── vivu-ai-service/          # Multi-Agent Orchestration Service (Python 3.12 / LangGraph)
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint & healthcheck (:8001)
│   │   ├── agents/           # 4 Agents: Supervisor, Destination, Itinerary, Budget
│   │   ├── graph/            # LangGraph StateGraph & workflow nodes
│   │   ├── tools/            # Cost Engine (deterministic), Places, Routes, Validation
│   │   ├── schemas/          # Pydantic v2 runtime contracts
│   │   ├── models/           # TravelPlanState (TypedDict normalized)
│   │   ├── services/         # LLM & session services
│   │   └── prompts/          # System prompts theo vai trò Agent
│   ├── tests/                # Automated Pytest suite (15/15 PASS)
│   ├── Dockerfile            # Container build image
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Hướng dẫn chi tiết AI service
│
├── docker-compose.yml        # Điều phối toàn bộ hạ tầng (Postgres, Redis, Backend, AI)
├── .gitignore                # Gitignore chung toàn bộ dự án
└── README.md                 # Tài liệu tổng quan này
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu Hệ thống
- **Node.js**: >= 20 LTS
- **Java JDK**: >= 21
- **Python**: >= 3.12
- **Docker & Docker Compose**: Khởi chạy container toàn hệ thống

---

### 2. Cách 1: Khởi chạy toàn bộ hệ thống bằng Docker (Khuyên dùng)
Đứng tại thư mục **gốc (root)** của dự án:

```bash
# Build và chạy ngầm toàn bộ: PostgreSQL, Redis, Spring Boot Backend, Python AI Service
docker compose up -d

# Xem log các container
docker compose logs -f

# Dừng hệ thống
docker compose down
```

Các cổng dịch vụ:
* **Spring Boot API Gateway:** `http://localhost:8080`
* **Python AI Service:** `http://localhost:8001` (Health: `http://localhost:8001/health`)
* **PostgreSQL:** `localhost:5432` (`vivudb` / `vivu` / `vivu`)
* **Redis:** `localhost:6379`

---

### 3. Cách 2: Chạy từng dịch vụ cho lập trình viên (Local Development)

#### Bước 3.1: Dựng cơ sở dữ liệu & cache
```bash
docker compose up -d postgres redis
```

#### Bước 3.2: Chạy Spring Boot Backend
```bash
cd backend
.\mvnw.cmd spring-boot:run
```

#### Bước 3.3: Chạy Python AI Service
```bash
cd vivu-ai-service
# Kích hoạt virtualenv và chạy uvicorn
.\.venv\Scripts\uvicorn.exe app.main:app --port 8001 --reload
```

#### Bước 3.4: Chạy Mobile App
```bash
cd mobile
npm install
npm start
```
* Nhấn `a` để mở Android Emulator hoặc quét mã QR bằng ứng dụng **Expo Go**.

---

## 🛠️ Công nghệ Sử dụng

### 1. Mobile (Client)
* **Framework:** React Native 0.81.5, Expo SDK 54 (Expo Router v6)
* **State & Fetching:** Zustand, TanStack React Query v5, Axios
* **Realtime:** STOMP over WebSocket (`@stomp/stompjs`)
* **UI & Animation:** React Native Reanimated, Bottom Sheet, FlashList
* **Maps & Auth:** React Native Maps, Firebase Authentication, Google OAuth2

### 2. Backend (Application & Business Layer)
* **Framework:** Spring Boot 3.3.1 (Java 21)
* **Database & Persistence:** PostgreSQL với Spring Data JPA & Hibernate
* **Database Migration:** Flyway (`V1`..`V4`)
* **Caching & Session:** Redis + Lettuce
* **Realtime Gateway:** WebSocket (STOMP Broker)
* **Security:** Spring Security + Stateless JWT Authentication
* **Media Storage:** Cloudinary SDK

### 3. AI Service (Multi-Agent Orchestration Layer)
* **Framework:** Python 3.12, FastAPI, LangGraph, Pydantic v2
* **Multi-Agent System:** Supervisor Agent, Destination Agent, Itinerary Agent, Budget Agent
* **Cost Engine:** Thuật toán tính toán tài chính số học nguyên deterministic
* **Testing:** Pytest với 15 unit & integration test cases
