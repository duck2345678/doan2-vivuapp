/**
 * useDeleteConversation Hook
 * Handles conversation deletion with proper cache invalidation
 * and navigation. Uses optimistic update for immediate UI feedback.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { queryKeys } from "@/config/queryKeys";
import { handleApiError, showSuccessToast } from "@/shared/utils";

import { conversationsApi } from "../api";
import { useChatStore } from "../store";

interface UseDeleteConversationOptions {
  /** Whether to navigate to community tab after deletion. Default: true */
  navigateAfterDelete?: boolean;
}

// Type for optimistic update context
interface DeleteMutationContext {
  previousQueries: [readonly unknown[], unknown][];
}

/**
 * Hook for deleting a conversation
 * Implements optimistic update for immediate UI feedback and proper cache cleanup.
 *
 * @param options - Configuration options
 */
export function useDeleteConversation(options?: UseDeleteConversationOptions) {
  const { navigateAfterDelete = true } = options ?? {};
  const queryClient = useQueryClient();
  const router = useRouter();

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response =
        await conversationsApi.deleteConversation(conversationId);
      return response.result;
    },
    onMutate: async (conversationId): Promise<DeleteMutationContext> => {
      // Cancel in-flight requests to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.all,
      });

      // Snapshot previous data for rollback
      const previousQueries = queryClient.getQueriesData({
        queryKey: queryKeys.conversations.all,
      });

      // Optimistic update: Remove conversation from all cached lists immediately
      queryClient.setQueriesData(
        { queryKey: queryKeys.conversations.all },
        (oldData: unknown) => {
          if (!oldData) return oldData;

          // Handle paginated response (useInfiniteQuery)
          if (
            typeof oldData === "object" &&
            oldData !== null &&
            "pages" in oldData
          ) {
            const paginatedData = oldData as {
              pages: Array<{ content?: Array<{ id?: string }> }>;
            };
            return {
              ...paginatedData,
              pages: paginatedData.pages.map((page) => ({
                ...page,
                content:
                  page.content?.filter((conv) => conv.id !== conversationId) ||
                  [],
              })),
            };
          }

          // Handle simple response with data array (useConversations in community)
          if (
            typeof oldData === "object" &&
            oldData !== null &&
            "data" in oldData
          ) {
            const simpleData = oldData as { data: Array<{ id?: string }> };
            return {
              ...simpleData,
              data:
                simpleData.data?.filter((conv) => conv.id !== conversationId) ||
                [],
            };
          }

          // Handle array directly
          if (Array.isArray(oldData)) {
            return oldData.filter(
              (conv: { id?: string }) => conv.id !== conversationId,
            );
          }

          return oldData;
        },
      );

      return { previousQueries };
    },
    onSuccess: (_, conversationId) => {
      // Atomic cache cleanup with error boundary
      try {
        // 1. Remove messages cache for this conversation
        queryClient.removeQueries({
          queryKey: queryKeys.messages.list(conversationId, {}),
        });

        // 2. Remove thread metadata cache
        queryClient.removeQueries({
          queryKey: ["thread", conversationId],
        });

        // 3. Clear direct conversation caches (for user-X virtual threads)
        queryClient.removeQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              key[0] === "directConversation" ||
              (Array.isArray(key) && key.includes(conversationId))
            );
          },
        });

        // 4. Invalidate and refetch all conversation lists
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.all,
          refetchType: "all",
        });

        // 5. Clear Zustand store state for this conversation
        useChatStore.getState().clearConversationState(conversationId);
      } catch (cacheError) {
        console.error(
          "[useDeleteConversation] Cache cleanup failed:",
          cacheError,
        );
        // Force full cache invalidation as fallback
        queryClient.clear();
      }

      showSuccessToast("Đã xóa cuộc hội thoại");

      if (navigateAfterDelete) {
        router.replace("/(tabs)/community");
      }
    },
    onError: (error, _, context) => {
      console.error("[useDeleteConversation] Delete failed:", error);

      // Rollback optimistic update on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      handleApiError(error, "Xóa cuộc hội thoại");
    },
  });

  return {
    deleteConversation,
    isDeleting: deleteConversation.isPending,
  };
}
