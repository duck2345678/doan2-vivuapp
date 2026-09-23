/**
 * Notification Store
 * Manages notification state using Zustand
 */

import { create } from "zustand";
import { notificationApi } from "../api";
import type { NotificationResponse } from "../types";

interface NotificationState {
  // State
  notifications: NotificationResponse[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  error: string | null;

  // Actions
  fetchNotifications: (refresh?: boolean) => Promise<void>;
  fetchMoreNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  addRealtimeNotification: (notification: NotificationResponse) => void;
  clearError: () => void;
  reset: () => void;
}

const PAGE_SIZE = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  currentPage: 0,
  error: null,

  // Fetch notifications (with refresh option)
  fetchNotifications: async (refresh = false) => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const page = refresh ? 0 : get().currentPage;
      const response = await notificationApi.getNotifications(page, PAGE_SIZE);

      set({
        notifications: refresh
          ? response.data
          : [...get().notifications, ...response.data],
        currentPage: page + 1,
        hasMore: response.data.length === PAGE_SIZE,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications",
        isLoading: false,
      });
    }
  },

  // Fetch more notifications (pagination)
  fetchMoreNotifications: async () => {
    const { isLoadingMore, hasMore, currentPage } = get();
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });

    try {
      const response = await notificationApi.getNotifications(
        currentPage,
        PAGE_SIZE,
      );

      set({
        notifications: [...get().notifications, ...response.data],
        currentPage: currentPage + 1,
        hasMore: response.data.length === PAGE_SIZE,
        isLoadingMore: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load more notifications",
        isLoadingMore: false,
      });
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      set({ unreadCount: response.count });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  },

  // Mark single notification as read
  markAsRead: async (id: number) => {
    try {
      await notificationApi.markAsRead(id);

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  },

  // Delete notification
  deleteNotification: async (id: number) => {
    try {
      await notificationApi.deleteNotification(id);

      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        const wasUnread = notification && !notification.isRead;

        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: wasUnread
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
        };
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  // Add real-time notification (from WebSocket)
  addRealtimeNotification: (notification: NotificationResponse) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset store
  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      currentPage: 0,
      error: null,
    }),
}));

export default useNotificationStore;
