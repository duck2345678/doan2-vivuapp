/**
 * Reported Posts Store
 * Zustand store to persist reported post IDs locally
 * Posts in this store will be hidden from the current user
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = "reported_posts";

interface ReportedPostsState {
  reportedPostIds: Set<string>;
  addReportedPost: (postId: string) => void;
  isPostReported: (postId: string) => boolean;
  clearReportedPosts: () => void;
}

export const useReportedPostsStore = create<ReportedPostsState>()(
  persist(
    (set, get) => ({
      reportedPostIds: new Set(),

      addReportedPost: (postId: string) => {
        set((state) => ({
          reportedPostIds: new Set([...state.reportedPostIds, postId]),
        }));
      },

      isPostReported: (postId: string) => {
        return get().reportedPostIds.has(postId);
      },

      clearReportedPosts: () => {
        set({ reportedPostIds: new Set() });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Set
      partialize: (state) => ({
        reportedPostIds: Array.from(state.reportedPostIds),
      }),
      // Custom deserialization for Set
      merge: (persistedState, currentState) => ({
        ...currentState,
        reportedPostIds: new Set(
          (persistedState as { reportedPostIds: string[] })?.reportedPostIds ||
            []
        ),
      }),
    }
  )
);
