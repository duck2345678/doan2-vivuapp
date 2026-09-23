# ViVu AI Service

Dịch vụ AI Orchestration cho nền tảng ViVu App, xây dựng dựa trên kiến trúc Multi-Agent (Supervisor, Destination, Itinerary, Budget) sử dụng LangGraph và Pydantic.

## Nguyên tắc kiến trúc cốt lõi
1. **Stateless Orchestrator**: Python AI Service không kết nối trực tiếp với PostgreSQL. Mọi context và persistence do Spring Boot quản lý.
2. **Boundary Validation**: Mọi dữ liệu vào/ra đều được kiểm thực runtime bằng **Pydantic schemas** (`schemas/`).
3. **Graph State Management**: `TravelPlanState` (`models/state.py`) tuân thủ nguyên tắc LangGraph: *Node thay đổi State, Conditional Edge chỉ quyết định Route*.
4. **Deterministic Cost Engine**: Tiền tệ sử dụng số nguyên `int` (VND), tính toán độc lập không phụ thuộc vào LLM.
5. **Data Provenance**: Mọi dữ liệu địa điểm và đoạn đường đều có nguồn gốc minh bạch (`GOOGLE_PLACES`, `GOOGLE_ROUTES`, `INTERNAL_DATABASE`, v.v.).

## Cấu trúc thư mục
```text
vivu-ai-service/
├── app/
│   ├── core/           # Cấu hình hệ thống (Settings)
│   ├── schemas/        # Pydantic schemas (Data Contracts)
│   ├── models/         # State definitions (LangGraph TypedDict)
│   ├── tools/          # Deterministic engines (Cost, Routing math)
│   └── main.py         # FastAPI Entrypoint
├── tests/              # Pytest verification suites
├── requirements.txt    # Minimal dependencies
└── .env.example
```

## Chạy Unit Test
```bash
# Kích hoạt virtual environment
python -m venv .venv
source .venv/bin/activate  # Hoặc .venv\Scripts\Activate.ps1 trên Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy test
pytest tests/ -v
```
