# Phase 5B changes

## Spring Boot

- Added `AIPlanProgressEvent` for mobile realtime events.
- Added `PythonAIProgressRequest` for Python callbacks.
- Added `AIProgressSessionRegistry` keyed by server-generated request UUID.
- Added `AIProgressPublisher` using the authenticated user's STOMP queue.
- Added `POST /internal/ai/progress` protected by `X-Internal-Service-Key`.
- Added lifecycle progress events to `AIOrchestratorService`.
- Added `request_id` to the internal Spring -> Python request.
- `PythonAiClient` now sends the generated UUID as `X-Request-ID`.
- Whitelisted only the callback route at HTTP authorization level; the callback
  controller still requires the internal secret.
- Added registry unit tests.

## React Native

- Added `AIPlanProgressEvent` type.
- Added raw JSON subscription support to the existing STOMP client.
- Added `websocketService.subscribeToAIPlanProgress`.
- Added `useAIPlanProgress` hook.
- Added `generateAIPlan` service and session-id helper.
- Added adapter for Python structured plans to the existing itinerary result UI.
- Added bridge mode to the current AI wizard via a `rawPrompt` route parameter.
- Existing legacy AI/gemini behavior remains intact by default.

## Python

- Added best-effort `ProgressReporter` using the standard library only.
- Added context-local `session_id` + `request_id` propagation so concurrent
  FastAPI requests do not share mutable global request state.
- Wrapped LangGraph nodes with safe progress callbacks.
- Progress callback failures never fail the planning graph.
- Added exact `main.py` integration patch instructions.
