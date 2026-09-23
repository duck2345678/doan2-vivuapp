import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/queryKeys";
import { inboxService } from "../services/inbox.service";
import type { ConversationsResponse } from "../types/message.types";

/**
 * Hook to fetch inbox conversations with search filtering
 * Uses centralized queryKeys to ensure proper cache invalidation
 */
export function useConversations(page = 1, limit = 20, search?: string) {
  return useQuery<ConversationsResponse>({
    queryKey: [
      ...queryKeys.conversations.all,
      "inbox",
      { page, limit, search },
    ],
    queryFn: () => inboxService.getConversations({ page, limit, search }),
  });
}
