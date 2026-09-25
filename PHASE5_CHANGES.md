Phase 5A — Spring Boot Bridge Changes

Added

config/PythonAiClientConfig.java

Dedicated RestTemplate only for Python AI.

3s connect timeout.

35s read timeout.

Wrapped as Spring RestClient for the modern synchronous client API.

controller/AI/AIPlanController.java

New authenticated public endpoint: POST /api/ai/plan.

service/AI/AIOrchestratorService.java

Application boundary between controller and Python client.

service/AI/PythonAiClient.java

Internal HTTP client.

Adds X-Request-ID and optional X-Internal-Service-Key.

Validates non-empty and matching session_id.

Converts upstream failures to domain exception.

dto/request/AI/PlanGenerateRequest.java

Public mobile-facing request.

Does not trust userId from the client.

dto/request/AI/PythonPlanGenerateRequest.java

Exact snake_case contract expected by FastAPI.

dto/reponse/AI/PythonPlanGenerateResponse.java

Typed top-level response.

Detailed Phase 1-4 objects remain JsonNode to prevent Java/Python schema duplication.

exception/exceptionImpl/AiServiceException.java

Dedicated upstream failure type.

PythonAiClientTest.java

Success deserialization + session correlation validation.

Modified

application.yml and application-prod.yml: Python AI URL/key/timeout properties.

GlobalExceptionHandler.java: Python AI errors map to HTTP 502.

AIItineraryController.java: existing endpoint marked deprecated, retained for backward compatibility.

Not changed intentionally

Existing Google Maps RestTemplate bean.

Existing legacy /ai/itineraries/suggest behavior.

Existing authentication/JWT behavior.

Existing chat/conversation functionality.

Existing MapStruct source files.

Important

Do not edit target/generated-sources/annotations. Delete target/ and let Maven/MapStruct regenerate it.