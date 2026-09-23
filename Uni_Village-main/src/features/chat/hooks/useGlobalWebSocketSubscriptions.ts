import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { queryKeys } from "@/config/queryKeys";
import type {
    AckEvent,
    ChannelEventPayload,
    ChatMessageEvent,
    ConversationUpgradedEvent,
} from "@/lib/websocket";
import { websocketService } from "@/lib/websocket";
import type { MessageResponse } from "@/shared/types/backend.types";
import type { Slice } from "@/shared/types/pagination.types";
import { useChatStore } from "../store";

interface InfiniteMessagesData {
  pages: Slice<MessageResponse>[];
  pageParams: number[];
}

/**
 * Creates an empty page structure for messages
 * Used when receiving a message for a conversation not yet in cache
 */
function createEmptyPageStructure(): InfiniteMessagesData {
  return {
    pages: [
      {
        content: [],
        pageable: {
          pageNumber: 0,
          pageSize: 20,
          sort: { sorted: false, unsorted: true, empty: true },
          offset: 0,
          paged: true,
          unpaged: false,
        },
        size: 20,
        number: 0,
        sort: { sorted: false, unsorted: true, empty: true },
        numberOfElements: 0,
        first: true,
        last: false, // Set to false so UI knows there may be more messages
        empty: true,
      },
    ],
    pageParams: [0],
  };
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T;
}

export function useGlobalWebSocketSubscriptions() {
  const queryClient = useQueryClient();
  const { handleAck, addMessageRequest, setParticipantStatus } = useChatStore();

  // Track socket connection status from store to re-subscribe when connected
  const socketStatus = useChatStore((state) => state.socketStatus);
  const isConnected = socketStatus === "connected";

  const debouncedInvalidateConversations = useRef(
    debounce(() => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    }, 1000),
  ).current;

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (websocketService.isConnected()) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.all,
          refetchType: "none",
        });
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [queryClient]);

  // Memoized handler to add message to cache
  const handleIncomingMessage = useCallback(
    (event: ChatMessageEvent) => {
      console.log("[Global WS] Incoming message:", event);

      const queryKey = queryKeys.messages.list(event.conversationId, {});

      queryClient.setQueryData<InfiniteMessagesData>(queryKey, (oldData) => {
        const messageResponse: MessageResponse = {
          id: event.id,
          senderId: event.senderId,
          senderName: event.senderName,
          senderAvatarUrl: event.senderAvatarUrl,
          content: event.content,
          messageType: event.messageType,
          conversationId: event.conversationId,
          timestamp: event.timestamp,
          isActive: true,
          readBy: [],
          replyToId: event.replyToId,
        };

        // If no existing data, create empty structure and add message
        if (!oldData?.pages?.length) {
          console.log(
            "[Global WS] No cache data, creating new structure for:",
            event.conversationId,
          );
          const newData = createEmptyPageStructure();
          newData.pages[0].content = [messageResponse];
          newData.pages[0].numberOfElements = 1;
          newData.pages[0].empty = false;
          return newData;
        }

        // Check for duplicates
        const exists = oldData.pages[0]?.content.some(
          (msg) => msg.id === event.id,
        );
        if (exists) {
          console.log("[Global WS] Duplicate message ignored:", event.id);
          return oldData;
        }

        // Prepend message to first page
        const newPages = [...oldData.pages];
        newPages[0] = {
          ...newPages[0],
          content: [messageResponse, ...newPages[0].content],
          numberOfElements: newPages[0].numberOfElements + 1,
        };

        console.log("[Global WS] Message added to cache:", event.id);
        return { ...oldData, pages: newPages };
      });

      if (event.isRequest) {
        addMessageRequest(event);
        console.log("[Global WS] Added message request:", event.conversationId);
      }

      // Always invalidate conversations list to update last message preview
      debouncedInvalidateConversations();
    },
    [queryClient, addMessageRequest, debouncedInvalidateConversations],
  );

  // Memoized ACK handler
  const handleAckEvent = useCallback(
    (ack: AckEvent) => {
      console.log("[Global WS] ACK received:", ack);
      handleAck(ack);

      if (
        ack.conversationId &&
        (ack.status === "DELIVERED" || ack.status === "DUPLICATE")
      ) {
        debouncedInvalidateConversations();
      }
    },
    [handleAck, debouncedInvalidateConversations],
  );

  // Memoized conversation event handler
  const handleConversationEvent = useCallback(
    (event: ConversationUpgradedEvent) => {
      console.log("[Global WS] Conversation event:", event);

      if (event.conversationId) {
        setParticipantStatus(event.conversationId, event.newStatus);
        debouncedInvalidateConversations();
      }
    },
    [setParticipantStatus, debouncedInvalidateConversations],
  );

  // Memoized channel event handler for CHANNEL_CREATED and MEMBER_ADDED
  const handleChannelEvent = useCallback(
    (
      event: ChannelEventPayload,
      eventType: "CHANNEL_CREATED" | "MEMBER_ADDED",
    ) => {
      console.log(`[Global WS] Channel event (${eventType}):`, event);

      // Immediately invalidate conversations to show the new channel
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      // Also invalidate channels list if it exists
      queryClient.invalidateQueries({
        queryKey: ["channels"],
      });
    },
    [queryClient],
  );

  // Subscribe to user queues when connected
  // Key fix: Add isConnected as dependency to re-subscribe when connection is established
  useEffect(() => {
    if (!isConnected) {
      console.log("[Global WS] Not connected, skipping subscription");
      return;
    }

    console.log("[Global WS] Setting up global subscriptions...");

    websocketService.subscribeToAllUserQueues({
      onMessage: handleIncomingMessage,
      onAck: handleAckEvent,
      onConversationEvent: handleConversationEvent,
      onChannelEvent: handleChannelEvent,
    });

    console.log("[Global WS] Global subscriptions initialized");

    return () => {
      websocketService.unsubscribeFromUserQueues();
      console.log("[Global WS] Global subscriptions cleaned up");
    };
  }, [
    isConnected,
    handleIncomingMessage,
    handleAckEvent,
    handleConversationEvent,
    handleChannelEvent,
  ]);
}
