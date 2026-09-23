package com.example.vnuguideapp.controller.Notification;

import com.example.vnuguideapp.dto.reponse.NotificationResponse;
import com.example.vnuguideapp.dto.reponse.PageResponse;
import com.example.vnuguideapp.dto.reponse.UnreadCountResponse;
import com.example.vnuguideapp.entity.AccountAndAuthorization.User;
import com.example.vnuguideapp.service.Notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Get paginated notifications for the current user
     */
    @GetMapping
    public ResponseEntity<PageResponse<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResponse<NotificationResponse> response = notificationService.getNotifications(user.getId(), page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Get unread notification count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(@AuthenticationPrincipal User user) {
        long count = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(UnreadCountResponse.builder().count(count).build());
    }

    /**
     * Mark a specific notification as read
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, Boolean>> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        notificationService.markAsRead(id, user.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Mark all notifications as read
     */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<Map<String, Object>> markAllAsRead(@AuthenticationPrincipal User user) {
        int count = notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "markedCount", count));
    }

    /**
     * Delete a notification
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> deleteNotification(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        notificationService.deleteNotification(id, user.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }
}
