package com.example.vivuapp.service.AI;

import com.example.vivuapp.dto.request.AI.PythonPlanGenerateRequest;
import com.example.vivuapp.dto.reponse.AI.PythonPlanGenerateResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PythonAiClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void shouldForwardRequestAndDeserializePythonResponse() throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api/v1/plan/generate", this::handleSuccess);
        server.start();

        String url = "http://localhost:" + server.getAddress().getPort() + "/api/v1/plan/generate";
        PythonAiClient client = new PythonAiClient(RestClient.create(), url, "test-secret");

        PythonPlanGenerateResponse response = client.generatePlan(
                new PythonPlanGenerateRequest(
                        "session-001",
                        "123",
                        "Đà Lạt 3 ngày 2 người 5 triệu",
                        Map.of("travel_style", "BALANCED")));

        assertTrue(Boolean.TRUE.equals(response.success()));
        assertEquals("session-001", response.sessionId());
        assertEquals("CREATE_PLAN", response.intent());
        assertEquals("Plan ready", response.finalResponseText());
    }

    @Test
    void shouldRejectSessionMismatch() throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api/v1/plan/generate", exchange -> {
            String body = """
                    {
                      "success": true,
                      "session_id": "different-session",
                      "intent": "CREATE_PLAN",
                      "trace_logs": [],
                      "warnings": [],
                      "errors": [],
                      "optimization_exhausted": false,
                      "final_response_text": "Plan ready"
                    }
                    """;
            write(exchange, 200, body);
        });
        server.start();

        String url = "http://localhost:" + server.getAddress().getPort() + "/api/v1/plan/generate";
        PythonAiClient client = new PythonAiClient(RestClient.create(), url, "test-secret");

        var exception = assertThrows(RuntimeException.class, () -> client.generatePlan(
                new PythonPlanGenerateRequest("session-001", "123", "demo", Map.of())));

        assertTrue(exception.getMessage().contains("different session_id"));
    }

    private void handleSuccess(HttpExchange exchange) throws IOException {
        String body = """
                {
                  "success": true,
                  "session_id": "session-001",
                  "intent": "CREATE_PLAN",
                  "parsed_request": null,
                  "candidate_pool": [],
                  "selected_hotel": null,
                  "itinerary_days": [],
                  "clarification_question": null,
                  "final_plan": null,
                  "final_response_text": "Plan ready",
                  "trace_logs": [],
                  "warnings": [],
                  "errors": [],
                  "optimization_exhausted": false
                }
                """;
        assertEquals("application/json", exchange.getRequestHeaders().getFirst("Content-Type"));
        assertEquals("test-secret", exchange.getRequestHeaders().getFirst("X-Internal-Service-Key"));
        assertEquals("session-001", exchange.getRequestHeaders().getFirst("X-Request-ID"));
        write(exchange, 200, body);
    }

    private static void write(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
