/**
 * useCreateChannel hook
 * Mutation for creating a new channel using the real API
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';

import { channelsApi, type CreateChannelFormData } from '../api';
import type { CreateChannelInput, CreateChannelResponse } from '../types/channel.types';

/**
 * Create channel mutation hook
 * Handles channel creation and navigation
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation<CreateChannelResponse, Error, CreateChannelInput>({
    mutationFn: async (input) => {
      // Map CreateChannelInput to CreateChannelFormData
      const formData: CreateChannelFormData = {
        name: input.name,
        description: input.description,
        privacy: 'PUBLIC', // Default to public
        participantIds: input.memberIds,
      };

      const response = await channelsApi.createChannel(formData);
      const channel = response.result;

      if (!channel) {
        throw new Error('Failed to create channel');
      }

      return {
        channelId: channel.conversationId || '',
        channel: {
          id: channel.id || 0,
          name: channel.name || input.name,
          memberCount: channel.memberCount || input.memberIds.length + 1,
        },
      };
    },
    onSuccess: (data) => {
      // Invalidate channels list to refresh
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Use setTimeout to ensure modal is fully closed before navigation
      // This prevents the "unhandled action" error when navigating from a modal
      setTimeout(() => {
        // Navigate to the new channel thread using imperative API
        // This works better when navigating from modals/bottom sheets
        router.push(`/chat/${data.channelId}` as Href);
      }, 300);
    },
    onError: (error) => {
      console.error('Failed to create channel:', error.message);
    },
  });
}
