from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.schemas.request import ParsedUserRequest
from app.schemas.supervisor import SupervisorIntent, SupervisorParseResult
from app.tools.prompting import GeminiSemanticParser


CITY_MAPPINGS = [
    ("Đà Lạt", [r"\bđà lạt\b", r"\bda lat\b", r"\bdalat\b"]),
    ("Đà Nẵng", [r"\bđà nẵng\b", r"\bda nang\b", r"\bdanang\b"]),
    ("Hà Nội", [r"\bhà nội\b", r"\bha noi\b", r"\bhanoi\b"]),
    (
        "Hồ Chí Minh",
        [
            r"\bhồ chí minh\b",
            r"\bho chi minh\b",
            r"\bsài gòn\b",
            r"\bsai gon\b",
            r"\btphcm\b",
            r"\bhcm\b",
        ],
    ),
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
    (
        "NATURE",
        [
            r"\bthiên nhiên\b",
            r"\bnature\b",
            r"\brừng\b",
            r"\bnúi\b",
            r"\bthác\b",
            r"\bcảnh đẹp\b",
        ],
    ),
    (
        "FOOD",
        [
            r"\bẩm thực\b",
            r"\băn uống\b",
            r"\bfood\b",
            r"\bmón ngon\b",
            r"\bquán ăn\b",
            r"\bđặc sản\b",
        ],
    ),
    (
        "CULTURE",
        [
            r"\bvăn hóa\b",
            r"\blịch sử\b",
            r"\bchùa\b",
            r"\bdi tích\b",
            r"\bbảo tàng\b",
        ],
    ),
    (
        "RELAX",
        [
            r"\bnghỉ dưỡng\b",
            r"\brelax\b",
            r"\bchill\b",
            r"\byên tĩnh\b",
            r"\bthư giãn\b",
        ],
    ),
    (
        "CHECKIN",
        [
            r"\bcheckin\b",
            r"\bcheck-in\b",
            r"\bsống ảo\b",
            r"\bchụp ảnh\b",
            r"\bảnh đẹp\b",
        ],
    ),
    ("BEACH", [r"\bbiển\b", r"\btắm biển\b", r"\bbãi biển\b"]),
]

TRAVEL_KEYWORDS = [
    r"\bdu lịch\b",
    r"\blịch trình\b",
    r"\btour\b",
    r"\bchuyến đi\b",
    r"\bphượt\b",
    r"\btham quan\b",
]

GREETING_PATTERNS = [
    r"^xin chào[!. ]*$",
    r"^chào bạn[!. ]*$",
    r"^hello[!. ]*$",
    r"^hi[!. ]*$",
    r"^tạm biệt[!. ]*$",
]

# Deterministic negation guard. The semantic LLM is never allowed to turn an
# explicitly negative user preference into a positive preference.
NEGATION_PATTERNS = [
    r"\bkhông\b",
    r"\bko\b",
    r"\bchẳng\b",
    r"\bchả\b",
    r"\bđừng\b",
    r"\btránh\b",
    r"\bné\b",
    r"\bhạn chế\b",
    r"\bkhông thích\b",
    r"\bkhông muốn\b",
    r"\bkhông cần\b",
    r"\bkhông ưu tiên\b",
]
NEGATION_WINDOW_CHARS = 36


class SupervisorAgent:
    def __init__(self, semantic_parser: Optional[GeminiSemanticParser] = None) -> None:
        self.semantic_parser = semantic_parser or GeminiSemanticParser()

    def parse(
        self,
        raw_prompt: str,
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> SupervisorParseResult:
        text = raw_prompt.strip().lower()

        destination = self._extract_destination(text)
        days = self._extract_days(text)
        travelers = self._extract_travelers(text)
        budget = self._extract_budget(text)
        blocked_interests = self._extract_negated_interest_codes(text)
        interests = [
            code for code in self._extract_interests(text)
            if code not in blocked_interests
        ]
        travel_style, travel_style_explicit = self._extract_travel_style(text)
        travel_pace, travel_pace_explicit = self._extract_travel_pace(text)
        hotel_pref = self._extract_hotel_preference(text)
        start_date = self._extract_start_date(text)

        blocked_styles = self._extract_negated_styles(text)
        blocked_paces = self._extract_negated_paces(text)
        hotel_negated = self._has_negated_hotel_signal(text)

        semantic_style_found = False
        semantic_pace_found = False
        semantic_interests_found = False
        semantic_hotel_found = False

        explicit_travel_signal = any(re.search(pattern, text) for pattern in TRAVEL_KEYWORDS)
        structured_count = sum(
            value is not None
            for value in (destination, days, travelers, budget)
        )

        # Optional Gemini semantic enrichment. Required fields remain deterministic.
        if (
            self.semantic_parser.available
            and not self._is_greeting_only(text)
            and (destination is not None or explicit_travel_signal or structured_count >= 2)
        ):
            semantic = self.semantic_parser.parse(raw_prompt) or {}

            if not interests:
                semantic_interests = [
                    code
                    for code in self._coerce_interests(semantic.get("interests"))
                    if code not in blocked_interests
                ]
                if semantic_interests:
                    interests = semantic_interests
                    semantic_interests_found = True

            if not travel_style_explicit:
                semantic_style = str(semantic.get("travel_style") or "").upper()
                if (
                    semantic_style in {"BUDGET", "BALANCED", "LUXURY"}
                    and semantic_style not in blocked_styles
                ):
                    travel_style = semantic_style  # type: ignore[assignment]
                    semantic_style_found = True

            if not travel_pace_explicit:
                semantic_pace = str(semantic.get("travel_pace") or "").upper()
                if (
                    semantic_pace in {"RELAXED", "MODERATE", "FAST"}
                    and semantic_pace not in blocked_paces
                ):
                    travel_pace = semantic_pace  # type: ignore[assignment]
                    semantic_pace_found = True

            if hotel_pref is None and not hotel_negated:
                semantic_hotel = semantic.get("hotel_preference")
                if isinstance(semantic_hotel, str) and semantic_hotel.strip():
                    hotel_pref = semantic_hotel.strip()
                    semantic_hotel_found = True

        # Saved preferences are a fallback only. Explicit prompt intent wins.
        if user_preferences:
            if not interests and not semantic_interests_found:
                interests = [
                    code
                    for code in self._coerce_interests(user_preferences.get("interests"))
                    if code not in blocked_interests
                ]

            if not travel_style_explicit and not semantic_style_found:
                pref_style = str(user_preferences.get("travel_style") or "").upper()
                if (
                    pref_style in {"BUDGET", "BALANCED", "LUXURY"}
                    and pref_style not in blocked_styles
                ):
                    travel_style = pref_style  # type: ignore[assignment]

            if not travel_pace_explicit and not semantic_pace_found:
                pref_pace = str(user_preferences.get("travel_pace") or "").upper()
                if (
                    pref_pace in {"RELAXED", "MODERATE", "FAST"}
                    and pref_pace not in blocked_paces
                ):
                    travel_pace = pref_pace  # type: ignore[assignment]

            if hotel_pref is None and not semantic_hotel_found and not hotel_negated:
                pref_hotel = user_preferences.get("hotel_preference")
                if isinstance(pref_hotel, str) and pref_hotel.strip():
                    hotel_pref = pref_hotel.strip()

            if start_date is None:
                start_date = self._coerce_date(user_preferences.get("start_date"))

        structured_travel_signal = structured_count >= 2
        interest_signal = bool(interests) and destination is not None

        if self._is_greeting_only(text):
            return self._general_chat_result(
                "Xin chào! Mình có thể giúp bạn lập kế hoạch du lịch theo điểm đến, số ngày, số người và ngân sách."
            )

        if not (explicit_travel_signal or structured_travel_signal or interest_signal):
            return self._general_chat_result(
                "Mình là ViVu AI, tập trung hỗ trợ lập kế hoạch du lịch. "
                "Nếu bạn muốn tạo chuyến đi, hãy cho mình biết điểm đến, số ngày, số người và ngân sách."
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

        intent: SupervisorIntent = (
            "CLARIFICATION_NEEDED" if missing_fields else "CREATE_PLAN"
        )
        question = (
            self._generate_clarification_question(missing_fields, destination)
            if missing_fields
            else None
        )

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
            start_date=start_date,
            missing_fields=missing_fields,
            clarification_question=question,
        )

    def to_parsed_user_request(
        self,
        result: SupervisorParseResult,
    ) -> Optional[ParsedUserRequest]:
        if result.intent != "CREATE_PLAN":
            return None
        if any(
            value is None
            for value in (
                result.destination_city,
                result.duration_days,
                result.num_travelers,
                result.total_budget,
            )
        ):
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
            start_date=result.start_date,
        )

    def _general_chat_result(self, response_text: str) -> SupervisorParseResult:
        return SupervisorParseResult(
            intent="GENERAL_CHAT",
            response_text=response_text,
        )

    def _is_greeting_only(self, text: str) -> bool:
        return any(re.search(pattern, text) for pattern in GREETING_PATTERNS)

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
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = int(match.group(1))
                if 1 <= value <= 14:
                    return value
        return None

    def _extract_travelers(self, text: str) -> Optional[int]:
        if re.search(r"\b(?:1 mình|một mình|độc hành)\b", text):
            return 1
        if re.search(r"\b(?:2 vợ chồng|hai vợ chồng|cặp đôi)\b", text):
            return 2
        match = re.search(
            r"(\d+)\s*(?:người|nguoi|ng\b|pax|khách|thành viên|bạn(?:\s+bè)?)",
            text,
        )
        if match:
            value = int(match.group(1))
            if 1 <= value <= 50:
                return value
        return None

    def _extract_budget(self, text: str) -> Optional[int]:
        match = re.search(
            r"(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr\b|củ|cu\b|m\b)",
            text,
        )
        if match:
            value = match.group(1).replace(",", ".")
            return int(float(value) * 1_000_000)

        match = re.search(
            r"(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|vnđ|dong|đồng)?\b",
            text,
        )
        if match:
            return int(re.sub(r"[.,]", "", match.group(1)))

        match = re.search(r"(\d+)\s*(?:k\b|nghìn|ngàn|ngan)", text)
        if match:
            return int(match.group(1)) * 1_000

        match = re.search(r"(\d{5,10})\s*(?:đ|vnd|vnđ|dong|đồng)\b", text)
        if match:
            return int(match.group(1))

        context = re.search(
            r"(?:ngân sách|budget|tầm|khoảng)\D{0,20}(\d{5,10})\b",
            text,
        )
        if context:
            return int(context.group(1))
        return None

    def _extract_interests(self, text: str) -> List[str]:
        found: List[str] = []
        for code, patterns in INTEREST_KEYWORDS:
            positive = False
            for pattern in patterns:
                for match in re.finditer(pattern, text):
                    if not self._is_negated_before(text, match.start()):
                        positive = True
                        break
                if positive:
                    break
            if positive:
                found.append(code)
        return found

    def _extract_negated_interest_codes(self, text: str) -> List[str]:
        blocked: List[str] = []
        for code, patterns in INTEREST_KEYWORDS:
            for pattern in patterns:
                if any(
                    self._is_negated_before(text, match.start())
                    for match in re.finditer(pattern, text)
                ):
                    blocked.append(code)
                    break
        return list(dict.fromkeys(blocked))

    def _extract_travel_style(self, text: str) -> tuple[str, bool]:
        style_patterns = {
            "BUDGET": r"\b(?:tiết kiệm|giá rẻ|bình dân|budget|sinh viên)\b",
            "LUXURY": r"\b(?:sang chảnh|cao cấp|luxury|5 sao|resort|xa hoa|xa xỉ)\b",
            "BALANCED": r"\b(?:cân bằng|vừa phải|balanced)\b",
        }
        for style, pattern in style_patterns.items():
            for match in re.finditer(pattern, text):
                if not self._is_negated_before(text, match.start()):
                    return style, True
        return "BALANCED", False

    def _extract_travel_pace(self, text: str) -> tuple[str, bool]:
        pace_patterns = {
            "RELAXED": r"\b(?:thong thả|thư thả|nhẹ nhàng|chill|relax|chậm rãi)\b",
            "FAST": r"\b(?:dày đặc|nhanh|nhiều nơi|khám phá tối đa|fast)\b",
            "MODERATE": r"\b(?:vừa phải|moderate)\b",
        }
        for pace, pattern in pace_patterns.items():
            for match in re.finditer(pattern, text):
                if not self._is_negated_before(text, match.start()):
                    return pace, True
        return "MODERATE", False

    def _extract_hotel_preference(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:khách sạn|khach san|hotel|resort)\s+([a-zA-Z0-9\s\u00C0-\u1EF9&.-]+?)(?=\s*(?:,|;|\.|và|cho|với|tầm|giá|ngân sách|$))",
            r"\bở\s+([a-zA-Z0-9\s\u00C0-\u1EF9&.-]+?\b(?:hotel|resort))\b",
        ]
        stop_words = {
            "nào",
            "gì",
            "sao",
            "bình dân",
            "tiết kiệm",
            "sang chảnh",
            "cao cấp",
            "đẹp",
            "tốt",
            "rẻ",
        }
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            if self._is_negated_before(text, match.start()):
                continue
            candidate = " ".join(match.group(1).split()).strip(" ,.-")
            if len(candidate) >= 3 and candidate.lower() not in stop_words:
                return candidate
        return None

    def _extract_negated_styles(self, text: str) -> set[str]:
        patterns = {
            "BUDGET": r"\b(?:tiết kiệm|giá rẻ|bình dân|budget|sinh viên)\b",
            "LUXURY": r"\b(?:sang chảnh|cao cấp|luxury|5 sao|resort|xa hoa|xa xỉ)\b",
            "BALANCED": r"\b(?:cân bằng|vừa phải|balanced)\b",
        }
        return {
            style
            for style, pattern in patterns.items()
            if any(
                self._is_negated_before(text, match.start())
                for match in re.finditer(pattern, text)
            )
        }

    def _extract_negated_paces(self, text: str) -> set[str]:
        patterns = {
            "RELAXED": r"\b(?:thong thả|thư thả|nhẹ nhàng|chill|relax|chậm rãi)\b",
            "FAST": r"\b(?:dày đặc|nhanh|nhiều nơi|khám phá tối đa|fast)\b",
            "MODERATE": r"\b(?:vừa phải|moderate)\b",
        }
        return {
            pace
            for pace, pattern in patterns.items()
            if any(
                self._is_negated_before(text, match.start())
                for match in re.finditer(pattern, text)
            )
        }

    def _has_negated_hotel_signal(self, text: str) -> bool:
        hotel_pattern = r"\b(?:khách sạn|khach san|hotel|resort)\b"
        return any(
            self._is_negated_before(text, match.start())
            for match in re.finditer(hotel_pattern, text)
        )

    @staticmethod
    def _is_negated_before(text: str, match_start: int) -> bool:
        """Detect a nearby negation without leaking across an adversative clause.

        Example:
            "không thích cà phê nhưng thích thiên nhiên"
        must block CAFE but keep NATURE positive.
        """
        prefix = text[max(0, match_start - NEGATION_WINDOW_CHARS):match_start]

        # A new adversative clause resets the previous negation scope.
        reset_pattern = r"\b(?:nhưng|tuy nhiên|trong khi|mà)\b"
        reset_positions = [match.end() for match in re.finditer(reset_pattern, prefix)]
        if reset_positions:
            prefix = prefix[max(reset_positions):]

        return any(re.search(pattern, prefix) for pattern in NEGATION_PATTERNS)

    def _extract_start_date(self, text: str) -> Optional[date]:
        patterns = [
            r"\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b",
            r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b",
        ]
        for index, pattern in enumerate(patterns):
            match = re.search(pattern, text)
            if not match:
                continue
            try:
                if index == 0:
                    day, month, year = map(int, match.groups())
                else:
                    year, month, day = map(int, match.groups())
                return date(year, month, day)
            except ValueError:
                continue
        return None

    @staticmethod
    def _coerce_date(value: Any) -> Optional[date]:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _coerce_interests(value: Any) -> List[str]:
        if isinstance(value, str):
            values = [item.strip().upper() for item in value.split(",")]
        elif isinstance(value, list):
            values = [str(item).strip().upper() for item in value]
        else:
            return []
        allowed = {code for code, _ in INTEREST_KEYWORDS}
        return list(dict.fromkeys(item for item in values if item in allowed))

    def _generate_clarification_question(
        self,
        missing_fields: List[str],
        destination: Optional[str],
    ) -> str:
        if len(missing_fields) == 1:
            field = missing_fields[0]
            if field == "total_budget":
                suffix = f" đi {destination}" if destination else ""
                return (
                    f"Bạn dự kiến tổng ngân sách cho chuyến đi{suffix} khoảng bao nhiêu tiền "
                    f"(ví dụ: 5 triệu)?"
                )
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
        fields = ", ".join(labels[field] for field in missing_fields)
        return f"Để lên kế hoạch chính xác, bạn vui lòng bổ sung: {fields}."
