ViVu AI — Phase 5A Spring Boot Bridge

Architecture

Mobile -> Spring Boot POST /api/ai/plan -> Python POST /api/v1/plan/generate -> LangGraph -> Spring Boot -> Mobile

New files

src/main/java/com/example/vivuapp/config/PythonAiClientConfig.java

src/main/java/com/example/vivuapp/controller/AI/AIPlanController.java

src/main/java/com/example/vivuapp/service/AI/AIOrchestratorService.java

src/main/java/com/example/vivuapp/service/AI/PythonAiClient.java

src/main/java/com/example/vivuapp/dto/request/AI/PlanGenerateRequest.java

src/main/java/com/example/vivuapp/dto/request/AI/PythonPlanGenerateRequest.java

src/main/java/com/example/vivuapp/dto/reponse/AI/PythonPlanGenerateResponse.java

src/main/java/com/example/vivuapp/exception/exceptionImpl/AiServiceException.java

Public endpoint

POST /api/ai/plan

Authentication is required. userId is deliberately not accepted from the mobile payload; Spring gets the authenticated user from @AuthenticationPrincipal and forwards it as user_id.

Request:

{
  "sessionId": "demo-001",
  "rawPrompt": "Đà Lạt 3 ngày 2 đêm, 2 người, ngân sách 5 triệu, thích cà phê và thiên nhiên.",
  "userPreferences": {}
}

Spring forwards:

{
  "session_id": "demo-001",
  "user_id": "123",
  "raw_prompt": "...",
  "user_preferences": {}
}

Configuration

Local:

ai:
  python:
    plan-url: ${AI_PYTHON_PLAN_URL:http://localhost:8000/api/v1/plan/generate}
    internal-service-key: ${AI_PYTHON_INTERNAL_SERVICE_KEY:}
    connect-timeout-ms: ${AI_PYTHON_CONNECT_TIMEOUT_MS:3000}
    read-timeout-ms: ${AI_PYTHON_READ_TIMEOUT_MS:35000}

Production should set:

AI_PYTHON_PLAN_URL
AI_PYTHON_INTERNAL_SERVICE_KEY

The key is sent as X-Internal-Service-Key. The Python service should validate that header when the key is configured.

Response

Spring wraps the Python result in the project's existing ApiResponse<T> envelope. The detailed Phase 1-4 structures remain JSON trees so the Python contract remains the source of truth.

Error mapping

Python unreachable / timeout -> HTTP 502 AI_PYTHON_SERVICE_UNAVAILABLE

Python 4xx/5xx -> HTTP 502 AI_PYTHON_UPSTREAM_ERROR

empty/invalid Python response -> HTTP 502 AI_PYTHON_INVALID_RESPONSE

session id mismatch -> HTTP 502 AI_PYTHON_SESSION_MISMATCH

public request validation -> existing Spring validation handling

Legacy endpoint

Existing POST /ai/itineraries/suggest is retained temporarily and marked deprecated because older mobile code may still call it. New development should use /api/ai/plan.

Build verification

The uploaded project source was statically inspected. Maven is not installed in this execution environment, so a real Maven build could not be executed here.

On Windows, from backend/ run:

Remove-Item -Recurse -Force target -ErrorAction SilentlyContinue
mvn clean test

If the repository contains a Maven wrapper, use:

.\mvnw clean test

Never edit target/generated-sources/annotations manually; MapStruct regenerates those files.