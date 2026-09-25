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
