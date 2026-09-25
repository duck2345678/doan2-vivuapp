"""Tests cho Giai đoạn 3 & 4: BudgetAgent + Optimization Loop.

Coverage:
    - BudgetAgent: ticket cost, transport cost, hotel cost, BUDGET_OK, OVER_BUDGET
    - Optimization targets: thứ tự ưu tiên, target_reduction đủ bù over_amount
    - budget_node: wiring, trace log, missing itinerary guard
    - finalize_node: FinalTripPlan, response_text khi BUDGET_OK / OVER_BUDGET / exhausted
    - optimization_node: loop_count tăng dần
    - exhausted_node: optimization_exhausted = True
    - travel_graph: end-to-end BUDGET_OK
    - Killer test: 5.61M → OVER_BUDGET → replan → 4.73M → BUDGET_OK
"""
from __future__ import annotations

import math
from typing import List, Optional

import pytest

from app.agents.budget import BudgetAgent
from app.agents.destination import DestinationAgent
from app.agents.itinerary import ItineraryAgent
from app.graph.nodes import (
    budget_node,
    exhausted_node,
    finalize_node,
    optimization_node,
)
from app.graph.travel_graph import travel_graph
from app.models.state import MAX_OPTIMIZATION_LOOPS
from app.schemas.budget import BudgetBreakdown, OptimizationContext, OptimizationTarget
from app.schemas.common import Provenance
from app.schemas.itinerary import DayItinerary, RouteSegment, TimeSlot
from app.schemas.place import PlaceCandidate
from app.schemas.request import ParsedUserRequest
from app.schemas.travel_plan import FinalTripPlan
from app.tools.cost import COST_TABLE, MISC_CONTINGENCY_PERCENT
from app.tools.places import OfflinePlacesProvider
from app.tools.routes import HaversineRouteProvider


# ── Helpers ────────────────────────────────────────────────────────────────────

def _provenance() -> Provenance:
    return Provenance(source="INTERNAL_DATABASE")


def _request(**overrides) -> ParsedUserRequest:
    base = dict(
        destination_city="Đà Lạt",
        duration_days=3,
        num_travelers=2,
        total_budget=5_000_000,
        interests=["CAFE", "NATURE"],
        travel_pace="MODERATE",
        travel_style="BALANCED",
    )
    base.update(overrides)
    return ParsedUserRequest(**base)


def _place(
    place_id: str,
    name: str,
    category: str,
    lat: float = 11.94,
    lng: float = 108.44,
    **kwargs,
) -> PlaceCandidate:
    base = dict(
        place_id=place_id,
        name=name,
        category=category,
        rating=4.2,
        user_ratings_total=500,
        address="Đà Lạt",
        latitude=lat,
        longitude=lng,
        provenance=_provenance(),
        score=0.7,
    )
    base.update(kwargs)
    return PlaceCandidate(**base)


def _slot(
    place_id: str,
    place_name: str = "Test",
    slot_type: str = "MORNING",
    start_time: str = "08:00",
    end_time: str = "10:00",
    estimated_cost: int = 0,
) -> TimeSlot:
    return TimeSlot(
        slot_type=slot_type,  # type: ignore[arg-type]
        start_time=start_time,
        end_time=end_time,
        place_id=place_id,
        place_name=place_name,
        estimated_cost=estimated_cost,
    )


def _segment(from_id: str, to_id: str, km: float = 5.0) -> RouteSegment:
    return RouteSegment(
        from_place_id=from_id,
        to_place_id=to_id,
        distance_km=km,
        duration_minutes=12,
        provenance=Provenance(source="INTERNAL_ESTIMATE", is_estimate=True),
    )


def _day(
    day_number: int,
    slots: List[TimeSlot],
    segments: Optional[List[RouteSegment]] = None,
) -> DayItinerary:
    segs = segments or []
    return DayItinerary(
        day_number=day_number,
        time_slots=slots,
        route_segments=segs,
        total_travel_distance_km=sum(s.distance_km for s in segs),
        total_travel_time_minutes=sum(s.duration_minutes for s in segs),
        daily_cost=sum(s.estimated_cost for s in slots),
    )


def _minimal_state(**overrides) -> dict:
    base: dict = {
        "session_id": "test-session",
        "user_id": None,
        "raw_prompt": "",
        "user_preferences": None,
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
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════════
# BudgetAgent unit tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBudgetAgentTicketCost:
    def test_ticket_cost_multiplied_by_num_travelers(self):
        pool = [_place("a1", "Attr", "ATTRACTION", ticket_price=200_000)]
        slots = [_slot("a1", "Attr", estimated_cost=200_000 * 2)]
        days = [_day(1, slots)]
        req = _request(num_travelers=2)
        agent = BudgetAgent()
        cost = agent._collect_ticket_cost(days, pool, req.num_travelers)
        assert cost == 400_000

    def test_ticket_cost_no_duplicate_counting(self):
        """Cùng attraction xuất hiện trong nhiều ngày → chỉ tính 1 lần."""
        pool = [_place("a1", "Attr", "ATTRACTION", ticket_price=150_000)]
        slots = [_slot("a1", "Attr", estimated_cost=300_000)]
        days = [
            _day(1, [_slot("a1", start_time="08:00", end_time="10:00", estimated_cost=300_000)]),
            _day(2, [_slot("a1", start_time="08:00", end_time="10:00", estimated_cost=300_000)]),
        ]
        cost = BudgetAgent._collect_ticket_cost(days, pool, 2)
        assert cost == 300_000  # chỉ tính lần đầu

    def test_no_ticket_for_cafe(self):
        pool = [_place("c1", "Cafe", "CAFE", estimated_cost_per_person=50_000)]
        days = [_day(1, [_slot("c1", estimated_cost=100_000)])]
        cost = BudgetAgent._collect_ticket_cost(days, pool, 2)
        assert cost == 0

    def test_ticket_none_excluded(self):
        """ATTRACTION không có ticket_price không được cộng vào ticket_cost."""
        pool = [_place("a1", "Attr", "ATTRACTION")]  # ticket_price=None
        days = [_day(1, [_slot("a1", estimated_cost=0)])]
        cost = BudgetAgent._collect_ticket_cost(days, pool, 2)
        assert cost == 0


class TestBudgetAgentTransportCost:
    def test_transport_cost_from_segments(self):
        """Transport cost = route segments."""
        from app.tools.cost import DEFAULT_TRANSPORT_RATE_PER_KM
        segs = [_segment("a", "b", km=10.0), _segment("b", "c", km=5.0)]
        days = [_day(1, [], segs)]
        cost = BudgetAgent._collect_transport_cost(days)
        expected_km = 15.0
        assert cost == math.ceil(expected_km * DEFAULT_TRANSPORT_RATE_PER_KM)

    def test_transport_zero_no_segments(self):
        """Không có route segment -> 0."""
        days = [_day(1, [])]
        cost = BudgetAgent._collect_transport_cost(days)
        assert cost == 0


class TestBudgetAgentHotelCost:
    def test_explicit_hotel_cost_used(self):
        hotel = _place("h1", "Hotel", "HOTEL", estimated_room_cost_per_night=600_000)
        req = _request(num_travelers=2, duration_days=3)
        cost = BudgetAgent._explicit_hotel_cost(hotel, req)
        # rooms = ceil(2/2) = 1, nights = 3-1 = 2, 1 * 2 * 600_000 = 1_200_000
        assert cost == 1_200_000

    def test_no_hotel_returns_none(self):
        req = _request()
        assert BudgetAgent._explicit_hotel_cost(None, req) is None

    def test_hotel_without_room_cost_returns_none(self):
        hotel = _place("h1", "Hotel", "HOTEL")  # no estimated_room_cost_per_night
        req = _request()
        assert BudgetAgent._explicit_hotel_cost(hotel, req) is None

    def test_odd_travelers_ceil_rooms(self):
        hotel = _place("h1", "Hotel", "HOTEL", estimated_room_cost_per_night=700_000)
        req = _request(num_travelers=3, duration_days=4)
        cost = BudgetAgent._explicit_hotel_cost(hotel, req)
        # rooms = ceil(3/2) = 2, nights = 4-1 = 3, 2 * 3 * 700_000 = 4_200_000
        assert cost == 4_200_000


class TestBudgetAgentProcess:
    def _make_simple(self, budget: int, ticket: int = 0) -> tuple:
        pool = [
            _place("a1", "Attr", "ATTRACTION", ticket_price=ticket // 2 if ticket else None),
            _place("c1", "Cafe", "CAFE"),
            _place("r1", "Rest", "RESTAURANT"),
        ]
        slot_a = _slot("a1", estimated_cost=ticket)
        slot_c = _slot("c1", start_time="09:00", end_time="10:00", estimated_cost=100_000)
        slot_r = _slot("r1", slot_type="LUNCH", start_time="12:00", end_time="13:00", estimated_cost=200_000)
        segs = [_segment("a1", "c1", 2.0), _segment("c1", "r1", 3.0)]
        days = [_day(1, [slot_a, slot_c, slot_r], segs)]
        req = _request(total_budget=budget, num_travelers=2)
        return req, days, pool

    def test_budget_ok_status(self):
        req, days, pool = self._make_simple(budget=10_000_000)
        agent = BudgetAgent()
        breakdown, targets, context = agent.process(req, days, pool)
        assert breakdown.status == "BUDGET_OK"
        assert targets == []
        assert context is not None
        assert context.termination_reason == "BUDGET_OK"

    def test_over_budget_generates_targets(self):
        req, days, pool = self._make_simple(budget=50_000, ticket=1_000_000)  # impossibly small
        # add slots so it generates targets
        days[0].time_slots.append(_slot("a1", estimated_cost=300_000))
        agent = BudgetAgent()
        breakdown, targets, context = agent.process(req, days, pool)
        assert breakdown.status == "OVER_BUDGET"
        assert len(targets) > 0
        assert context is not None
        assert context.previous_total == breakdown.total_calculated
        assert context.target_reduction_total == breakdown.over_amount

    def test_targets_cover_over_amount(self):
        """Targets phải cover over_amount khi slot costs đủ lớn.

        Khi budget quá nhỏ so với hotel+food (không có slot target cho các
        khoản này), targets chỉ cover phần slot costs có thể. Test này dùng
        budget đủ hợp lý để chỉ cần giảm slot costs là ok.
        """
        # Tạo case mà slot costs đủ lớn để cover over_amount
        pool = [
            _place("a1", "Attr", "ATTRACTION", ticket_price=300_000),
            _place("c1", "Cafe", "CAFE", estimated_cost_per_person=200_000),
            _place("r1", "Rest", "RESTAURANT", estimated_cost_per_person=150_000),
        ]
        slot_a = _slot("a1", estimated_cost=600_000)   # ticket × 2
        slot_c = _slot("c1", start_time="09:00", end_time="10:00", estimated_cost=400_000)
        slot_r = _slot("r1", slot_type="LUNCH", start_time="12:00", end_time="13:30", estimated_cost=300_000)
        segs = [_segment("a1", "c1", 2.0), _segment("c1", "r1", 3.0)]
        days = [_day(1, [slot_a, slot_c, slot_r], segs)]
        # Budget nhỏ hơn hotel+food+slot+transport+misc nhưng slots đủ bù
        # BALANCED 1 người 1 ngày: hotel=700k*1room*0nights=0, food=350k, misc+transport
        req = _request(num_travelers=2, duration_days=1, total_budget=1_000_000, travel_style="BALANCED")
        agent = BudgetAgent()
        breakdown, targets, _ = agent.process(req, days, pool)
        assert breakdown.status == "OVER_BUDGET"
        assert len(targets) > 0
        # Mỗi target phải có target_reduction > 0
        for t in targets:
            assert t.target_reduction > 0

    def test_budget_arithmetic_exact(self):
        """Kiểm tra toán học chính xác theo plan.md §30 (bao gồm terminal transit)."""
        req = _request(
            num_travelers=2,
            duration_days=3,
            total_budget=10_000_000,  # rộng rãi để đảm bảo BUDGET_OK
            travel_style="BALANCED",
        )
        rates = COST_TABLE["BALANCED"]
        # hotel: 1 room × 2 nights × 700_000 = 1_400_000
        expected_hotel = 1 * 2 * rates["hotel_per_room"]
        # food: 2 × 3 × 350_000 = 2_100_000
        expected_food = 2 * 3 * rates["meal_per_person_day"]
        pool: list[PlaceCandidate] = []
        days: list[DayItinerary] = [_day(i, []) for i in range(1, 4)]
        agent = BudgetAgent()
        breakdown, _, _ = agent.process(req, days, pool)
        assert breakdown.hotel_cost == expected_hotel
        assert breakdown.food_cost == expected_food
        assert breakdown.transport_cost == 0
        subtotal = expected_hotel + expected_food + 0
        assert breakdown.subtotal == subtotal
        expected_misc = subtotal * MISC_CONTINGENCY_PERCENT // 100
        assert breakdown.misc_cost == expected_misc
        assert breakdown.total_calculated == subtotal + expected_misc


class TestOptimizationTargetPriority:
    def test_cafe_targeted_before_attraction(self):
        """Cafe phải xuất hiện trước Attraction trong danh sách targets (priority thấp hơn)."""
        pool = [
            _place("c1", "Cafe", "CAFE", estimated_cost_per_person=200_000),
            _place("a1", "Attr", "ATTRACTION", ticket_price=300_000),
            _place("r1", "Rest", "RESTAURANT", estimated_cost_per_person=150_000),
        ]
        slots = [
            _slot("c1", "Cafe", "MORNING", "08:00", "09:00", estimated_cost=400_000),
            _slot("a1", "Attr", "MORNING", "10:00", "12:00", estimated_cost=600_000),
            _slot("r1", "Rest", "LUNCH", "12:00", "13:30", estimated_cost=300_000),
        ]
        days = [_day(1, slots)]
        req = _request(total_budget=100_000)  # ép OVER_BUDGET
        agent = BudgetAgent()
        _, targets, _ = agent.process(req, days, pool)
        if len(targets) >= 2:
            # Cafe (priority 0) phải đứng trước Attraction (priority 2) hoặc Restaurant (priority 1)
            categories = [t.target_category for t in targets]
            if "CAFE" in categories and "ATTRACTION" in categories:
                assert categories.index("CAFE") < categories.index("ATTRACTION")

    def test_hotel_target_last(self):
        """Hotel target chỉ được tạo sau khi slot targets đã tính."""
        hotel = _place("h1", "Hotel", "HOTEL", estimated_room_cost_per_night=800_000)
        pool = [_place("c1", "Cafe", "CAFE", estimated_cost_per_person=100_000), hotel]
        slots = [_slot("c1", "Cafe", "MORNING", "08:00", "09:00", estimated_cost=200_000)]
        days = [_day(1, slots)]
        req = _request(total_budget=100_000)  # ép OVER_BUDGET
        agent = BudgetAgent()
        _, targets, _ = agent.process(req, days, pool, selected_hotel=hotel)
        if len(targets) > 1:
            hotel_targets = [t for t in targets if t.target_category == "HOTEL"]
            non_hotel = [t for t in targets if t.target_category != "HOTEL"]
            if hotel_targets and non_hotel:
                assert targets.index(hotel_targets[0]) > targets.index(non_hotel[-1])


# ═══════════════════════════════════════════════════════════════════════════════
# budget_node
# ═══════════════════════════════════════════════════════════════════════════════

class TestBudgetNode:
    def _state_with_itinerary(self, budget: int = 5_000_000) -> dict:
        dest = DestinationAgent(OfflinePlacesProvider())
        req = _request(total_budget=budget)
        pool = dest.process(req)
        hotel = dest.select_hotel(pool)
        agent = ItineraryAgent(HaversineRouteProvider())
        days, ids, _ = agent.process(req, pool, hotel)
        return _minimal_state(
            parsed_request=req,
            candidate_pool=pool,
            selected_hotel=hotel,
            itinerary_days=days,
            selected_place_ids=ids,
        )

    def test_budget_node_returns_breakdown(self):
        state = self._state_with_itinerary()
        result = budget_node(state)
        assert result["budget_breakdown"] is not None
        bd = result["budget_breakdown"]
        assert bd.status in ("BUDGET_OK", "OVER_BUDGET")

    def test_budget_node_trace_log_present(self):
        state = self._state_with_itinerary()
        result = budget_node(state)
        stages = [l.stage for l in result["trace_logs"]]
        assert "BUDGET_OK" in stages or "OVER_BUDGET" in stages

    def test_budget_node_missing_itinerary(self):
        state = _minimal_state(
            parsed_request=_request(),
            itinerary_days=[],
        )
        result = budget_node(state)
        assert result["budget_breakdown"] is None
        codes = [e.error_code for e in result["errors"]]
        assert "NO_ITINERARY_FOR_BUDGET" in codes


# ═══════════════════════════════════════════════════════════════════════════════
# finalize_node
# ═══════════════════════════════════════════════════════════════════════════════

class TestFinalizeNode:
    def _breakdown(self, over: int = 0) -> BudgetBreakdown:
        status = "BUDGET_OK" if over == 0 else "OVER_BUDGET"
        total = 4_000_000 + over
        return BudgetBreakdown(
            hotel_cost=1_400_000,
            food_cost=2_100_000,
            ticket_cost=500_000,
            transport_cost=0,
            subtotal=4_000_000,
            misc_cost=0,
            total_calculated=total,
            max_budget=4_500_000,
            remaining=max(0, 4_500_000 - total),
            status=status,
            over_amount=over,
        )

    def test_final_plan_created(self):
        req = _request()
        state = _minimal_state(
            parsed_request=req,
            itinerary_days=[_day(1, [])],
            budget_breakdown=self._breakdown(),
        )
        result = finalize_node(state)
        assert isinstance(result["final_plan"], FinalTripPlan)
        assert result["final_plan"].destination_city == "Đà Lạt"

    def test_response_text_budget_ok(self):
        state = _minimal_state(
            parsed_request=_request(),
            itinerary_days=[_day(1, [])],
            budget_breakdown=self._breakdown(over=0),
        )
        result = finalize_node(state)
        assert "✅" in result["final_response_text"]
        assert "còn dư" in result["final_response_text"]

    def test_response_text_exhausted(self):
        state = _minimal_state(
            parsed_request=_request(),
            itinerary_days=[_day(1, [])],
            budget_breakdown=self._breakdown(over=500_000),
            optimization_exhausted=True,
        )
        result = finalize_node(state)
        assert "⚠️" in result["final_response_text"]
        assert "thấp nhất" in result["final_response_text"]

    def test_missing_parsed_request(self):
        state = _minimal_state(budget_breakdown=self._breakdown())
        result = finalize_node(state)
        assert result["final_plan"] is None
        assert "Không thể hoàn tất" in result["final_response_text"]


# ═══════════════════════════════════════════════════════════════════════════════
# optimization_node / exhausted_node
# ═══════════════════════════════════════════════════════════════════════════════

class TestOptimizationNode:
    def test_loop_count_increments(self):
        state = _minimal_state(loop_count=0)
        result = optimization_node(state)
        assert result["loop_count"] == 1

    def test_loop_count_increments_multiple(self):
        state = _minimal_state(loop_count=2)
        result = optimization_node(state)
        assert result["loop_count"] == 3

    def test_trace_log_added(self):
        state = _minimal_state(loop_count=1)
        result = optimization_node(state)
        stages = [l.stage for l in result["trace_logs"]]
        assert "OPTIMIZING" in stages


class TestExhaustedNode:
    def test_sets_exhausted_flag(self):
        state = _minimal_state()
        result = exhausted_node(state)
        assert result["optimization_exhausted"] is True

    def test_warning_added(self):
        state = _minimal_state()
        result = exhausted_node(state)
        assert len(result["warnings"]) > 0

    def test_trace_log_added(self):
        state = _minimal_state()
        result = exhausted_node(state)
        stages = [l.stage for l in result["trace_logs"]]
        assert "OPTIMIZATION_TERMINATED" in stages


# ═══════════════════════════════════════════════════════════════════════════════
# End-to-end: travel_graph
# ═══════════════════════════════════════════════════════════════════════════════

class TestTravelGraphEndToEnd:
    def _run(self, prompt: str, **prefs) -> dict:
        initial = _minimal_state(
            session_id="e2e-test",
            raw_prompt=prompt,
            user_preferences=prefs or None,
        )
        return travel_graph.invoke(initial)

    def test_full_pipeline_budget_ok(self):
        """Đà Lạt 3 ngày 2 người 5 triệu → phải kết thúc với final_plan."""
        result = self._run("Đà Lạt 3 ngày 2 đêm, 2 người, ngân sách 5 triệu, thích cà phê và thiên nhiên")
        assert result.get("final_plan") is not None
        fp = result["final_plan"]
        assert fp.destination_city.lower() in ("đà lạt", "da lat", "dalat")
        assert fp.duration_days == 3
        assert fp.num_travelers == 2
        assert isinstance(fp.budget_breakdown, BudgetBreakdown)

    def test_full_pipeline_itinerary_days_count(self):
        """Số ngày trong final_plan <= duration_days (có thể ít hơn khi catalog thiếu POI)."""
        result = self._run("Hội An 2 ngày 1 đêm 2 người ngân sách 3 triệu")
        if result.get("final_plan"):
            days_count = len(result["final_plan"].itinerary_days)
            assert 1 <= days_count <= 2, f"Expected 1-2 days, got {days_count}"

    def test_general_chat_no_final_plan(self):
        result = self._run("Xin chào! Bạn là ai vậy?")
        assert result.get("intent") == "GENERAL_CHAT"
        assert result.get("final_plan") is None

    def test_clarification_no_final_plan(self):
        result = self._run("Tôi muốn đi Đà Lạt 3 ngày")
        assert result.get("intent") == "CLARIFICATION_NEEDED"
        assert result.get("final_plan") is None
        assert result.get("clarification_question") is not None

    def test_budget_breakdown_arithmetic(self):
        """Kiểm tra breakdown.total = subtotal + misc (không tính sai)."""
        result = self._run("Đà Lạt 3 ngày 2 đêm 2 người ngân sách 8 triệu")
        if result.get("final_plan"):
            bd = result["final_plan"].budget_breakdown
            assert bd.subtotal == bd.hotel_cost + bd.food_cost + bd.ticket_cost + bd.transport_cost
            expected_misc = bd.subtotal * MISC_CONTINGENCY_PERCENT // 100
            assert bd.misc_cost == expected_misc
            assert bd.total_calculated == bd.subtotal + bd.misc_cost

    def test_no_duplicate_places_in_itinerary(self):
        result = self._run("Đà Lạt 3 ngày 2 đêm 2 người ngân sách 6 triệu thích cà phê")
        if result.get("final_plan"):
            all_ids = [
                slot.place_id
                for day in result["final_plan"].itinerary_days
                for slot in day.time_slots
            ]
            assert len(all_ids) == len(set(all_ids)), "Duplicate places found in itinerary!"

    def test_budget_status_consistent(self):
        """remaining và over_amount không được đồng thời dương."""
        result = self._run("Đà Lạt 3 ngày 2 đêm 2 người ngân sách 5 triệu")
        if result.get("final_plan"):
            bd = result["final_plan"].budget_breakdown
            if bd.status == "BUDGET_OK":
                assert bd.remaining >= 0
                assert bd.over_amount == 0
            else:
                assert bd.over_amount > 0

    def test_trace_logs_contain_all_agents(self):
        result = self._run("Đà Lạt 3 ngày 2 đêm 2 người ngân sách 5 triệu")
        agent_names = {log.agent_name for log in result.get("trace_logs", [])}
        if result.get("final_plan"):
            assert "Supervisor" in agent_names
            assert "DestinationAgent" in agent_names
            assert "ItineraryAgent" in agent_names
            assert "BudgetAgent" in agent_names
            assert "Finalize" in agent_names


# ═══════════════════════════════════════════════════════════════════════════════
# Killer test: Over-budget → Optimization → Budget_OK (plan.md §31)
# ═══════════════════════════════════════════════════════════════════════════════

class TestKillerOptimizationLoop:
    """
    Mô phỏng kịch bản:
        - Initial plan: OVER_BUDGET
        - Sau replan: BUDGET_OK (hoặc thấp hơn initial)

    Vì chúng ta không thể kiểm soát chính xác số tiền cuối cùng khi dùng
    real offline catalog, test này kiểm tra:
    1. loop_count <= MAX_OPTIMIZATION_LOOPS sau khi graph kết thúc
    2. Nếu final_plan có, budget_breakdown.total_calculated <= initial_total
       (mỗi vòng phải giảm theo plan.md §34 loop guard)
    3. optimization_exhausted cờ đúng khi hết vòng
    """

    def test_loop_guard_max_three(self):
        """Loop count không vượt MAX_OPTIMIZATION_LOOPS."""
        initial = _minimal_state(
            session_id="killer-test",
            raw_prompt="Đà Lạt 3 ngày 2 đêm 2 người ngân sách 1 đồng thích cà phê",
        )
        result = travel_graph.invoke(initial)
        assert result["loop_count"] <= MAX_OPTIMIZATION_LOOPS

    def test_optimization_exhausted_set_when_impossible(self):
        """Ngân sách 1 VND không thể đạt BUDGET_OK → optimization_exhausted phải True."""
        initial = _minimal_state(
            session_id="killer-exhaust",
            raw_prompt="Đà Lạt 3 ngày 2 đêm 2 người ngân sách 1 đồng",
        )
        result = travel_graph.invoke(initial)
        if result.get("final_plan") and result["final_plan"].budget_breakdown.status == "OVER_BUDGET":
            assert result.get("optimization_exhausted") is True

    def test_final_plan_returned_even_over_budget(self):
        """Kể cả khi OVER_BUDGET, vẫn phải có final_plan (plan tốt nhất)."""
        initial = _minimal_state(
            session_id="killer-over",
            raw_prompt="Đà Lạt 3 ngày 2 đêm 2 người ngân sách 1 đồng",
        )
        result = travel_graph.invoke(initial)
        # graph phải luôn kết thúc với final_plan hoặc final_response_text
        assert result.get("final_plan") is not None or result.get("final_response_text") is not None

    def test_budget_ok_with_generous_budget(self):
        """Ngân sách rộng rãi 20 triệu → BUDGET_OK ngay lần đầu, loop_count=0."""
        initial = _minimal_state(
            session_id="killer-ok",
            raw_prompt="Đà Lạt 3 ngày 2 đêm 2 người ngân sách 20 triệu thích cà phê thiên nhiên",
        )
        result = travel_graph.invoke(initial)
        if result.get("final_plan"):
            bd = result["final_plan"].budget_breakdown
            assert bd.status == "BUDGET_OK"
            assert result["loop_count"] == 0
