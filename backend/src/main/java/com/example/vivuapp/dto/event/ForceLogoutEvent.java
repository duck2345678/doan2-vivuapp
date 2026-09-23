package com.example.vivuapp.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Event sent via WebSocket to force a user to logout.
 * Used when admin locks/bans a user account.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForceLogoutEvent {
  private String type; // "ACCOUNT_LOCKED", "SESSION_EXPIRED", etc.
  private String reason; // Human-readable reason in Vietnamese
  private Long userId; // The user ID being forced to logout
}
