/**
 * Notification API service
 * Handles all notification-related API calls
 */

import { apiClient } from "@/lib/api/client";
import type {
    NotificationPageResponse,
    UnreadCountResponse
} from "../types";

const BASE_URL = "/notifications";

export const notificationApi = {
  /**
   * Get paginated notifications for the current user
   */
  getNotifications: (page = 0, size = 20): Promise<NotificationPageResponse> =>
    apiClient.get<NotificationPageResponse>(
      `${BASE_URL}?page=${page}&size=${size}`,
    ),

  /**
   * Get unread notification count
   */
  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiClient.get<UnreadCountResponse>(`${BASE_URL}/unread-count`),

  /**
   * Mark a specific notification as read
   */
  markAsRead: (id: number): Promise<{ success: boolean }> =>
    apiClient.patch<{ success: boolean }>(`${BASE_URL}/${id}/read`),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: (): Promise<{ success: boolean; markedCount: number }> =>
    apiClient.patch<{ success: boolean; markedCount: number }>(
      `${BASE_URL}/mark-all-read`,
    ),

  /**
   * Delete a notification
   */
  deleteNotification: (id: number): Promise<{ success: boolean }> =>
    apiClient.delete<{ success: boolean }>(`${BASE_URL}/${id}`),
};

export default notificationApi;
