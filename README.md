# ViVu App - Nền tảng Du lịch & Kết nối Cộng đồng Thông minh

Dự án Monorepo gồm ứng dụng di động (**React Native / Expo**) và hệ thống máy chủ dịch vụ (**Spring Boot / PostgreSQL / Redis / AI**).

---

## 📁 Cấu trúc Thư mục Monorepo

```
vivu-app/
├── mobile/                   # Ứng dụng di động (React Native + Expo SDK 54)
│   ├── app/                  # File-based navigation (Expo Router v6)
│   ├── src/                  # Mã nguồn tính năng, components, API client
│   ├── assets/               # Hình ảnh, icon, font
│   ├── app.json              # Cấu hình Expo (ViVu, scheme: vivuapp, com.vivu.app)
│   └── package.json          # Quản lý thư viện frontend (vivu-mobile)
│
├── backend/                  # REST & Realtime WebSocket API (Spring Boot 3)
│   ├── src/                  # Mã nguồn Java (com.example.vivuapp)
│   ├── pom.xml               # Maven configuration (vivu-backend)
│   ├── Dockerfile            # Container build image
│   └── docker-compose.yml    # Khởi chạy Postgres, Redis và Backend local
│
├── docs/                     # Tài liệu thiết kế hệ thống, API và báo cáo
│   └── openapi.yaml          # Đặc tả API OpenAPI 3.0
│
├── docker-compose.yml        # Docker Compose root khởi động toàn bộ hạ tầng
├── .gitignore                # Gitignore chung cho toàn bộ dự án
└── README.md                 # Tài liệu hướng dẫn này
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu Hệ thống
- **Node.js**: >= 20 (khuyên dùng Node 20/22 LTS)
- **Java JDK**: >= 21 (đã hỗ trợ Java 21 & Java 23)
- **Docker & Docker Compose**: Để chạy PostgreSQL & Redis

---

### 2. Khởi chạy Backend (`backend/`)

#### Bước 2.1: Chạy cơ sở dữ liệu (PostgreSQL & Redis)
Bạn có thể sử dụng Docker để dựng cơ sở dữ liệu nhanh chóng:
```bash
docker compose up -d postgres redis
```
- PostgreSQL: `localhost:5432` (Database: `vivudb`, User: `vivu`, Password: `vivu`)
- Redis: `localhost:6379`

#### Bước 2.2: Chạy ứng dụng Spring Boot
```bash
cd backend

# Chạy trực tiếp qua Maven Wrapper
.\mvnw.cmd spring-boot:run
```
Máy chủ backend sẽ chạy tại: `http://localhost:8080` (hoặc cổng được chỉ định trong `.env`).

---

### 3. Khởi chạy Ứng dụng Di động (`mobile/`)

```bash
cd mobile

# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy Metro Bundler với Expo
npm start
```

- Nhấn `a` để chạy trên Android Emulator hoặc thiết bị Android thật đã kết nối.
- Nhấn `i` để chạy trên iOS Simulator (trên macOS).
- Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại.

---

## 🛠️ Công nghệ Sử dụng

### Frontend (Mobile):
- **Framework**: React Native 0.81.5, Expo ~54.0.32
- **Routing**: Expo Router v6
- **State Management**: Zustand
- **Data Fetching & Cache**: TanStack React Query v5, Axios
- **Realtime**: STOMP over WebSocket (`@stomp/stompjs`)
- **UI Components & Motion**: React Native Reanimated, Bottom Sheet, FlashList
- **Maps**: React Native Maps & Google Places API
- **Auth**: Firebase Authentication & Google OAuth2

### Backend (API):
- **Framework**: Spring Boot 3.3.1 (Java 21)
- **Database**: PostgreSQL với Spring Data JPA & Hibernate
- **Caching & Realtime state**: Redis + Lettuce
- **Realtime**: WebSocket (STOMP Broker)
- **AI Integration**: Google Gemini API (Gợi ý lịch trình & phân tích địa điểm)
- **Cloud Media**: Cloudinary SDK (Upload hình ảnh, video)
- **Security**: Spring Security + Stateless JWT Authentication
