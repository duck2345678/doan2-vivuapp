ViVu AI Service — Full Source Giai đoạn 1 & 2 (Revised + Offline Catalog thật)

Bản này đã ghép offline_places.py đầy đủ do người dùng cung cấp. Kiểm tra cục bộ: python -m compileall PASS và pytest 9/9 PASS.
Lưu ý: môi trường kiểm tra hiện tại chưa cài langgraph, nên chưa chạy end-to-end FastAPI/LangGraph runtime trong chính môi trường này. Dependency đã có trong requirements.txt.

app/core/config.py

from __future__ import annotations

import os
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "ViVu AI Service"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8001")), ge=1, le=65535)
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()
    google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    google_places_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("GOOGLE_PLACES_TIMEOUT_SECONDS", "5.0")),
        gt=0,
        le=30,
    )


settings = Settings()

app/schemas/common.py

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Provenance(BaseModel):
    """
    Nguồn gốc bản ghi.

    is_estimate=True chỉ có nghĩa bản ghi chứa ít nhất một trường ước tính
    (ví dụ priceLevel -> estimated cost), không có nghĩa tên/tọa độ/rating là giả lập.
    """

    source: Literal[
        "GOOGLE_PLACES",
        "GOOGLE_ROUTES",
        "INTERNAL_DATABASE",
        "INTERNAL_ESTIMATE",
        "USER_INPUT",
    ]
    source_id: Optional[str] = None
    retrieved_at: str = Field(default_factory=utc_now_iso)
    is_estimate: bool = False


class AgentError(BaseModel):
    agent_name: Literal["Supervisor", "DestinationAgent", "ItineraryAgent", "BudgetAgent"]
    error_code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    timestamp: str = Field(default_factory=utc_now_iso)
    recoverable: bool = True


class AgentTraceLog(BaseModel):
    agent_name: str
    stage: str
    status: Literal["STARTED", "RUNNING", "COMPLETED", "FAILED", "OPTIMIZING", "SKIPPED"]
    message: str
    duration_ms: Optional[int] = Field(default=None, ge=0)
    timestamp: str = Field(default_factory=utc_now_iso)

app/schemas/request.py

from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class ParsedUserRequest(BaseModel):
    destination_city: str
    duration_days: int = Field(ge=1, le=14)
    num_travelers: int = Field(ge=1, le=50)
    total_budget: int = Field(ge=0, description="Tổng ngân sách chuyến đi tính bằng VND nguyên")
    interests: List[str] = Field(default_factory=list)
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED"
    travel_pace: Literal["RELAXED", "MODERATE", "FAST"] = "MODERATE"
    hotel_preference: Optional[str] = None

app/schemas/place.py

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.common import Provenance


class PlaceCandidate(BaseModel):
    place_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    category: Literal["ATTRACTION", "CAFE", "RESTAURANT", "HOTEL"]
    interests: List[str] = Field(default_factory=list)
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    user_ratings_total: int = Field(default=0, ge=0)
    address: str = ""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    opening_hours: Optional[Dict[str, Any]] = None

    # None = provider không có dữ liệu. Không dùng 0 để biểu diễn "không biết".
    estimated_cost_per_person: Optional[int] = Field(
        default=None,
        ge=0,
        description=(
            "Chi phí ước tính theo người/lượt. None nghĩa là chưa biết; 0 chỉ dùng khi xác định là miễn phí."
        ),
    )
    ticket_price: Optional[int] = Field(
        default=None,
        ge=0,
        description="Giá vé theo người. None nghĩa là provider không cung cấp/không xác định.",
    )
    estimated_room_cost_per_night: Optional[int] = Field(
        default=None,
        ge=0,
        description="Giá phòng ước tính/phòng/đêm; None nếu chưa xác định.",
    )

    provenance: Provenance
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    reason_codes: List[str] = Field(default_factory=list)

app/schemas/itinerary.py

from __future__ import annotations

from datetime import time
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import Provenance


class TimeSlot(BaseModel):
    slot_type: Literal["MORNING", "LUNCH", "AFTERNOON", "DINNER", "EVENING"]
    start_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    place_id: str = Field(..., min_length=1)
    place_name: str = Field(..., min_length=1)
    activity_description: str = ""
    reason_codes: List[str] = Field(default_factory=list)
    estimated_cost: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_time_range(self) -> "TimeSlot":
        start = time.fromisoformat(self.start_time)
        end = time.fromisoformat(self.end_time)
        if end <= start:
            raise ValueError("end_time phải lớn hơn start_time trong cùng một ngày")
        return self


class RouteSegment(BaseModel):
    from_place_id: str = Field(..., min_length=1)
    to_place_id: str = Field(..., min_length=1)
    distance_km: float = Field(default=0.0, ge=0.0)
    duration_minutes: int = Field(default=0, ge=0)
    provenance: Provenance


class DayItinerary(BaseModel):
    day_number: int = Field(..., ge=1)
    date_label: Optional[str] = None
    time_slots: List[TimeSlot] = Field(default_factory=list)
    route_segments: List[RouteSegment] = Field(default_factory=list)
    total_travel_distance_km: float = Field(default=0.0, ge=0.0)
    total_travel_time_minutes: int = Field(default=0, ge=0)
    daily_cost: int = Field(default=0, ge=0)

app/schemas/budget.py

from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class BudgetBreakdown(BaseModel):
    hotel_cost: int = Field(default=0, ge=0)
    food_cost: int = Field(default=0, ge=0)
    ticket_cost: int = Field(default=0, ge=0)
    transport_cost: int = Field(default=0, ge=0)
    subtotal: int = Field(default=0, ge=0)
    misc_cost: int = Field(default=0, ge=0)                   # 10% subtotal
    total_calculated: int = Field(default=0, ge=0)
    max_budget: int = Field(default=0, ge=0)
    remaining: int = Field(default=0, ge=0)                   # max(0, max_budget - total_calculated) khi BUDGET_OK
    status: Literal["BUDGET_OK", "OVER_BUDGET"]
    over_amount: int = Field(default=0, ge=0)

class OptimizationTarget(BaseModel):
    target_category: Literal["HOTEL", "RESTAURANT", "CAFE", "ATTRACTION"]
    day_number: Optional[int] = Field(default=None, ge=1)
    slot_index: Optional[int] = Field(default=None, ge=0)
    current_place_id: str
    current_cost: int = Field(..., ge=0)                      # VND nguyên >= 0
    target_reduction: int = Field(..., ge=0)                  # VND nguyên >= 0
    reason: str                                               # Lý do cụ thể

class OptimizationContext(BaseModel):
    previous_total: int = Field(default=0, ge=0)              # VND nguyên
    target_reduction_total: int = Field(default=0, ge=0)      # VND nguyên
    affected_days: List[int] = Field(default_factory=list)
    iteration_summary: str = ""

app/schemas/travel_plan.py

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import utc_now_iso
from app.schemas.itinerary import DayItinerary
from app.schemas.budget import BudgetBreakdown
from app.schemas.place import PlaceCandidate

class FinalTripPlan(BaseModel):
    destination_city: str
    duration_days: int
    num_travelers: int
    total_budget: int                    # VND nguyên
    itinerary_days: List[DayItinerary] = Field(default_factory=list)
    budget_breakdown: BudgetBreakdown
    selected_hotel: Optional[PlaceCandidate] = None
    generated_at: str = Field(default_factory=utc_now_iso)

app/schemas/api.py

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.schemas.common import AgentError, AgentTraceLog, utc_now_iso
from app.schemas.travel_plan import FinalTripPlan
from app.schemas.request import ParsedUserRequest
from app.schemas.place import PlaceCandidate


class PlanGenerateRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    user_id: Optional[str] = Field(default=None, max_length=128)
    raw_prompt: str = Field(..., min_length=2, max_length=5000)
    user_preferences: Optional[Dict[str, Any]] = None


class PlanGenerateResponse(BaseModel):
    success: bool = True
    session_id: str
    intent: Optional[Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]] = None
    parsed_request: Optional[ParsedUserRequest] = None
    candidate_pool: List[PlaceCandidate] = Field(default_factory=list)
    selected_hotel: Optional[PlaceCandidate] = None
    clarification_question: Optional[str] = None
    final_plan: Optional[FinalTripPlan] = None
    final_response_text: Optional[str] = None
    trace_logs: List[AgentTraceLog] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[AgentError] = Field(default_factory=list)
    optimization_exhausted: bool = False
    generated_at: str = Field(default_factory=utc_now_iso)


class APIErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str
    session_id: Optional[str] = None
    timestamp: str = Field(default_factory=utc_now_iso)

app/models/state.py

from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional, TypedDict
from app.schemas.common import AgentError, AgentTraceLog
from app.schemas.request import ParsedUserRequest
from app.schemas.place import PlaceCandidate
from app.schemas.itinerary import DayItinerary
from app.schemas.budget import BudgetBreakdown, OptimizationTarget, OptimizationContext
from app.schemas.travel_plan import FinalTripPlan

# Giới hạn số lần re-planning tối đa của Budget Optimization Loop (chuẩn 3 vòng)
MAX_OPTIMIZATION_LOOPS = 3

class TravelPlanState(TypedDict):
    # 1. INPUT (Từ Spring Boot Bridge)
    session_id: str
    user_id: Optional[str]
    raw_prompt: str
    user_preferences: Optional[Dict[str, Any]]

    # 2. PARSED DATA (Supervisor Agent)
    intent: Optional[Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]]
    clarification_question: Optional[str]
    parsed_request: Optional[ParsedUserRequest]

    # 3. CANDIDATES POOL (Destination Agent - Normalized Data Store)
    candidate_pool: List[PlaceCandidate]
    selected_place_ids: List[str]         # Track các ID đang được dùng trên lịch trình
    selected_hotel: Optional[PlaceCandidate]

    # 4. ITINERARY (Itinerary Agent)
    itinerary_days: List[DayItinerary]

    # 5. BUDGET (Budget Agent)
    budget_breakdown: Optional[BudgetBreakdown]

    # 6. OPTIMIZATION CONTROL (Re-planning Loop)
    optimization_targets: List[OptimizationTarget]
    optimization_context: Optional[OptimizationContext]
    loop_count: int                       # 0: initial, 1..3: replan lần 1..3
    max_loops: int                        # Cố định = MAX_OPTIMIZATION_LOOPS (3)
    optimization_exhausted: bool          # True nếu sau 3 vòng vẫn OVER_BUDGET

    # 7. OBSERVABILITY & RESILIENCE
    trace_logs: List[AgentTraceLog]
    warnings: List[str]
    errors: List[AgentError]

    # 8. FINAL OUTPUT (Trả về Spring Boot)
    final_plan: Optional[FinalTripPlan]
    final_response_text: Optional[str]

app/tools/cost.py

from __future__ import annotations

from typing import Dict, Literal, Optional
from app.schemas.budget import BudgetBreakdown


COST_TABLE: Dict[str, Dict[str, int]] = {
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

DEFAULT_TRANSPORT_RATE_PER_KM = 10_000
MISC_CONTINGENCY_PERCENT = 10


def calculate_rooms(num_travelers: int) -> int:
    if num_travelers <= 0:
        raise ValueError("num_travelers phải lớn hơn 0")
    return (num_travelers + 1) // 2


def calculate_budget(
    *,
    num_travelers: int,
    num_days: int,
    num_nights: int,
    max_budget: int,
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED",
    ticket_cost: int = 0,
    transport_cost: int = 0,
    explicit_hotel_cost: Optional[int] = None,
    explicit_food_cost: Optional[int] = None,
) -> BudgetBreakdown:
    if travel_style not in COST_TABLE:
        raise ValueError(f"travel_style không hợp lệ: {travel_style!r}")
    if num_travelers <= 0:
        raise ValueError("num_travelers phải lớn hơn 0")
    if num_days <= 0:
        raise ValueError("num_days phải lớn hơn 0")
    if num_nights < 0 or num_nights > num_days:
        raise ValueError("num_nights phải nằm trong khoảng 0..num_days")

    numeric_values = {
        "max_budget": max_budget,
        "ticket_cost": ticket_cost,
        "transport_cost": transport_cost,
    }
    if explicit_hotel_cost is not None:
        numeric_values["explicit_hotel_cost"] = explicit_hotel_cost
    if explicit_food_cost is not None:
        numeric_values["explicit_food_cost"] = explicit_food_cost
    for name, value in numeric_values.items():
        if value < 0:
            raise ValueError(f"{name} không được âm")

    rates = COST_TABLE[travel_style]
    rooms = calculate_rooms(num_travelers)

    hotel_cost = (
        explicit_hotel_cost
        if explicit_hotel_cost is not None
        else rooms * num_nights * rates["hotel_per_room"]
    )
    food_cost = (
        explicit_food_cost
        if explicit_food_cost is not None
        else num_travelers * num_days * rates["meal_per_person_day"]
    )

    subtotal = hotel_cost + food_cost + ticket_cost + transport_cost
    misc_cost = subtotal * MISC_CONTINGENCY_PERCENT // 100
    total_calculated = subtotal + misc_cost
    is_ok = total_calculated <= max_budget

    return BudgetBreakdown(
        hotel_cost=hotel_cost,
        food_cost=food_cost,
        ticket_cost=ticket_cost,
        transport_cost=transport_cost,
        subtotal=subtotal,
        misc_cost=misc_cost,
        total_calculated=total_calculated,
        max_budget=max_budget,
        remaining=max(0, max_budget - total_calculated),
        status="BUDGET_OK" if is_ok else "OVER_BUDGET",
        over_amount=max(0, total_calculated - max_budget),
    )

app/schemas/supervisor.py

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


SupervisorIntent = Literal["CREATE_PLAN", "CLARIFICATION_NEEDED", "GENERAL_CHAT"]


class SupervisorParseResult(BaseModel):
    intent: SupervisorIntent
    destination_city: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=14)
    num_travelers: Optional[int] = Field(default=None, ge=1, le=50)
    total_budget: Optional[int] = Field(default=None, ge=0)
    interests: List[str] = Field(default_factory=list)
    travel_style: Literal["BUDGET", "BALANCED", "LUXURY"] = "BALANCED"
    travel_pace: Literal["RELAXED", "MODERATE", "FAST"] = "MODERATE"
    travel_style_explicit: bool = False
    travel_pace_explicit: bool = False
    hotel_preference: Optional[str] = None
    missing_fields: List[str] = Field(default_factory=list)
    clarification_question: Optional[str] = None
    response_text: Optional[str] = None

app/prompts/supervisor.py

from __future__ import annotations

SUPERVISOR_SYSTEM_PROMPT = """Bạn là Supervisor Agent của hệ thống ViVu - ứng dụng lập kế hoạch du lịch thông minh đa tác tử (Multi-Agent).
Nhiệm vụ của bạn là:
1. Phân tích yêu cầu tự nhiên (tiếng Việt) từ người dùng.
2. Trích xuất các tham số chính xác:
   - destination_city: Thành phố điểm đến (chuẩn hóa tên tiếng Việt có dấu, ví dụ: "Đà Lạt", "Đà Nẵng", "Hà Nội", "Hồ Chí Minh").
   - duration_days: Số ngày đi (từ 1 đến 14 ngày).
   - num_travelers: Số lượng người tham gia (chính sách bắt buộc, từ 1 đến 50 người).
   - total_budget: Tổng ngân sách toàn bộ chuyến đi tính theo VNĐ (số nguyên >= 0).
   - interests: Danh sách sở thích (ví dụ: ["CAFE", "NATURE", "FOOD", "CULTURE", "RELAX"]).
   - travel_style: Phong cách du lịch ("BUDGET", "BALANCED", "LUXURY").
   - travel_pace: Nhịp độ di chuyển ("RELAXED", "MODERATE", "FAST").
3. Xác định Intent:
   - "GENERAL_CHAT": Nếu người dùng chỉ chào hỏi, hỏi thông tin chung không liên quan đến lập chuyến đi.
   - "CLARIFICATION_NEEDED": Nếu là yêu cầu lập chuyến đi nhưng THIẾU ít nhất 1 trong 4 trường bắt buộc (destination_city, duration_days, num_travelers, total_budget). Cần chỉ rõ missing_fields và đặt câu hỏi clarification_question lịch sự, tự nhiên.
   - "CREATE_PLAN": Khi đã có ĐỦ cả 4 trường bắt buộc.

Quy tắc bất biến:
- KHÔNG tự tiện bịa (hallucinate) điểm đến hoặc ngân sách khi người dùng chưa cung cấp.
- Nếu thiếu thông tin, luôn hỏi lại nhẹ nhàng và thân thiện bằng tiếng Việt.
"""

app/agents/supervisor.py

from __future__ import annotations

import re
from typing import List, Optional
from app.schemas.supervisor import SupervisorParseResult, SupervisorIntent
from app.schemas.request import ParsedUserRequest


CITY_MAPPINGS = [
    ("Đà Lạt", [r"\bđà lạt\b", r"\bda lat\b", r"\bdalat\b"]),
    ("Đà Nẵng", [r"\bđà nẵng\b", r"\bda nang\b", r"\bdanang\b"]),
    ("Hà Nội", [r"\bhà nội\b", r"\bha noi\b", r"\bhanoi\b"]),
    ("Hồ Chí Minh", [r"\bhồ chí minh\b", r"\bho chi minh\b", r"\bsài gòn\b", r"\bsai gon\b", r"\btphcm\b", r"\bhcm\b"]),
    ("Nha Trang", [r"\bnha trang\b", r"\bnhatrang\b"]),
    ("Phú Quốc", [r"\bphú quốc\b", r"\bphu quoc\b", r"\bphuquoc\b"]),
    ("Vũng Tàu", [r"\bvũng tàu\b", r"\bvung tau\b", r"\bvungtau\b"]),
    ("Huế", [r"\bhuế\b", r"\bhue\b"]),
    ("Hội An", [r"\bhội an\b", r"\bhoi an\b", r"\bhoian\b"]),
    ("Quy Nhơn", [r"\bquy nhơn\b", r"\bquy nhon\b", r"\bquynhon\b"]),
    ("Sa Pa", [r"\bsa pa\b", r"\bsapa\b"]),
    ("Ninh Bình", [r"\bninh bình\b", r"\bninh binh\b"]),
    ("Phan Thiết", [r"\bphan thiết\b", r"\bphan thiet\b", r"\bmũi né\b", r"\bmui ne\b"]),
    ("Cần Thơ", [r"\bcần thơ\b", r"\bcan tho\b"]),
]

INTEREST_KEYWORDS = [
    ("CAFE", [r"\bcà phê\b", r"\bcafe\b", r"\bcoffee\b", r"\bquán nước\b"]),
    ("NATURE", [r"\bthiên nhiên\b", r"\bnature\b", r"\brừng\b", r"\bnúi\b", r"\bthác\b", r"\bcảnh đẹp\b"]),
    ("FOOD", [r"\bẩm thực\b", r"\băn uống\b", r"\bfood\b", r"\bmón ngon\b", r"\bquán ăn\b", r"\bđặc sản\b"]),
    ("CULTURE", [r"\bvăn hóa\b", r"\blịch sử\b", r"\bchùa\b", r"\bdi tích\b", r"\bbảo tàng\b"]),
    ("RELAX", [r"\bnghỉ dưỡng\b", r"\brelax\b", r"\bchill\b", r"\byên tĩnh\b", r"\bthư giãn\b"]),
    ("CHECKIN", [r"\bcheckin\b", r"\bcheck-in\b", r"\bsống ảo\b", r"\bchụp ảnh\b", r"\bảnh đẹp\b"]),
    ("BEACH", [r"\bbiển\b", r"\btắm biển\b", r"\bbãi biển\b"]),
]

TRAVEL_KEYWORDS = [
    r"\bđi\b", r"\bdu lịch\b", r"\blịch trình\b", r"\btour\b", r"\bchuyến đi\b", r"\bphượt\b",
]

GREETING_PATTERNS = [
    r"^xin chào[!. ]*$", r"^chào bạn[!. ]*$", r"^hello[!. ]*$", r"^hi[!. ]*$", r"^tạm biệt[!. ]*$",
]


class SupervisorAgent:
    def parse(self, raw_prompt: str) -> SupervisorParseResult:
        text = raw_prompt.strip().lower()

        destination = self._extract_destination(text)
        days = self._extract_days(text)
        travelers = self._extract_travelers(text)
        budget = self._extract_budget(text)
        interests = self._extract_interests(text)
        travel_style, travel_style_explicit = self._extract_travel_style(text)
        travel_pace, travel_pace_explicit = self._extract_travel_pace(text)
        hotel_pref = self._extract_hotel_preference(text)

        explicit_travel_signal = any(re.search(p, text) for p in TRAVEL_KEYWORDS)
        structured_count = sum(v is not None for v in (destination, days, travelers, budget))
        structured_travel_signal = structured_count >= 2
        interest_signal = bool(interests) and destination is not None

        if self._is_greeting_only(text):
            return self._general_chat_result("Xin chào! Mình có thể giúp bạn lập kế hoạch du lịch theo điểm đến, số ngày, số người và ngân sách.")

        if not (explicit_travel_signal or structured_travel_signal or interest_signal):
            return self._general_chat_result(
                "Mình là ViVu AI, tập trung hỗ trợ lập kế hoạch du lịch. Nếu bạn muốn tạo chuyến đi, hãy cho mình biết điểm đến, số ngày, số người và ngân sách."
            )

        missing_fields: List[str] = []
        if destination is None:
            missing_fields.append("destination_city")
        if days is None:
            missing_fields.append("duration_days")
        if travelers is None:
            missing_fields.append("num_travelers")
        if budget is None:
            missing_fields.append("total_budget")

        intent: SupervisorIntent = "CLARIFICATION_NEEDED" if missing_fields else "CREATE_PLAN"
        question = self._generate_clarification_question(missing_fields, destination) if missing_fields else None

        return SupervisorParseResult(
            intent=intent,
            destination_city=destination,
            duration_days=days,
            num_travelers=travelers,
            total_budget=budget,
            interests=interests,
            travel_style=travel_style,
            travel_pace=travel_pace,
            travel_style_explicit=travel_style_explicit,
            travel_pace_explicit=travel_pace_explicit,
            hotel_preference=hotel_pref,
            missing_fields=missing_fields,
            clarification_question=question,
        )

    def to_parsed_user_request(self, result: SupervisorParseResult) -> Optional[ParsedUserRequest]:
        if result.intent != "CREATE_PLAN":
            return None
        if any(v is None for v in (result.destination_city, result.duration_days, result.num_travelers, result.total_budget)):
            return None
        return ParsedUserRequest(
            destination_city=result.destination_city,
            duration_days=result.duration_days,
            num_travelers=result.num_travelers,
            total_budget=result.total_budget,
            interests=result.interests,
            travel_style=result.travel_style,
            travel_pace=result.travel_pace,
            hotel_preference=result.hotel_preference,
        )

    def _general_chat_result(self, response_text: str) -> SupervisorParseResult:
        return SupervisorParseResult(intent="GENERAL_CHAT", response_text=response_text)

    def _is_greeting_only(self, text: str) -> bool:
        return any(re.search(p, text) for p in GREETING_PATTERNS)

    def _extract_destination(self, text: str) -> Optional[str]:
        for city_name, patterns in CITY_MAPPINGS:
            if any(re.search(pattern, text) for pattern in patterns):
                return city_name
        return None

    def _extract_days(self, text: str) -> Optional[int]:
        patterns = [
            r"(\d+)\s*[nN](?=\s*\d+\s*[dD]\b)",
            r"(\d+)\s*(?:ngày|ngay)\s*\d+\s*(?:đêm|dem)",
            r"(\d+)\s*(?:ngày|ngay|days?|d\b)",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                val = int(m.group(1))
                if 1 <= val <= 14:
                    return val
        return None

    def _extract_travelers(self, text: str) -> Optional[int]:
        if re.search(r"\b(?:1 mình|một mình|độc hành)\b", text):
            return 1
        if re.search(r"\b(?:2 vợ chồng|hai vợ chồng|cặp đôi)\b", text):
            return 2
        m = re.search(r"(\d+)\s*(?:người|nguoi|ng\b|pax|khách|thành viên|bạn(?:\s+bè)?)", text)
        if m:
            val = int(m.group(1))
            if 1 <= val <= 50:
                return val
        return None

    def _extract_budget(self, text: str) -> Optional[int]:
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr\b|củ|m\b)", text)
        if m:
            return int(float(m.group(1).replace(",", ".")) * 1_000_000)

        m = re.search(r"(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|vnđ|dong|đồng)?\b", text)
        if m:
            return int(re.sub(r"[.,]", "", m.group(1)))

        m = re.search(r"(\d+)\s*(?:k\b|nghìn|ngàn|ngan)", text)
        if m:
            return int(m.group(1)) * 1_000

        # Số nguyên thô chỉ được coi là ngân sách khi có đơn vị tiền hoặc ngữ cảnh ngân sách rõ ràng.
        m = re.search(r"(\d{5,10})\s*(?:đ|vnd|vnđ|dong|đồng)\b", text)
        if m:
            return int(m.group(1))

        context = re.search(r"(?:ngân sách|budget|tầm|khoảng)\D{0,20}(\d{5,10})\b", text)
        if context:
            return int(context.group(1))
        return None

    def _extract_interests(self, text: str) -> List[str]:
        found: List[str] = []
        for code, patterns in INTEREST_KEYWORDS:
            if any(re.search(p, text) for p in patterns):
                found.append(code)
        return found

    def _extract_travel_style(self, text: str) -> tuple[str, bool]:
        if re.search(r"\b(?:tiết kiệm|giá rẻ|bình dân|budget|sinh viên)\b", text):
            return "BUDGET", True
        if re.search(r"\b(?:sang chảnh|cao cấp|luxury|5 sao|resort|xa hoa)\b", text):
            return "LUXURY", True
        if re.search(r"\b(?:cân bằng|vừa phải|balanced)\b", text):
            return "BALANCED", True
        return "BALANCED", False

    def _extract_travel_pace(self, text: str) -> tuple[str, bool]:
        if re.search(r"\b(?:thong thả|thư thả|nhẹ nhàng|chill|relax|chậm rãi)\b", text):
            return "RELAXED", True
        if re.search(r"\b(?:dày đặc|nhanh|nhiều nơi|khám phá tối đa|fast)\b", text):
            return "FAST", True
        if re.search(r"\b(?:vừa phải|moderate)\b", text):
            return "MODERATE", True
        return "MODERATE", False

    def _extract_hotel_preference(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:khách sạn|khach san|hotel|resort)\s+([a-zA-Z0-9\s\u00C0-\u1EF9&.-]+?)(?=\s*(?:,|;|\.|và|cho|với|tầm|giá|ngân sách|$))",
            r"\bở\s+([a-zA-Z0-9\s\u00C0-\u1EF9&.-]+?\b(?:hotel|resort))\b",
        ]
        stop_words = {"nào", "gì", "sao", "bình dân", "tiết kiệm", "sang chảnh", "cao cấp", "đẹp", "tốt", "rẻ"}
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                candidate = " ".join(m.group(1).split()).strip(" ,.-")
                if len(candidate) >= 3 and candidate.lower() not in stop_words:
                    return candidate
        return None

    def _generate_clarification_question(self, missing_fields: List[str], destination: Optional[str]) -> str:
        if len(missing_fields) == 1:
            field = missing_fields[0]
            if field == "total_budget":
                suffix = f" đi {destination}" if destination else ""
                return f"Bạn dự kiến tổng ngân sách cho chuyến đi{suffix} khoảng bao nhiêu tiền (ví dụ: 5 triệu)?"
            if field == "num_travelers":
                return "Chuyến đi này dự kiến có bao nhiêu người tham gia?"
            if field == "duration_days":
                return "Bạn muốn lên lịch trình trong bao nhiêu ngày?"
            if field == "destination_city":
                return "Bạn dự định đi du lịch ở thành phố hoặc địa điểm nào?"

        labels = {
            "destination_city": "điểm đến",
            "duration_days": "số ngày đi",
            "num_travelers": "số người",
            "total_budget": "ngân sách",
        }
        fields = ", ".join(labels[f] for f in missing_fields)
        return f"Để lên kế hoạch chính xác, bạn vui lòng bổ sung: {fields}."

app/data/offline_places.py

from __future__ import annotations
from typing import Dict, List
from app.schemas.place import PlaceCandidate
from app.schemas.common import Provenance, utc_now_iso

# Kho dữ liệu offline chuẩn mực cho các điểm đến tiêu biểu tại Việt Nam
# Tọa độ chuẩn xác (WGS84), không bao giờ có tọa độ 0.0, giá tiền nguyên VNĐ.
OFFLINE_PLACES_DATA: Dict[str, List[PlaceCandidate]] = {
    "Đà Lạt": [
        # KHÁCH SẠN (HOTEL)
        PlaceCandidate(
            place_id="DL_HOTEL_001",
            name="Khách sạn Colline Đà Lạt",
            category="HOTEL",
            interests=["RELAX", "LUXURY", "CHECKIN"],
            rating=4.6,
            user_ratings_total=3200,
            address="10 Phan Bội Châu, Phường 1, Đà Lạt, Lâm Đồng",
            latitude=11.9427,
            longitude=108.4374,
            estimated_cost_per_person=600000,
            ticket_price=0,
            estimated_room_cost_per_night=1200000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_HOTEL_002",
            name="Dalat Edensee Lake Resort & Spa",
            category="HOTEL",
            interests=["RELAX", "NATURE", "LUXURY"],
            rating=4.7,
            user_ratings_total=1800,
            address="Khu du lịch Hồ Tuyền Lâm, Đà Lạt, Lâm Đồng",
            latitude=11.8906,
            longitude=108.4239,
            estimated_cost_per_person=1200000,
            ticket_price=0,
            estimated_room_cost_per_night=2400000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_HOTEL_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_HOTEL_003",
            name="Khách sạn Mai Hoàng Đà Lạt",
            category="HOTEL",
            interests=["RELAX", "BUDGET"],
            rating=4.2,
            user_ratings_total=450,
            address="34 Hải Thượng, Phường 6, Đà Lạt, Lâm Đồng",
            latitude=11.9458,
            longitude=108.4312,
            estimated_cost_per_person=250000,
            ticket_price=0,
            estimated_room_cost_per_night=500000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_HOTEL_003", retrieved_at=utc_now_iso()),
        ),

        # ĐIỂM THAM QUAN (ATTRACTION)
        PlaceCandidate(
            place_id="DL_ATTR_001",
            name="Vườn hoa Thành phố Đà Lạt",
            category="ATTRACTION",
            interests=["NATURE", "CHECKIN"],
            rating=4.3,
            user_ratings_total=8900,
            address="Đường Trần Quốc Toản, Phường 8, Đà Lạt",
            latitude=11.9515,
            longitude=108.4523,
            estimated_cost_per_person=0,
            ticket_price=100000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_ATTR_002",
            name="Thác Datanla",
            category="ATTRACTION",
            interests=["NATURE", "ADVENTURE", "CHECKIN"],
            rating=4.4,
            user_ratings_total=11200,
            address="Quốc lộ 20, Đèo Prenn, Phường 3, Đà Lạt",
            latitude=11.9022,
            longitude=108.4485,
            estimated_cost_per_person=0,
            ticket_price=200000, # Vé vào cổng + xe trượt
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_ATTR_003",
            name="Dinh 3 Bảo Đại",
            category="ATTRACTION",
            interests=["CULTURE", "NATURE"],
            rating=4.2,
            user_ratings_total=4100,
            address="1 Triệu Việt Vương, Phường 4, Đà Lạt",
            latitude=11.9298,
            longitude=108.4297,
            estimated_cost_per_person=0,
            ticket_price=50000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_ATTR_003", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_ATTR_004",
            name="Thiền viện Trúc Lâm Đà Lạt",
            category="ATTRACTION",
            interests=["CULTURE", "NATURE", "RELAX"],
            rating=4.7,
            user_ratings_total=15600,
            address="Đường Trúc Lâm Yên Tử, Phường 3, Đà Lạt",
            latitude=11.9044,
            longitude=108.4357,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_ATTR_004", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_ATTR_005",
            name="Quảng trường Lâm Viên",
            category="ATTRACTION",
            interests=["CHECKIN", "CULTURE"],
            rating=4.5,
            user_ratings_total=24000,
            address="Đường Trần Quốc Toản, Phường 10, Đà Lạt",
            latitude=11.9367,
            longitude=108.4447,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_ATTR_005", retrieved_at=utc_now_iso()),
        ),

        # QUÁN CÀ PHÊ (CAFE)
        PlaceCandidate(
            place_id="DL_CAFE_001",
            name="Tiệm Cà phê Túi Mơ To",
            category="CAFE",
            interests=["CAFE", "CHECKIN", "NATURE"],
            rating=4.5,
            user_ratings_total=5200,
            address="Hẻm 31 Sào Nam, Phường 11, Đà Lạt",
            latitude=11.9463,
            longitude=108.4828,
            estimated_cost_per_person=65000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_CAFE_002",
            name="Cheo Veooo Cafe",
            category="CAFE",
            interests=["CAFE", "NATURE", "RELAX"],
            rating=4.6,
            user_ratings_total=3100,
            address="116 Hùng Vương, Phường 11, Đà Lạt",
            latitude=11.9431,
            longitude=108.4795,
            estimated_cost_per_person=60000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_CAFE_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_CAFE_003",
            name="Kombi Land Coffee Đà Lạt",
            category="CAFE",
            interests=["CAFE", "CHECKIN"],
            rating=4.1,
            user_ratings_total=2400,
            address="Đèo Mimosa, Phường 3, Đà Lạt",
            latitude=11.9082,
            longitude=108.4611,
            estimated_cost_per_person=90000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_CAFE_003", retrieved_at=utc_now_iso()),
        ),

        # NHÀ HÀNG & QUÁN ĂN (RESTAURANT)
        PlaceCandidate(
            place_id="DL_REST_001",
            name="Lẩu gà lá é Tao Ngộ",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.3,
            user_ratings_total=9800,
            address="Số 5 Đường 3/4, Phường 3, Đà Lạt",
            latitude=11.9312,
            longitude=108.4419,
            estimated_cost_per_person=120000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_REST_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_REST_002",
            name="Quán Lẩu Bò Ba Toa Nhà Gỗ",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.4,
            user_ratings_total=8300,
            address="1/29 Hoàng Diệu, Phường 5, Đà Lạt",
            latitude=11.9405,
            longitude=108.4281,
            estimated_cost_per_person=150000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_REST_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DL_REST_003",
            name="Bánh Tráng Nướng Dì Đinh",
            category="RESTAURANT",
            interests=["FOOD", "CHECKIN"],
            rating=4.5,
            user_ratings_total=4200,
            address="26 Hoàng Diệu, Phường 5, Đà Lạt",
            latitude=11.9412,
            longitude=108.4293,
            estimated_cost_per_person=50000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DL_REST_003", retrieved_at=utc_now_iso()),
        ),
    ],
    "Đà Nẵng": [
        PlaceCandidate(
            place_id="DN_HOTEL_001",
            name="Khách sạn Novotel Danang Premier Han River",
            category="HOTEL",
            interests=["RELAX", "LUXURY"],
            rating=4.6,
            user_ratings_total=4500,
            address="36 Bạch Đằng, Hải Châu, Đà Nẵng",
            latitude=16.0772,
            longitude=108.2238,
            estimated_cost_per_person=900000,
            ticket_price=0,
            estimated_room_cost_per_night=1800000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_HOTEL_002",
            name="Haian Beach Hotel & Spa",
            category="HOTEL",
            interests=["BEACH", "RELAX"],
            rating=4.5,
            user_ratings_total=3800,
            address="278 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng",
            latitude=16.0543,
            longitude=108.2468,
            estimated_cost_per_person=550000,
            ticket_price=0,
            estimated_room_cost_per_night=1100000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_HOTEL_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_ATTR_001",
            name="Cầu Rồng Đà Nẵng",
            category="ATTRACTION",
            interests=["CHECKIN", "CULTURE"],
            rating=4.7,
            user_ratings_total=32000,
            address="Nguyễn Văn Linh, Phước Ninh, Hải Châu, Đà Nẵng",
            latitude=16.0611,
            longitude=108.2272,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_ATTR_002",
            name="Sun World Bà Nà Hills",
            category="ATTRACTION",
            interests=["CHECKIN", "NATURE", "ADVENTURE"],
            rating=4.6,
            user_ratings_total=45000,
            address="Hòa Vang, Đà Nẵng",
            latitude=15.9988,
            longitude=107.9961,
            estimated_cost_per_person=0,
            ticket_price=900000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_ATTR_003",
            name="Chùa Linh Ứng Bãi Bụt",
            category="ATTRACTION",
            interests=["CULTURE", "NATURE"],
            rating=4.7,
            user_ratings_total=19000,
            address="Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng",
            latitude=16.1002,
            longitude=108.2778,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_ATTR_003", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_CAFE_001",
            name="Cộng Cà Phê - Bạch Đằng",
            category="CAFE",
            interests=["CAFE", "CHECKIN", "CULTURE"],
            rating=4.4,
            user_ratings_total=4300,
            address="98-96 Bạch Đằng, Hải Châu 1, Hải Châu, Đà Nẵng",
            latitude=16.0694,
            longitude=108.2241,
            estimated_cost_per_person=50000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_CAFE_002",
            name="43 Factory Coffee Roaster",
            category="CAFE",
            interests=["CAFE", "RELAX"],
            rating=4.6,
            user_ratings_total=2100,
            address="422 Ngô Thì Sĩ, Mỹ An, Ngũ Hành Sơn, Đà Nẵng",
            latitude=16.0465,
            longitude=108.2439,
            estimated_cost_per_person=80000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_CAFE_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_REST_001",
            name="Bánh tráng cuốn thịt heo Quán Trần",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.2,
            user_ratings_total=5800,
            address="4 Lê Duẩn, Hải Châu, Đà Nẵng",
            latitude=16.0718,
            longitude=108.2215,
            estimated_cost_per_person=130000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_REST_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="DN_REST_002",
            name="Hải sản Bé Mặn",
            category="RESTAURANT",
            interests=["FOOD", "BEACH"],
            rating=4.3,
            user_ratings_total=9100,
            address="Lô 11 Võ Nguyên Giáp, Mân Thái, Sơn Trà, Đà Nẵng",
            latitude=16.0841,
            longitude=108.2472,
            estimated_cost_per_person=300000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="DN_REST_002", retrieved_at=utc_now_iso()),
        ),
    ],
    "Hà Nội": [
        PlaceCandidate(
            place_id="HN_HOTEL_001",
            name="Khách sạn Apricot Hà Nội",
            category="HOTEL",
            interests=["LUXURY", "RELAX", "CULTURE"],
            rating=4.7,
            user_ratings_total=2400,
            address="136 Hàng Trống, Hoàn Kiếm, Hà Nội",
            latitude=21.0285,
            longitude=105.8525,
            estimated_cost_per_person=1100000,
            ticket_price=0,
            estimated_room_cost_per_night=2200000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_HOTEL_002",
            name="Hanoi Daewoo Hotel",
            category="HOTEL",
            interests=["RELAX", "BALANCED"],
            rating=4.4,
            user_ratings_total=3100,
            address="360 Kim Mã, Ngọc Khánh, Ba Đình, Hà Nội",
            latitude=21.0315,
            longitude=105.8115,
            estimated_cost_per_person=650000,
            ticket_price=0,
            estimated_room_cost_per_night=1300000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_HOTEL_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_ATTR_001",
            name="Hồ Hoàn Kiếm & Đền Ngọc Sơn",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN"],
            rating=4.7,
            user_ratings_total=48000,
            address="Đinh Tiên Hoàng, Hàng Trống, Hoàn Kiếm, Hà Nội",
            latitude=21.0307,
            longitude=105.8524,
            estimated_cost_per_person=0,
            ticket_price=30000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_ATTR_002",
            name="Văn Miếu - Quốc Tử Giám",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN"],
            rating=4.6,
            user_ratings_total=32000,
            address="58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội",
            latitude=21.0287,
            longitude=105.8358,
            estimated_cost_per_person=0,
            ticket_price=70000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_ATTR_003",
            name="Lăng Chủ tịch Hồ Chí Minh",
            category="ATTRACTION",
            interests=["CULTURE"],
            rating=4.8,
            user_ratings_total=39000,
            address="2 Hùng Vương, Điện Bàn, Ba Đình, Hà Nội",
            latitude=21.0368,
            longitude=105.8346,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_ATTR_003", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_CAFE_001",
            name="Cafe Giảng - Cà phê Trứng",
            category="CAFE",
            interests=["CAFE", "FOOD", "CULTURE"],
            rating=4.5,
            user_ratings_total=14000,
            address="39 Nguyễn Hữu Huân, Lý Thái Tổ, Hoàn Kiếm, Hà Nội",
            latitude=21.0345,
            longitude=105.8532,
            estimated_cost_per_person=45000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_CAFE_002",
            name="Cafe Đinh",
            category="CAFE",
            interests=["CAFE", "CHECKIN"],
            rating=4.4,
            user_ratings_total=4600,
            address="13 Đinh Tiên Hoàng, Hàng Bạc, Hoàn Kiếm, Hà Nội",
            latitude=21.0311,
            longitude=105.8530,
            estimated_cost_per_person=40000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_CAFE_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_REST_001",
            name="Phở Thìn Lò Đúc",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.3,
            user_ratings_total=8200,
            address="13 Lò Đúc, Phạm Đình Hổ, Hai Bà Trưng, Hà Nội",
            latitude=21.0189,
            longitude=105.8566,
            estimated_cost_per_person=90000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_REST_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HN_REST_002",
            name="Bún Chả Hương Liên (Bún Chả Obama)",
            category="RESTAURANT",
            interests=["FOOD", "CHECKIN"],
            rating=4.2,
            user_ratings_total=9500,
            address="24 Lê Văn Hưu, Phan Chu Trinh, Hai Bà Trưng, Hà Nội",
            latitude=21.0167,
            longitude=105.8542,
            estimated_cost_per_person=75000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HN_REST_002", retrieved_at=utc_now_iso()),
        ),
    ],
    "Hồ Chí Minh": [
        PlaceCandidate(
            place_id="HCM_HOTEL_001",
            name="Caravelle Saigon Hotel",
            category="HOTEL",
            interests=["LUXURY", "RELAX"],
            rating=4.6,
            user_ratings_total=3500,
            address="19-23 Lam Sơn Square, Bến Nghé, Quận 1, Hồ Chí Minh",
            latitude=10.7765,
            longitude=106.7032,
            estimated_cost_per_person=1200000,
            ticket_price=0,
            estimated_room_cost_per_night=2400000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_HOTEL_002",
            name="Khách sạn Liberty Central Saigon Citypoint",
            category="HOTEL",
            interests=["RELAX", "BALANCED"],
            rating=4.5,
            user_ratings_total=2800,
            address="59 Pasteur, Bến Nghé, Quận 1, Hồ Chí Minh",
            latitude=10.7741,
            longitude=106.7011,
            estimated_cost_per_person=700000,
            ticket_price=0,
            estimated_room_cost_per_night=1400000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_HOTEL_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_ATTR_001",
            name="Dinh Độc Lập",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN"],
            rating=4.6,
            user_ratings_total=43000,
            address="135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, Hồ Chí Minh",
            latitude=10.7770,
            longitude=106.6953,
            estimated_cost_per_person=0,
            ticket_price=65000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_ATTR_002",
            name="Bảo tàng Chứng tích Chiến tranh",
            category="ATTRACTION",
            interests=["CULTURE"],
            rating=4.7,
            user_ratings_total=38000,
            address="28 Võ Văn Tần, Phường 6, Quận 3, Hồ Chí Minh",
            latitude=10.7792,
            longitude=106.6922,
            estimated_cost_per_person=0,
            ticket_price=40000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_ATTR_003",
            name="Phố đi bộ Nguyễn Huệ",
            category="ATTRACTION",
            interests=["CHECKIN", "RELAX"],
            rating=4.7,
            user_ratings_total=52000,
            address="Đường Nguyễn Huệ, Bến Nghé, Quận 1, Hồ Chí Minh",
            latitude=10.7745,
            longitude=106.7042,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_ATTR_003", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_CAFE_001",
            name="Cheo Leo Cafe",
            category="CAFE",
            interests=["CAFE", "CULTURE"],
            rating=4.4,
            user_ratings_total=2200,
            address="109/36 Nguyễn Thiện Thuật, Phường 2, Quận 3, Hồ Chí Minh",
            latitude=10.7681,
            longitude=106.6815,
            estimated_cost_per_person=35000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_CAFE_002",
            name="The Workshop Coffee",
            category="CAFE",
            interests=["CAFE", "CHECKIN"],
            rating=4.5,
            user_ratings_total=3400,
            address="27 Ngô Đức Kế, Bến Nghé, Quận 1, Hồ Chí Minh",
            latitude=10.7748,
            longitude=106.7040,
            estimated_cost_per_person=80000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_CAFE_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_REST_001",
            name="Cơm Tấm Ba Ghiền",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.3,
            user_ratings_total=8900,
            address="84 Đặng Văn Ngữ, Phường 10, Phú Nhuận, Hồ Chí Minh",
            latitude=10.7963,
            longitude=106.6710,
            estimated_cost_per_person=90000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_REST_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HCM_REST_002",
            name="Quán Bụi - Vietnamese Cuisine",
            category="RESTAURANT",
            interests=["FOOD", "CULTURE"],
            rating=4.4,
            user_ratings_total=4100,
            address="19 Ngô Văn Năm, Bến Nghé, Quận 1, Hồ Chí Minh",
            latitude=10.7802,
            longitude=106.7047,
            estimated_cost_per_person=250000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HCM_REST_002", retrieved_at=utc_now_iso()),
        ),
    ],
    "Nha Trang": [
        PlaceCandidate(
            place_id="NT_HOTEL_001",
            name="InterContinental Nha Trang",
            category="HOTEL",
            interests=["BEACH", "LUXURY", "RELAX"],
            rating=4.7,
            user_ratings_total=3900,
            address="32-34 Trần Phú, Lộc Thọ, Nha Trang, Khánh Hòa",
            latitude=12.2472,
            longitude=109.1963,
            estimated_cost_per_person=1200000,
            ticket_price=0,
            estimated_room_cost_per_night=2400000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NT_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NT_ATTR_001",
            name="Tháp Bà Ponagar Nha Trang",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN"],
            rating=4.6,
            user_ratings_total=24000,
            address="2 Tháng 4, Vĩnh Phước, Nha Trang, Khánh Hòa",
            latitude=12.2655,
            longitude=109.1957,
            estimated_cost_per_person=0,
            ticket_price=30000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NT_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NT_ATTR_002",
            name="VinWonders Nha Trang",
            category="ATTRACTION",
            interests=["CHECKIN", "ADVENTURE", "BEACH"],
            rating=4.7,
            user_ratings_total=35000,
            address="Đảo Hòn Tre, Vĩnh Nguyên, Nha Trang, Khánh Hòa",
            latitude=12.2195,
            longitude=109.2432,
            estimated_cost_per_person=0,
            ticket_price=800000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NT_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NT_CAFE_001",
            name="Rainforest Cafe Nha Trang",
            category="CAFE",
            interests=["CAFE", "NATURE", "CHECKIN"],
            rating=4.5,
            user_ratings_total=5100,
            address="146 Võ Trứ, Tân Lập, Nha Trang, Khánh Hòa",
            latitude=12.2415,
            longitude=109.1908,
            estimated_cost_per_person=65000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NT_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NT_REST_001",
            name="Hải sản Thanh Sương",
            category="RESTAURANT",
            interests=["FOOD", "BEACH"],
            rating=4.3,
            user_ratings_total=6400,
            address="9A Trần Phú, Vĩnh Nguyên, Nha Trang, Khánh Hòa",
            latitude=12.2155,
            longitude=109.2015,
            estimated_cost_per_person=250000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NT_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Phú Quốc": [
        PlaceCandidate(
            place_id="PQ_HOTEL_001",
            name="Vinpearl Resort & Spa Phú Quốc",
            category="HOTEL",
            interests=["BEACH", "LUXURY", "RELAX"],
            rating=4.7,
            user_ratings_total=4200,
            address="Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang",
            latitude=10.3345,
            longitude=103.8562,
            estimated_cost_per_person=1300000,
            ticket_price=0,
            estimated_room_cost_per_night=2600000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="PQ_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="PQ_ATTR_001",
            name="Grand World Phú Quốc",
            category="ATTRACTION",
            interests=["CHECKIN", "CULTURE", "RELAX"],
            rating=4.6,
            user_ratings_total=28000,
            address="Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang",
            latitude=10.3235,
            longitude=103.8580,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="PQ_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="PQ_ATTR_002",
            name="Bãi Sao Phú Quốc",
            category="ATTRACTION",
            interests=["BEACH", "NATURE", "RELAX"],
            rating=4.5,
            user_ratings_total=18000,
            address="Ấp Bãi Sao, An Thới, Phú Quốc, Kiên Giang",
            latitude=10.0525,
            longitude=104.0321,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="PQ_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="PQ_CAFE_001",
            name="Chuồn Chuồn Bistro & Sky Bar",
            category="CAFE",
            interests=["CAFE", "CHECKIN", "RELAX"],
            rating=4.5,
            user_ratings_total=4600,
            address="Đồi Sao Mai, 69 Trần Hưng Đạo, Dương Đông, Phú Quốc",
            latitude=10.2185,
            longitude=103.9672,
            estimated_cost_per_person=90000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="PQ_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="PQ_REST_001",
            name="Nhà hàng Xin Chào Phú Quốc",
            category="RESTAURANT",
            interests=["FOOD", "BEACH"],
            rating=4.4,
            user_ratings_total=5900,
            address="66 Trần Hưng Đạo, Dương Đông, Phú Quốc",
            latitude=10.2162,
            longitude=103.9575,
            estimated_cost_per_person=280000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="PQ_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Huế": [
        PlaceCandidate(
            place_id="HUE_HOTEL_001",
            name="Silk Path Grand Hue Hotel",
            category="HOTEL",
            interests=["LUXURY", "CULTURE", "RELAX"],
            rating=4.7,
            user_ratings_total=2600,
            address="2 Lê Lợi, Vĩnh Ninh, Huế, Thừa Thiên Huế",
            latitude=16.4608,
            longitude=107.5815,
            estimated_cost_per_person=800000,
            ticket_price=0,
            estimated_room_cost_per_night=1600000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HUE_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HUE_ATTR_001",
            name="Đại Nội Huế (Hoàng thành Huế)",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN"],
            rating=4.7,
            user_ratings_total=31000,
            address="Đường 23/8, Thuận Hòa, Huế, Thừa Thiên Huế",
            latitude=16.4695,
            longitude=107.5786,
            estimated_cost_per_person=0,
            ticket_price=200000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HUE_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HUE_ATTR_002",
            name="Chùa Thiên Mụ",
            category="ATTRACTION",
            interests=["CULTURE", "NATURE"],
            rating=4.7,
            user_ratings_total=19000,
            address="Đồi Hà Khê, Kim Long, Huế, Thừa Thiên Huế",
            latitude=16.4533,
            longitude=107.5452,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HUE_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HUE_CAFE_001",
            name="Cafe Muối Huế",
            category="CAFE",
            interests=["CAFE", "CULTURE", "FOOD"],
            rating=4.5,
            user_ratings_total=3200,
            address="10 Nguyễn Lương Bằng, Phú Nhuận, Huế",
            latitude=16.4672,
            longitude=107.5891,
            estimated_cost_per_person=35000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HUE_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HUE_REST_001",
            name="Quán Bánh O Lé Huế",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.4,
            user_ratings_total=2800,
            address="Kiệt 104 Kim Long, Kim Long, Huế",
            latitude=16.4468,
            longitude=107.6045,
            estimated_cost_per_person=60000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HUE_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Hội An": [
        PlaceCandidate(
            place_id="HA_HOTEL_001",
            name="Allegro Hoi An - Little Luxury Hotel",
            category="HOTEL",
            interests=["LUXURY", "CULTURE", "RELAX"],
            rating=4.8,
            user_ratings_total=2900,
            address="86 Trần Hưng Đạo, Phường Minh An, Hội An, Quảng Nam",
            latitude=15.8782,
            longitude=108.3242,
            estimated_cost_per_person=750000,
            ticket_price=0,
            estimated_room_cost_per_night=1500000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HA_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HA_ATTR_001",
            name="Chùa Cầu Hội An",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN"],
            rating=4.6,
            user_ratings_total=27000,
            address="Đường Nguyễn Thị Minh Khai, Phường Minh An, Hội An",
            latitude=15.8771,
            longitude=108.3258,
            estimated_cost_per_person=0,
            ticket_price=80000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HA_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HA_ATTR_002",
            name="Rừng dừa Bảy Mẫu",
            category="ATTRACTION",
            interests=["NATURE", "CHECKIN", "ADVENTURE"],
            rating=4.6,
            user_ratings_total=14000,
            address="Cẩm Thanh, Hội An, Quảng Nam",
            latitude=15.8715,
            longitude=108.3752,
            estimated_cost_per_person=0,
            ticket_price=150000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HA_ATTR_002", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HA_CAFE_001",
            name="Faifo Coffee Hội An",
            category="CAFE",
            interests=["CAFE", "CHECKIN"],
            rating=4.4,
            user_ratings_total=4800,
            address="130 Trần Phú, Phường Minh An, Hội An",
            latitude=15.8778,
            longitude=108.3295,
            estimated_cost_per_person=60000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HA_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="HA_REST_001",
            name="Cơm gà Bà Buội",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.2,
            user_ratings_total=5300,
            address="22 Phan Chu Trinh, Phường Minh An, Hội An",
            latitude=15.8791,
            longitude=108.3312,
            estimated_cost_per_person=70000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="HA_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Vũng Tàu": [
        PlaceCandidate(
            place_id="VT_HOTEL_001",
            name="The Imperial Hotel Vũng Tàu",
            category="HOTEL",
            interests=["BEACH", "LUXURY", "RELAX"],
            rating=4.6,
            user_ratings_total=6200,
            address="159 Thùy Vân, Phường Thắng Tam, Vũng Tàu, Bà Rịa - Vũng Tàu",
            latitude=10.3392,
            longitude=107.0945,
            estimated_cost_per_person=1100000,
            ticket_price=0,
            estimated_room_cost_per_night=2200000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="VT_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="VT_ATTR_001",
            name="Tượng Chúa Kytô Vua",
            category="ATTRACTION",
            interests=["CULTURE", "CHECKIN", "NATURE"],
            rating=4.7,
            user_ratings_total=21000,
            address="01 Bà Triệu, Phường 2, Vũng Tàu",
            latitude=10.3255,
            longitude=107.0842,
            estimated_cost_per_person=0,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="VT_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="VT_CAFE_001",
            name="Marina Club Vũng Tàu",
            category="CAFE",
            interests=["CAFE", "BEACH", "CHECKIN"],
            rating=4.4,
            user_ratings_total=3500,
            address="03 Hạ Long, Phường 2, Vũng Tàu",
            latitude=10.3312,
            longitude=107.0725,
            estimated_cost_per_person=80000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="VT_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="VT_REST_001",
            name="Bánh khọt Gốc Vú Sữa",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.1,
            user_ratings_total=7600,
            address="14 Nguyễn Trường Tộ, Phường 2, Vũng Tàu",
            latitude=10.3475,
            longitude=107.0782,
            estimated_cost_per_person=70000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="VT_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Sa Pa": [
        PlaceCandidate(
            place_id="SP_HOTEL_001",
            name="Hotel de la Coupole - MGallery",
            category="HOTEL",
            interests=["LUXURY", "CHECKIN", "RELAX"],
            rating=4.7,
            user_ratings_total=3800,
            address="1 Hoàng Liên, Sa Pa, Lào Cai",
            latitude=22.3335,
            longitude=103.8421,
            estimated_cost_per_person=1400000,
            ticket_price=0,
            estimated_room_cost_per_night=2800000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="SP_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="SP_ATTR_001",
            name="Đỉnh Fansipan - Sun World Fansipan Legend",
            category="ATTRACTION",
            interests=["NATURE", "CHECKIN", "ADVENTURE"],
            rating=4.7,
            user_ratings_total=29000,
            address="Sa Pa, Lào Cai",
            latitude=22.3035,
            longitude=103.7752,
            estimated_cost_per_person=0,
            ticket_price=850000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="SP_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="SP_CAFE_001",
            name="Viettrekking Coffee Sapa",
            category="CAFE",
            interests=["CAFE", "CHECKIN", "NATURE"],
            rating=4.6,
            user_ratings_total=3900,
            address="33 Hoàng Liên, Sa Pa, Lào Cai",
            latitude=22.3305,
            longitude=103.8455,
            estimated_cost_per_person=75000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="SP_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="SP_REST_001",
            name="Nhà hàng A Phủ Sapa",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.3,
            user_ratings_total=4100,
            address="15 Fansipan, Sa Pa, Lào Cai",
            latitude=22.3345,
            longitude=103.8415,
            estimated_cost_per_person=160000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="SP_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Ninh Bình": [
        PlaceCandidate(
            place_id="NB_HOTEL_001",
            name="Emeralda Resort Ninh Bình",
            category="HOTEL",
            interests=["NATURE", "RELAX", "LUXURY"],
            rating=4.5,
            user_ratings_total=3100,
            address="Khu bảo tồn Vân Long, Gia Vân, Gia Viễn, Ninh Bình",
            latitude=20.3625,
            longitude=105.8821,
            estimated_cost_per_person=900000,
            ticket_price=0,
            estimated_room_cost_per_night=1800000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NB_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NB_ATTR_001",
            name="Quần thể danh thắng Tràng An",
            category="ATTRACTION",
            interests=["NATURE", "CULTURE", "CHECKIN"],
            rating=4.7,
            user_ratings_total=36000,
            address="Tràng An, Ninh Xuân, Hoa Lư, Ninh Bình",
            latitude=20.2525,
            longitude=105.9015,
            estimated_cost_per_person=0,
            ticket_price=250000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NB_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NB_CAFE_001",
            name="Aroma Cafe Tam Coc",
            category="CAFE",
            interests=["CAFE", "RELAX"],
            rating=4.6,
            user_ratings_total=1800,
            address="Đội 1, Văn Lâm, Ninh Hải, Hoa Lư, Ninh Bình",
            latitude=20.2175,
            longitude=105.9395,
            estimated_cost_per_person=50000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NB_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="NB_REST_001",
            name="Nhà hàng Dê Núi Chính Thư",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.3,
            user_ratings_total=4500,
            address="Ninh Xuân, Hoa Lư, Ninh Bình",
            latitude=20.2612,
            longitude=105.9085,
            estimated_cost_per_person=200000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="NB_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
    "Quy Nhơn": [
        PlaceCandidate(
            place_id="QN_HOTEL_001",
            name="FLC Luxury Hotel Quy Nhơn",
            category="HOTEL",
            interests=["BEACH", "LUXURY", "RELAX"],
            rating=4.5,
            user_ratings_total=3300,
            address="Khu 4, Nhơn Lý, Quy Nhơn, Bình Định",
            latitude=13.8825,
            longitude=109.2615,
            estimated_cost_per_person=1000000,
            ticket_price=0,
            estimated_room_cost_per_night=2000000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="QN_HOTEL_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="QN_ATTR_001",
            name="Kỳ Co - Eo Gió",
            category="ATTRACTION",
            interests=["BEACH", "NATURE", "CHECKIN"],
            rating=4.6,
            user_ratings_total=16000,
            address="Nhơn Lý, Quy Nhơn, Bình Định",
            latitude=13.9185,
            longitude=109.3012,
            estimated_cost_per_person=0,
            ticket_price=100000,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="QN_ATTR_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="QN_CAFE_001",
            name="Surf Bar Quy Nhơn",
            category="CAFE",
            interests=["CAFE", "BEACH", "CHECKIN"],
            rating=4.4,
            user_ratings_total=4200,
            address="Bãi biển Xuân Diệu, Lê Lợi, Quy Nhơn, Bình Định",
            latitude=13.7655,
            longitude=109.2312,
            estimated_cost_per_person=55000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="QN_CAFE_001", retrieved_at=utc_now_iso()),
        ),
        PlaceCandidate(
            place_id="QN_REST_001",
            name="Bánh xèo tôm nhảy Gia Vỹ",
            category="RESTAURANT",
            interests=["FOOD"],
            rating=4.3,
            user_ratings_total=3800,
            address="14 Diên Hồng, Lê Hồng Phong, Quy Nhơn",
            latitude=13.7765,
            longitude=109.2245,
            estimated_cost_per_person=80000,
            ticket_price=0,
            provenance=Provenance(source="INTERNAL_DATABASE", source_id="QN_REST_001", retrieved_at=utc_now_iso()),
        ),
    ],
}


OFFLINE_SUPPORTED_CITIES = frozenset(OFFLINE_PLACES_DATA.keys())

app/tools/places.py

from __future__ import annotations

from abc import ABC, abstractmethod
import logging
from typing import Any, List, Optional

import httpx

from app.core.config import settings
from app.data.offline_places import OFFLINE_PLACES_DATA
from app.schemas.common import Provenance, utc_now_iso
from app.schemas.place import PlaceCandidate

logger = logging.getLogger(__name__)


class PlacesProvider(ABC):
    @abstractmethod
    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        raise NotImplementedError


class OfflinePlacesProvider(PlacesProvider):
    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        matched_city = next(
            (
                key
                for key in OFFLINE_PLACES_DATA
                if key.casefold() == city.casefold()
                or key.casefold() in city.casefold()
                or city.casefold() in key.casefold()
            ),
            None,
        )
        if not matched_city:
            logger.warning("Offline catalog không có dữ liệu cho %s", city)
            return []

        candidates = OFFLINE_PLACES_DATA[matched_city]
        if categories:
            allowed = {c.upper() for c in categories}
            candidates = [c for c in candidates if c.category in allowed]
        return [c.model_copy(deep=True) for c in candidates]


class GooglePlacesProvider(PlacesProvider):
    PLACES_API_NEW_URL = "https://places.googleapis.com/v1/places:searchText"
    FIELD_MASK = (
        "places.id,places.displayName,places.formattedAddress,"
        "places.location,places.rating,places.userRatingCount,"
        "places.priceLevel,places.primaryType,places.types,"
        "places.regularOpeningHours"
    )

    def __init__(self, fallback_provider: Optional[PlacesProvider] = None, http_client: Optional[httpx.Client] = None):
        self.fallback = fallback_provider or OfflinePlacesProvider()
        self.api_key = settings.google_maps_api_key
        self._http_client = http_client

    def search_places(self, city: str, categories: Optional[List[str]] = None) -> List[PlaceCandidate]:
        if not self.api_key:
            return self.fallback.search_places(city, categories)

        try:
            query = self._build_query(city, categories)
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": self.FIELD_MASK,
            }
            body = {"textQuery": query, "languageCode": "vi", "pageSize": 20}

            if self._http_client:
                response = self._http_client.post(
                    self.PLACES_API_NEW_URL,
                    headers=headers,
                    json=body,
                    timeout=settings.google_places_timeout_seconds,
                )
            else:
                with httpx.Client(timeout=settings.google_places_timeout_seconds) as client:
                    response = client.post(self.PLACES_API_NEW_URL, headers=headers, json=body)

            if response.status_code != 200:
                logger.warning("Google Places trả HTTP %s; dùng offline fallback", response.status_code)
                return self.fallback.search_places(city, categories)

            places_raw = response.json().get("places", [])
            normalized: List[PlaceCandidate] = []
            seen: set[str] = set()
            for item in places_raw:
                candidate = self._normalize_google_place(item)
                if candidate and candidate.place_id not in seen:
                    seen.add(candidate.place_id)
                    normalized.append(candidate)

            if categories:
                allowed = {c.upper() for c in categories}
                normalized = [c for c in normalized if c.category in allowed]

            return normalized or self.fallback.search_places(city, categories)
        except Exception:
            logger.exception("GooglePlacesProvider lỗi; dùng offline fallback")
            return self.fallback.search_places(city, categories)

    def _build_query(self, city: str, categories: Optional[List[str]]) -> str:
        if categories and len(categories) == 1:
            category = categories[0].upper()
            mapping = {
                "HOTEL": f"hotels in {city} Vietnam",
                "RESTAURANT": f"restaurants in {city} Vietnam",
                "CAFE": f"cafes in {city} Vietnam",
                "ATTRACTION": f"tourist attractions in {city} Vietnam",
            }
            if category in mapping:
                return mapping[category]
        return f"places to visit in {city} Vietnam"

    def _normalize_google_place(self, item: dict) -> Optional[PlaceCandidate]:
        try:
            location = item.get("location") or item.get("geometry", {}).get("location", {})
            lat = location.get("latitude") if "latitude" in location else location.get("lat")
            lng = location.get("longitude") if "longitude" in location else location.get("lng")
            if lat is None or lng is None or (float(lat) == 0.0 and float(lng) == 0.0):
                return None

            place_id = item.get("id") or item.get("place_id")
            display_name = item.get("displayName")
            name = display_name.get("text") if isinstance(display_name, dict) else item.get("name")
            if not place_id or not name:
                return None

            primary_type = item.get("primaryType")
            types = item.get("types", []) or []
            category = self._map_primary_type_to_category(primary_type) if primary_type else None
            category = category or self._map_google_types_to_category(types)
            if category is None:
                return None

            price_level = item.get("priceLevel") if "priceLevel" in item else item.get("price_level")
            estimate = self._map_price_level_to_estimated_cost(price_level)
            room_cost = self._map_hotel_price_level_to_room_cost(price_level) if category == "HOTEL" else None
            has_estimate = estimate is not None or room_cost is not None

            rating_raw = item.get("rating")
            reviews_raw = item.get("userRatingCount") if "userRatingCount" in item else item.get("user_ratings_total")

            return PlaceCandidate(
                place_id=str(place_id),
                name=str(name),
                category=category,
                interests=self._extract_interests_from_types(types),
                rating=float(rating_raw) if rating_raw is not None else 0.0,
                user_ratings_total=int(reviews_raw) if reviews_raw is not None else 0,
                address=item.get("formattedAddress") or item.get("formatted_address", ""),
                latitude=float(lat),
                longitude=float(lng),
                opening_hours=item.get("regularOpeningHours"),
                estimated_cost_per_person=None if category == "HOTEL" else estimate,
                ticket_price=None,
                estimated_room_cost_per_night=room_cost,
                provenance=Provenance(
                    source="GOOGLE_PLACES",
                    source_id=str(place_id),
                    retrieved_at=utc_now_iso(),
                    is_estimate=has_estimate,
                ),
            )
        except (TypeError, ValueError, AttributeError):
            logger.debug("Bỏ qua Google Place có format không hợp lệ", exc_info=True)
            return None

    def _map_price_level_to_estimated_cost(self, value: Any) -> Optional[int]:
        new_map = {
            "PRICE_LEVEL_FREE": 0,
            "PRICE_LEVEL_INEXPENSIVE": 70_000,
            "PRICE_LEVEL_MODERATE": 180_000,
            "PRICE_LEVEL_EXPENSIVE": 400_000,
            "PRICE_LEVEL_VERY_EXPENSIVE": 900_000,
        }
        legacy_map = {0: 0, 1: 70_000, 2: 180_000, 3: 400_000, 4: 900_000}
        if isinstance(value, str):
            return new_map.get(value)
        if isinstance(value, int):
            return legacy_map.get(value)
        return None

    def _map_hotel_price_level_to_room_cost(self, value: Any) -> Optional[int]:
        new_map = {
            "PRICE_LEVEL_INEXPENSIVE": 500_000,
            "PRICE_LEVEL_MODERATE": 900_000,
            "PRICE_LEVEL_EXPENSIVE": 1_800_000,
            "PRICE_LEVEL_VERY_EXPENSIVE": 3_500_000,
        }
        legacy_map = {1: 500_000, 2: 900_000, 3: 1_800_000, 4: 3_500_000}
        if isinstance(value, str):
            return new_map.get(value)
        if isinstance(value, int):
            return legacy_map.get(value)
        return None

    def _map_primary_type_to_category(self, primary_type: str) -> Optional[str]:
        p = primary_type.lower()
        exact = {
            "lodging": "HOTEL", "hotel": "HOTEL", "resort_hotel": "HOTEL",
            "bed_and_breakfast": "HOTEL", "guest_house": "HOTEL", "hostel": "HOTEL", "motel": "HOTEL", "inn": "HOTEL",
            "cafe": "CAFE", "coffee_shop": "CAFE", "tea_house": "CAFE",
            "restaurant": "RESTAURANT", "meal_takeaway": "RESTAURANT", "meal_delivery": "RESTAURANT",
            "bakery": "RESTAURANT", "bar": "RESTAURANT", "food": "RESTAURANT", "food_court": "RESTAURANT",
            "tourist_attraction": "ATTRACTION", "amusement_park": "ATTRACTION", "aquarium": "ATTRACTION",
            "art_gallery": "ATTRACTION", "beach": "ATTRACTION", "campground": "ATTRACTION", "church": "ATTRACTION",
            "hindu_temple": "ATTRACTION", "museum": "ATTRACTION", "national_park": "ATTRACTION", "natural_feature": "ATTRACTION",
            "park": "ATTRACTION", "place_of_worship": "ATTRACTION", "point_of_interest": "ATTRACTION", "stadium": "ATTRACTION",
            "zoo": "ATTRACTION", "historical_landmark": "ATTRACTION", "monument": "ATTRACTION",
            "botanical_garden": "ATTRACTION", "scenic_viewpoint": "ATTRACTION",
        }
        if p in exact:
            return exact[p]
        if p.endswith("_restaurant"):
            return "RESTAURANT"
        if p.endswith("_cafe") or p.endswith("_coffee_shop"):
            return "CAFE"
        if p.endswith("_hotel") or p.endswith("_resort") or p.endswith("_lodging"):
            return "HOTEL"
        if p.endswith("_park") or p.endswith("_museum") or p.endswith("_garden"):
            return "ATTRACTION"
        return None

    def _map_google_types_to_category(self, types: List[str]) -> Optional[str]:
        types_set = {t.lower() for t in types}
        if types_set & {"lodging", "hotel", "resort", "resort_hotel", "bed_and_breakfast", "guest_house", "hostel", "motel", "inn"}:
            return "HOTEL"
        if types_set & {"cafe", "coffee_shop", "tea_house"}:
            return "CAFE"
        if types_set & {"restaurant", "food", "meal_takeaway", "meal_delivery", "bakery", "bar", "food_court"}:
            return "RESTAURANT"
        if types_set & {
            "tourist_attraction", "point_of_interest", "park", "natural_feature", "museum", "art_gallery",
            "amusement_park", "aquarium", "zoo", "beach", "church", "hindu_temple", "place_of_worship",
            "campground", "stadium", "national_park", "historical_landmark", "monument", "botanical_garden", "scenic_viewpoint",
        }:
            return "ATTRACTION"
        return None

    def _extract_interests_from_types(self, types: List[str]) -> List[str]:
        values = {t.lower() for t in types}
        interests: List[str] = []
        if values & {"cafe", "coffee_shop", "tea_house"}:
            interests.append("CAFE")
        if values & {"park", "natural_feature", "campground", "national_park", "beach"}:
            interests.append("NATURE")
        if values & {"restaurant", "food", "bakery"}:
            interests.append("FOOD")
        if values & {"museum", "art_gallery", "church", "hindu_temple", "place_of_worship", "historical_landmark"}:
            interests.append("CULTURE")
        if values & {"tourist_attraction", "point_of_interest", "amusement_park", "aquarium", "zoo", "scenic_viewpoint"}:
            interests.append("CHECKIN")
        if values & {"spa", "lodging", "resort_hotel"}:
            interests.append("RELAX")
        if "beach" in values:
            interests.append("BEACH")
        return interests


def get_default_places_provider() -> PlacesProvider:
    return GooglePlacesProvider()

app/agents/destination.py

from __future__ import annotations

import logging
import math
import re
from typing import Dict, List, Optional

from app.agents.supervisor import CITY_MAPPINGS
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.places import PlacesProvider, get_default_places_provider

logger = logging.getLogger(__name__)


class DestinationAgent:
    CATEGORIES = ("HOTEL", "ATTRACTION", "CAFE", "RESTAURANT")

    def __init__(self, provider: Optional[PlacesProvider] = None):
        self.provider = provider or get_default_places_provider()

    def process(self, request: ParsedUserRequest) -> List[PlaceCandidate]:
        raw_candidates = self._fetch_by_category(request.destination_city)
        if not raw_candidates:
            logger.warning("Không tìm thấy ứng viên cho %s", request.destination_city)
            return []

        filtered = [c for c in raw_candidates if self._is_valid_candidate(c, request.destination_city)]
        scored: List[PlaceCandidate] = []
        for candidate in filtered:
            copy = candidate.model_copy(deep=True)
            copy.score, copy.reason_codes = self._compute_score_and_reasons(copy, request)
            scored.append(copy)

        scored.sort(key=lambda c: (c.score, c.rating, c.user_ratings_total), reverse=True)
        return self._select_diverse_candidates(scored, request)

    def _fetch_by_category(self, city: str) -> List[PlaceCandidate]:
        merged: Dict[str, PlaceCandidate] = {}
        for category in self.CATEGORIES:
            for candidate in self.provider.search_places(city=city, categories=[category]):
                existing = merged.get(candidate.place_id)
                if existing is None or candidate.rating > existing.rating:
                    merged[candidate.place_id] = candidate
        return list(merged.values())

    def select_hotel(self, candidates: List[PlaceCandidate]) -> Optional[PlaceCandidate]:
        preferred = next(
            (c for c in candidates if c.category == "HOTEL" and "HOTEL_PREFERENCE_MATCH" in c.reason_codes),
            None,
        )
        return preferred or next((c for c in candidates if c.category == "HOTEL"), None)

    def _is_valid_candidate(self, c: PlaceCandidate, target_city: str) -> bool:
        if c.latitude == 0.0 and c.longitude == 0.0:
            return False
        if c.rating < 3.0:
            return False

        if c.address:
            address = c.address.lower()
            target = target_city.lower()
            for city_name, patterns in CITY_MAPPINGS:
                if city_name.lower() == target:
                    continue
                if any(re.search(pattern, address) for pattern in patterns):
                    logger.info("Loại %s do address có region khác: %s", c.name, c.address)
                    return False
        return True

    def _compute_score_and_reasons(self, place: PlaceCandidate, request: ParsedUserRequest) -> tuple[float, List[str]]:
        preference_score = self._calculate_preference_match(place, request.interests)
        rating_score = min(place.rating / 5.0, 1.0)
        popularity_score = min(math.log10(place.user_ratings_total + 1) / math.log10(5001), 1.0)
        budget_fit = self._calculate_budget_fit(place, request)
        style_fit = self._calculate_style_fit(place, request.travel_style)
        cost_score = 0.7 * budget_fit + 0.3 * style_fit

        final_score = (
            0.30 * preference_score
            + 0.25 * rating_score
            + 0.20 * popularity_score
            + 0.25 * cost_score
        )

        reasons: List[str] = []
        if request.interests and set(place.interests) & set(request.interests):
            reasons.append("MATCH_PREFERENCE")
        if place.rating >= 4.5:
            reasons.append("HIGH_RATING")
        if place.user_ratings_total >= 3000:
            reasons.append("POPULAR_DESTINATION")
        if budget_fit >= 0.8:
            reasons.append("BUDGET_FIT")
        if style_fit >= 0.8:
            reasons.append("STYLE_FIT")

        if request.hotel_preference and place.category == "HOTEL":
            wanted = self._normalize_text(request.hotel_preference)
            actual = self._normalize_text(place.name)
            if wanted and (wanted in actual or actual in wanted):
                final_score = min(final_score + 0.30, 1.0)
                reasons.append("HOTEL_PREFERENCE_MATCH")

        return round(final_score, 4), reasons

    def _calculate_preference_match(self, place: PlaceCandidate, user_interests: List[str]) -> float:
        if not user_interests:
            return 0.5
        return min(len(set(place.interests) & set(user_interests)) / len(set(user_interests)), 1.0)

    def _known_unit_cost(self, place: PlaceCandidate) -> Optional[float]:
        if place.category == "HOTEL":
            if place.estimated_room_cost_per_night is None:
                return None
            return place.estimated_room_cost_per_night / 2

        known = [v for v in (place.estimated_cost_per_person, place.ticket_price) if v is not None]
        return float(sum(known)) if known else None

    def _calculate_budget_fit(self, place: PlaceCandidate, request: ParsedUserRequest) -> float:
        unit_cost = self._known_unit_cost(place)
        if unit_cost is None:
            return 0.5
        if request.total_budget <= 0:
            return 1.0 if unit_cost == 0 else 0.0

        per_person_day = request.total_budget / max(1, request.num_travelers * request.duration_days)
        share = {
            "HOTEL": 0.40,
            "RESTAURANT": 0.22,
            "CAFE": 0.10,
            "ATTRACTION": 0.25,
        }[place.category]
        target = max(per_person_day * share, 1.0)
        ratio = unit_cost / target

        if ratio <= 1.0:
            return 1.0
        if ratio <= 1.35:
            return 0.8
        if ratio <= 1.75:
            return 0.55
        if ratio <= 2.5:
            return 0.3
        return 0.1

    def _calculate_style_fit(self, place: PlaceCandidate, travel_style: str) -> float:
        unit_cost = self._known_unit_cost(place)
        if unit_cost is None:
            return 0.5

        if place.category == "HOTEL":
            bands = {
                "BUDGET": (0, 700_000),
                "BALANCED": (500_000, 1_800_000),
                "LUXURY": (1_200_000, float("inf")),
            }
        else:
            bands = {
                "BUDGET": (0, 150_000),
                "BALANCED": (50_000, 500_000),
                "LUXURY": (180_000, float("inf")),
            }

        low, high = bands[travel_style]
        if low <= unit_cost <= high:
            return 1.0
        if unit_cost < low:
            return 0.7 if travel_style == "LUXURY" else 0.8
        return 0.5 if travel_style == "BUDGET" else 0.7

    def _select_diverse_candidates(self, candidates: List[PlaceCandidate], request: ParsedUserRequest) -> List[PlaceCandidate]:
        by_category: Dict[str, List[PlaceCandidate]] = {category: [] for category in self.CATEGORIES}
        for candidate in candidates:
            by_category[candidate.category].append(candidate)

        pace_factor = {"RELAXED": 1.2, "MODERATE": 1.8, "FAST": 2.5}[request.travel_pace]
        attraction_max = min(20, max(5, math.ceil(request.duration_days * pace_factor * 1.5)))
        restaurant_max = min(14, max(3, request.duration_days + 2))
        cafe_max = min(10, max(2, math.ceil(request.duration_days * 0.8)))
        hotel_max = 3

        quotas = {
            "HOTEL": hotel_max,
            "ATTRACTION": attraction_max,
            "CAFE": cafe_max,
            "RESTAURANT": restaurant_max,
        }

        selected: List[PlaceCandidate] = []
        for category, max_count in quotas.items():
            pool = by_category[category]
            if category == "HOTEL":
                preferred = [c for c in pool if "HOTEL_PREFERENCE_MATCH" in c.reason_codes]
                if preferred:
                    selected.append(preferred[0])
                    pool = [c for c in pool if c.place_id != preferred[0].place_id]
                    max_count -= 1
            selected.extend(pool[:max(0, max_count)])

        dedup = {c.place_id: c for c in selected}
        result = list(dedup.values())
        result.sort(key=lambda c: (c.score, c.rating, c.user_ratings_total), reverse=True)
        return result

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.casefold().split())

app/graph/nodes.py

from __future__ import annotations

import logging
from typing import Any, Dict

from app.agents.destination import DestinationAgent
from app.agents.supervisor import SupervisorAgent
from app.models.state import TravelPlanState
from app.schemas.common import AgentError, AgentTraceLog, utc_now_iso

logger = logging.getLogger(__name__)

supervisor_agent = SupervisorAgent()
destination_agent = DestinationAgent()


def supervisor_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    try:
        result = supervisor_agent.parse(state.get("raw_prompt", ""))
        trace_logs.append(
            AgentTraceLog(
                agent_name="Supervisor",
                stage="PARSE_PROMPT",
                status="COMPLETED",
                message=f"Intent: {result.intent}; missing={result.missing_fields}",
            )
        )
    except Exception as exc:
        logger.exception("Supervisor parse failed")
        errors.append(
            AgentError(
                agent_name="Supervisor",
                error_code="SUPERVISOR_PARSE_FAILED",
                message=str(exc),
                recoverable=False,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="Supervisor",
                stage="PARSE_PROMPT",
                status="FAILED",
                message="Không thể phân tích yêu cầu.",
            )
        )
        return {
            "intent": "GENERAL_CHAT",
            "final_response_text": "Hệ thống chưa thể phân tích yêu cầu này.",
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    if result.intent == "CREATE_PLAN":
        parsed = supervisor_agent.to_parsed_user_request(result)
        if parsed is None:
            errors.append(
                AgentError(
                    agent_name="Supervisor",
                    error_code="PARSED_REQUEST_CONTRACT_VIOLATION",
                    message="Intent CREATE_PLAN nhưng ParsedUserRequest không thể tạo.",
                    recoverable=False,
                )
            )
        else:
            prefs = state.get("user_preferences") or {}
            updates: Dict[str, Any] = {}
            pref_interests = prefs.get("interests")
            if not parsed.interests and isinstance(pref_interests, list):
                updates["interests"] = [str(x).upper() for x in pref_interests if str(x).strip()]
            if not result.travel_style_explicit and prefs.get("travel_style") in {"BUDGET", "BALANCED", "LUXURY"}:
                updates["travel_style"] = prefs["travel_style"]
            if not result.travel_pace_explicit and prefs.get("travel_pace") in {"RELAXED", "MODERATE", "FAST"}:
                updates["travel_pace"] = prefs["travel_pace"]
            if parsed.hotel_preference is None and isinstance(prefs.get("hotel_preference"), str):
                updates["hotel_preference"] = prefs["hotel_preference"].strip() or None
            if updates:
                parsed = parsed.model_copy(update=updates)
        return {
            "intent": result.intent,
            "parsed_request": parsed,
            "clarification_question": None,
            "final_response_text": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    if result.intent == "CLARIFICATION_NEEDED":
        if result.missing_fields:
            warnings.append(f"Thiếu thông tin bắt buộc: {', '.join(result.missing_fields)}")
        return {
            "intent": result.intent,
            "parsed_request": None,
            "clarification_question": result.clarification_question,
            "final_response_text": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    return {
        "intent": "GENERAL_CHAT",
        "parsed_request": None,
        "clarification_question": None,
        "final_response_text": result.response_text or "Xin chào! Mình là ViVu AI.",
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }


def clarification_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    question = state.get("clarification_question") or "Bạn có thể cung cấp thêm thông tin cho chuyến đi không?"
    trace_logs.append(
        AgentTraceLog(
            agent_name="Supervisor",
            stage="REQUEST_CLARIFICATION",
            status="COMPLETED",
            message=question,
        )
    )
    return {"final_response_text": question, "trace_logs": trace_logs}


def general_chat_node(state: TravelPlanState) -> Dict[str, Any]:
    trace_logs = list(state.get("trace_logs", []))
    response = state.get("final_response_text") or "Xin chào! Mình là ViVu AI."
    trace_logs.append(
        AgentTraceLog(
            agent_name="Supervisor",
            stage="RESPOND_GENERAL_CHAT",
            status="COMPLETED",
            message=response,
        )
    )
    return {"final_response_text": response, "trace_logs": trace_logs}


def destination_node(state: TravelPlanState) -> Dict[str, Any]:
    parsed = state.get("parsed_request")
    trace_logs = list(state.get("trace_logs", []))
    warnings = list(state.get("warnings", []))
    errors = list(state.get("errors", []))

    if parsed is None:
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="MISSING_PARSED_REQUEST",
                message="Destination node được gọi khi parsed_request=None.",
                recoverable=False,
            )
        )
        trace_logs.append(
            AgentTraceLog(
                agent_name="DestinationAgent",
                stage="FETCH_AND_SCORE_CANDIDATES",
                status="FAILED",
                message="Thiếu parsed_request.",
            )
        )
        return {
            "candidate_pool": [],
            "selected_hotel": None,
            "trace_logs": trace_logs,
            "warnings": warnings,
            "errors": errors,
        }

    try:
        candidates = destination_agent.process(parsed)
        selected_hotel = destination_agent.select_hotel(candidates)
    except Exception as exc:
        logger.exception("Destination agent failed")
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="DESTINATION_PROCESS_FAILED",
                message=str(exc),
                recoverable=True,
            )
        )
        candidates = []
        selected_hotel = None

    if not candidates:
        warnings.append(
            f"Không tìm thấy địa điểm phù hợp cho {parsed.destination_city}. Nếu đang chạy offline, hãy kiểm tra offline catalog."
        )
        errors.append(
            AgentError(
                agent_name="DestinationAgent",
                error_code="NO_CANDIDATES_FOUND",
                message=f"Không có candidate hợp lệ cho {parsed.destination_city}.",
                recoverable=True,
            )
        )

    counts = {category: sum(c.category == category for c in candidates) for category in DestinationAgent.CATEGORIES}
    for category in DestinationAgent.CATEGORIES:
        if counts[category] == 0:
            warnings.append(f"Candidate pool chưa có category {category}.")

    trace_logs.append(
        AgentTraceLog(
            agent_name="DestinationAgent",
            stage="FETCH_AND_SCORE_CANDIDATES",
            status="COMPLETED" if candidates else "FAILED",
            message=(
                f"Selected {len(candidates)} candidates for {parsed.destination_city}; "
                f"hotel={selected_hotel.name if selected_hotel else 'None'}; categories={counts}"
            ),
        )
    )

    return {
        "candidate_pool": candidates,
        "selected_hotel": selected_hotel,
        "trace_logs": trace_logs,
        "warnings": warnings,
        "errors": errors,
    }

app/graph/travel_graph.py

from __future__ import annotations

from typing import Literal
from langgraph.graph import END, StateGraph

from app.graph.nodes import clarification_node, destination_node, general_chat_node, supervisor_node
from app.models.state import TravelPlanState


RouteName = Literal["destination", "clarification", "general_chat"]


def route_supervisor_intent(state: TravelPlanState) -> RouteName:
    intent = state.get("intent")
    if intent == "CREATE_PLAN":
        return "destination"
    if intent == "CLARIFICATION_NEEDED":
        return "clarification"
    return "general_chat"


def build_travel_graph():
    graph = StateGraph(TravelPlanState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("clarification", clarification_node)
    graph.add_node("general_chat", general_chat_node)
    graph.add_node("destination", destination_node)

    graph.set_entry_point("supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_supervisor_intent,
        {
            "destination": "destination",
            "clarification": "clarification",
            "general_chat": "general_chat",
        },
    )
    graph.add_edge("clarification", END)
    graph.add_edge("general_chat", END)
    graph.add_edge("destination", END)
    return graph.compile()


travel_graph = build_travel_graph()

app/main.py

from __future__ import annotations

import logging

from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.graph.travel_graph import travel_graph
from app.models.state import MAX_OPTIMIZATION_LOOPS, TravelPlanState
from app.schemas.api import APIErrorResponse, PlanGenerateRequest, PlanGenerateResponse

logging.basicConfig(level=getattr(logging, settings.log_level, logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.1.0",
    description="ViVu AI Orchestration Service - Phase 1 & 2",
)


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request, exc: RequestValidationError):
    message = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=APIErrorResponse(error_code="VALIDATION_ERROR", message=message).model_dump(),
    )


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.environment,
    }


def _initial_state(request: PlanGenerateRequest) -> TravelPlanState:
    return {
        "session_id": request.session_id,
        "user_id": request.user_id,
        "raw_prompt": request.raw_prompt,
        "user_preferences": request.user_preferences,
        "intent": None,
        "clarification_question": None,
        "parsed_request": None,
        "candidate_pool": [],
        "selected_place_ids": [],
        "selected_hotel": None,
        "itinerary_days": [],
        "budget_breakdown": None,
        "optimization_targets": [],
        "optimization_context": None,
        "loop_count": 0,
        "max_loops": MAX_OPTIMIZATION_LOOPS,
        "optimization_exhausted": False,
        "trace_logs": [],
        "warnings": [],
        "errors": [],
        "final_plan": None,
        "final_response_text": None,
    }


@app.post(
    "/api/v1/plan/generate",
    response_model=PlanGenerateResponse,
    responses={422: {"model": APIErrorResponse}, 500: {"model": APIErrorResponse}},
)
def generate_trip_plan(request: PlanGenerateRequest):
    try:
        final_state = travel_graph.invoke(_initial_state(request))
    except Exception:
        logger.exception("Unhandled graph execution error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=APIErrorResponse(
                error_code="GRAPH_EXECUTION_FAILED",
                message="Không thể thực thi quy trình lập kế hoạch.",
                session_id=request.session_id,
            ).model_dump(),
        )

    errors = final_state.get("errors", [])
    fatal_error = any(not error.recoverable for error in errors)

    return PlanGenerateResponse(
        success=not fatal_error,
        session_id=final_state["session_id"],
        intent=final_state.get("intent"),
        parsed_request=final_state.get("parsed_request"),
        candidate_pool=final_state.get("candidate_pool", []),
        selected_hotel=final_state.get("selected_hotel"),
        clarification_question=final_state.get("clarification_question"),
        final_plan=final_state.get("final_plan"),
        final_response_text=final_state.get("final_response_text"),
        trace_logs=final_state.get("trace_logs", []),
        warnings=final_state.get("warnings", []),
        errors=errors,
        optimization_exhausted=final_state.get("optimization_exhausted", False),
    )

tests/test_phase12_core.py

from app.agents.supervisor import SupervisorAgent
from app.tools.cost import calculate_budget


def test_supervisor_full_plan():
    result = SupervisorAgent().parse("Đà Lạt 3 ngày 2 người 5tr thích cafe")
    assert result.intent == "CREATE_PLAN"
    assert result.total_budget == 5_000_000
    assert "CAFE" in result.interests


def test_supervisor_does_not_treat_phone_as_budget():
    result = SupervisorAgent().parse("Đi Huế 2 ngày 2 người, số điện thoại 0901234567")
    assert result.intent == "CLARIFICATION_NEEDED"
    assert result.total_budget is None
    assert "total_budget" in result.missing_fields


def test_non_trip_question_is_general_chat():
    assert SupervisorAgent().parse("Python là gì?").intent == "GENERAL_CHAT"
    assert SupervisorAgent().parse("thời tiết Đà Lạt hôm nay").intent == "GENERAL_CHAT"


def test_cost_engine_uses_contingency_percentage():
    result = calculate_budget(
        num_travelers=2,
        num_days=3,
        num_nights=2,
        max_budget=5_000_000,
        travel_style="BALANCED",
    )
    assert result.subtotal == 3_500_000
    assert result.misc_cost == 350_000
    assert result.total_calculated == 3_850_000
    assert result.status == "BUDGET_OK"

tests/test_destination.py

from app.agents.destination import DestinationAgent
from app.schemas.common import Provenance
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.tools.places import PlacesProvider


class FakeProvider(PlacesProvider):
    def search_places(self, city, categories=None):
        category = categories[0]
        records = {
            "HOTEL": PlaceCandidate(
                place_id="h1", name="Hotel A", category="HOTEL", rating=4.5,
                user_ratings_total=500, address="Đà Lạt", latitude=11.94, longitude=108.44,
                estimated_room_cost_per_night=700_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
            "ATTRACTION": PlaceCandidate(
                place_id="a1", name="Attraction A", category="ATTRACTION", interests=["NATURE"],
                rating=4.7, user_ratings_total=4000, address="Đà Lạt", latitude=11.95, longitude=108.45,
                estimated_cost_per_person=50_000, ticket_price=100_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
            "CAFE": PlaceCandidate(
                place_id="c1", name="Cafe A", category="CAFE", interests=["CAFE"],
                rating=4.6, user_ratings_total=1000, address="Đà Lạt", latitude=11.96, longitude=108.46,
                estimated_cost_per_person=70_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
            "RESTAURANT": PlaceCandidate(
                place_id="r1", name="Restaurant A", category="RESTAURANT", interests=["FOOD"],
                rating=4.4, user_ratings_total=2000, address="Đà Lạt", latitude=11.97, longitude=108.47,
                estimated_cost_per_person=120_000,
                provenance=Provenance(source="INTERNAL_DATABASE"),
            ),
        }
        return [records[category]]


def test_destination_fetches_all_categories_and_scores():
    agent = DestinationAgent(FakeProvider())
    request = ParsedUserRequest(
        destination_city="Đà Lạt", duration_days=3, num_travelers=2,
        total_budget=5_000_000, interests=["CAFE", "NATURE"],
    )
    result = agent.process(request)
    assert {x.category for x in result} == {"HOTEL", "ATTRACTION", "CAFE", "RESTAURANT"}
    assert all(0 <= x.score <= 1 for x in result)

tests/test_offline_catalog.py

from collections import Counter

from app.agents.destination import DestinationAgent
from app.data.offline_places import OFFLINE_PLACES_DATA, OFFLINE_SUPPORTED_CITIES
from app.schemas.request import ParsedUserRequest
from app.tools.places import OfflinePlacesProvider

EXPECTED_CATEGORIES = {"HOTEL", "ATTRACTION", "CAFE", "RESTAURANT"}


def test_offline_catalog_has_12_supported_cities():
    assert len(OFFLINE_PLACES_DATA) == 12
    assert OFFLINE_SUPPORTED_CITIES == frozenset(OFFLINE_PLACES_DATA.keys())


def test_offline_catalog_integrity():
    all_ids = []
    for city, places in OFFLINE_PLACES_DATA.items():
        assert places, city
        assert EXPECTED_CATEGORIES.issubset({place.category for place in places}), city
        for place in places:
            all_ids.append(place.place_id)
            assert place.place_id
            assert place.name
            assert place.rating >= 3.0
            assert -90 <= place.latitude <= 90
            assert -180 <= place.longitude <= 180
            assert not (place.latitude == 0.0 and place.longitude == 0.0)

    counts = Counter(all_ids)
    assert not [place_id for place_id, count in counts.items() if count > 1]


def test_offline_provider_category_filter():
    provider = OfflinePlacesProvider()
    cafes = provider.search_places("Đà Lạt", ["CAFE"])
    assert cafes
    assert all(place.category == "CAFE" for place in cafes)


def test_destination_agent_works_for_every_offline_city():
    agent = DestinationAgent(OfflinePlacesProvider())
    for city in OFFLINE_PLACES_DATA:
        request = ParsedUserRequest(
            destination_city=city,
            duration_days=3,
            num_travelers=2,
            total_budget=5_000_000,
            interests=["FOOD", "NATURE"],
        )
        candidates = agent.process(request)
        assert EXPECTED_CATEGORIES.issubset({c.category for c in candidates}), city
        assert agent.select_hotel(candidates) is not None, city

requirements.txt

fastapi>=0.115,<1
httpx>=0.27,<1
langgraph>=0.2,<1
pydantic>=2.7,<3
uvicorn>=0.30,<1

pytest.ini

[pytest]
pythonpath = .
testpaths = tests