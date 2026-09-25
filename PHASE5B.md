# ViVu Phase 5B — Realtime AI Plan Progress

## Architecture

```text
React Native
    │
    ├── POST /api/ai/plan ───────────────► Spring Boot
    │                                      │
    │                                      ├── register requestId -> user principal
    │                                      └── HTTP -> Python FastAPI
    │                                                  │
    │                                                  └── LangGraph
    │                                                       ├── Supervisor
    │                                                       ├── Destination
    │                                                       ├── Itinerary
    │                                                       ├── Budget
    │                                                       └── Optimization loop
    │                                                          │
    │◄──── STOMP /user/queue/ai-plan-progress ────────────────┘
    │
    └──── final JSON result via REST /api/ai/plan
```

The existing `/ws` STOMP + SockJS infrastructure and JWT authentication are
reused. No second WebSocket stack is introduced.

## Event contract

Python posts only user-safe progress to Spring:

```json
{
  "type": "AGENT_PROGRESS",
  "session_id": "ai-plan-...",
  "request_id": "generated-server-uuid",
  "agent": "ITINERARY",
  "status": "RUNNING",
  "message": "Đang xây dựng lịch trình và kiểm tra thời gian di chuyển...",
  "loop_count": 1
}
```

Spring broadcasts a camelCase event to the authenticated user's private queue:

```text
/user/queue/ai-plan-progress
```

Lifecycle events emitted by Spring are `PLAN_STARTED`, `PLAN_COMPLETED`,
`PLAN_FAILED`, and `PLAN_CLARIFICATION_REQUIRED`.

No chain-of-thought, hidden prompts, tool arguments, stack traces, or model
internal reasoning is sent to the mobile client.

## Security

Python -> Spring progress callback is protected by the same internal secret:

```text
AI_PYTHON_INTERNAL_SERVICE_KEY=dev-vivu-internal-key
```

The callback route is whitelisted at Spring HTTP security level only because
Python does not have a user JWT; the controller itself fails closed unless the
internal key is non-empty and matches in constant time.

The request is routed by a server-generated UUID and an in-flight registry,
so the mobile client cannot choose another user's WebSocket principal.

## Frontend compatibility strategy

The current mobile app already uses STOMP for chat, so Phase 5B extends the
existing websocket service with:

- `AIPlanProgressEvent`
- `subscribeToAIPlanProgress(...)`
- `useAIPlanProgress(sessionId, enabled)`
- `generateAIPlan(...)`
- adapter from Python's structured plan to the existing itinerary display model

The existing wizard's legacy `/ai/itineraries/suggest` + Gemini/mock flow is kept
as the default behavior. The wizard has a bridge mode when opened with a
`rawPrompt` route parameter, allowing the new Spring -> Python flow to be tested
without deleting the old UI contract.

## Python configuration

```text
AI_PROGRESS_CALLBACK_URL=http://localhost:8080/internal/ai/progress
AI_PROGRESS_CALLBACK_TIMEOUT_SECONDS=1.0
AI_PYTHON_INTERNAL_SERVICE_KEY=dev-vivu-internal-key
```

Only the `main.py` patch in `python_phase5b_patch/PYTHON_MAIN_PY_PATCH.md` is
required because the current FastAPI `main.py` was not part of the packaged
Phase 1-4 reference bundle.

## Validation performed

- Python syntax check for the new progress module and graph: PASS
- Python regression suite: 22/22 PASS
- Python smoke test: PASS
- Python optimization smoke test: PASS
- Progress callback local HTTP smoke test: PASS
- Spring Maven build: not executed in this Linux packaging environment because
  neither `mvn` nor a Unix `mvnw` wrapper is available. The earlier Windows
  Phase 5A build was already successful before these 5B changes.
- Mobile TypeScript build: not executed because `npm ci` timed out in this
  environment and `node_modules` was not left installed.
