package com.example.vivuapp.dto.request.AI;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public request contract for the Spring -> Python AI planning bridge.
 *
 * userId is intentionally NOT accepted from the mobile client. Spring derives
 * it from the authenticated principal before forwarding the request to Python.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlanGenerateRequest {

    @NotBlank(message = "sessionId must not be blank")
    @Size(max = 64, message = "sessionId must not exceed 64 characters")
    String sessionId;

    @NotBlank(message = "rawPrompt must not be blank")
    @Size(max = 6000, message = "rawPrompt must not exceed 6000 characters")
    String rawPrompt;

    @Size(max = 50, message = "userPreferences must contain at most 50 entries")
    Map<String, Object> userPreferences;

    public Map<String, Object> safeUserPreferences() {
        if (userPreferences == null || userPreferences.isEmpty()) {
            return Collections.emptyMap();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(userPreferences));
    }
}
