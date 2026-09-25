"""LangGraph travel planning graph — hoàn chỉnh với 4 agent + optimization loop.

Luồng chuẩn (plan.md §35):
    START → SUPERVISOR
              ├── GENERAL_CHAT    → END
              ├── CLARIFICATION   → END
              └── CREATE_PLAN     → DESTINATION
                                     → ITINERARY
                                       → BUDGET
                                          ├── BUDGET_OK     → FINALIZE → END
                                          └── OVER_BUDGET
                                               ├── loop < max → OPTIMIZE → ITINERARY (replan)
                                               └── loop >= max → EXHAUSTED → FINALIZE → END
"""
from __future__ import annotations

from typing import Literal

from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    clarification_node,
    destination_node,
    exhausted_node,
    finalize_node,
    general_chat_node,
    itinerary_node,
    optimization_node,
    budget_node,
    supervisor_node,
)
from app.models.state import MAX_OPTIMIZATION_LOOPS, TravelPlanState


# ── Routing functions ──────────────────────────────────────────────────────────

SupervisorRoute = Literal["destination", "clarification", "general_chat"]


def route_supervisor_intent(state: TravelPlanState) -> SupervisorRoute:
    intent = state.get("intent")
    if intent == "CREATE_PLAN":
        return "destination"
    if intent == "CLARIFICATION_NEEDED":
        return "clarification"
    return "general_chat"


BudgetRoute = Literal["finalize", "optimize", "exhausted"]


def route_budget_result(state: TravelPlanState) -> BudgetRoute:
    breakdown = state.get("budget_breakdown")
    if breakdown is None or breakdown.status == "BUDGET_OK":
        return "finalize"
    # OVER_BUDGET — kiểm tra loop guard
    loop_count = state.get("loop_count", 0)
    if loop_count < MAX_OPTIMIZATION_LOOPS:
        return "optimize"
    return "exhausted"


# ── Graph builder ──────────────────────────────────────────────────────────────

def build_travel_graph():
    graph = StateGraph(TravelPlanState)

    # Nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("clarification", clarification_node)
    graph.add_node("general_chat", general_chat_node)
    graph.add_node("destination", destination_node)
    graph.add_node("itinerary", itinerary_node)
    graph.add_node("budget", budget_node)
    graph.add_node("optimize", optimization_node)
    graph.add_node("exhausted", exhausted_node)
    graph.add_node("finalize", finalize_node)

    # Entry
    graph.set_entry_point("supervisor")

    # Supervisor → branch
    graph.add_conditional_edges(
        "supervisor",
        route_supervisor_intent,
        {
            "destination": "destination",
            "clarification": "clarification",
            "general_chat": "general_chat",
        },
    )

    # Terminal branches
    graph.add_edge("clarification", END)
    graph.add_edge("general_chat", END)

    # Happy path
    graph.add_edge("destination", "itinerary")
    graph.add_edge("itinerary", "budget")

    # Budget → branch (BUDGET_OK / OVER_BUDGET with loop guard)
    graph.add_conditional_edges(
        "budget",
        route_budget_result,
        {
            "finalize": "finalize",
            "optimize": "optimize",
            "exhausted": "exhausted",
        },
    )

    # Optimization loop: optimize → itinerary (replan) → budget → ...
    graph.add_edge("optimize", "itinerary")

    # Exhausted → finalize (return best plan with warning)
    graph.add_edge("exhausted", "finalize")

    # Terminal
    graph.add_edge("finalize", END)

    return graph.compile()


travel_graph = build_travel_graph()
