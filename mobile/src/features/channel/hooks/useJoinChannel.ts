/**
 * useJoinChannel Hook
 * Mutation hook for joining a channel
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/queryKeys";
import type { ChannelInfo } from "@/shared/types";
import type { JoinConversationResponse } from "@/shared/types/backend.types";
import {
    handleApiError,
    showInfoToast,
    showSuccessToast,
} from "@/shared/utils";
import { channelInfoService } from "../services";
import { channelQueryKeys } from "./channelQueryKeys";

interface ChannelMutationContext {
  previous?: ChannelInfo | null;
  queryKey: readonly unknown[];
}

interface JoinChannelInput {
  conversationId: string;
  cacheKey: string;
}

interface LeaveChannelInput {
  conversationId: string;
  cacheKey: string;
}

const applyOptimisticUpdate = (
  previous: ChannelInfo | null | undefined,
  isJoined: boolean,
): ChannelInfo | null | undefined => {
  if (!previous) return previous;
  const nextCount = Math.max(0, previous.memberCount + (isJoined ? 1 : -1));
  return {
    ...previous,
    isJoined,
    memberCount: nextCount,
  };
};

/**
 * Hook to join a channel
 */
export function useJoinChannel() {
  const queryClient = useQueryClient();

  return useMutation<
    JoinConversationResponse | undefined,
    Error,
    JoinChannelInput,
    ChannelMutationContext
  >({
    mutationFn: ({ conversationId }) =>
      channelInfoService.joinChannel(conversationId),
    onMutate: async ({ cacheKey }) => {
      const queryKey = channelQueryKeys.info(cacheKey);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChannelInfo | null>(queryKey);
      queryClient.setQueryData(queryKey, applyOptimisticUpdate(previous, true));
      return { previous, queryKey };
    },
    onSuccess: (data, variables, context) => {
      const status = data?.status;
      const accepted = !status || status === "ACCEPTED";
      if (!accepted && context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
        showInfoToast("Join request sent.");
      } else {
        showSuccessToast("Joined channel.");
      }
      queryClient.invalidateQueries({
        queryKey: channelQueryKeys.info(variables.cacheKey),
      });
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      handleApiError(error, "Join channel");
      queryClient.invalidateQueries({
        queryKey: channelQueryKeys.info(variables.cacheKey),
      });
    },
  });
}

/**
 * Hook to leave a channel
 */
export function useLeaveChannel() {
  const queryClient = useQueryClient();

  return useMutation<
    string | undefined,
    Error,
    LeaveChannelInput,
    ChannelMutationContext
  >({
    mutationFn: ({ conversationId }) =>
      channelInfoService.leaveChannel(conversationId),
    onMutate: async ({ cacheKey }) => {
      const queryKey = channelQueryKeys.info(cacheKey);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChannelInfo | null>(queryKey);
      queryClient.setQueryData(
        queryKey,
        applyOptimisticUpdate(previous, false),
      );
      return { previous, queryKey };
    },
    onSuccess: (_, variables) => {
      showSuccessToast("Left channel.");
      queryClient.invalidateQueries({
        queryKey: channelQueryKeys.info(variables.cacheKey),
      });
      // Also invalidate conversations list to refresh the community tab
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      handleApiError(error, "Leave channel");
      queryClient.invalidateQueries({
        queryKey: channelQueryKeys.info(variables.cacheKey),
      });
    },
  });
}
