/**
 * useUpdateProfile Hook - Mutation for updating profile
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { Profile, UpdateProfileRequest } from '../types';
import { profileKeys } from './useProfile';

interface UseUpdateProfileOptions {
    onSuccess?: (data: Profile) => void;
    onError?: (error: Error) => void;
}

export function useUpdateProfile({ onSuccess, onError }: UseUpdateProfileOptions = {}) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: UpdateProfileRequest) => profileApi.updateProfile(data),
        onSuccess: (data) => {
            // Invalidate and refetch profile data
            queryClient.invalidateQueries({ queryKey: profileKeys.me() });
            onSuccess?.(data);
        },
        onError: (error: Error) => {
            onError?.(error);
        },
    });

    return {
        updateProfile: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        reset: mutation.reset,
    };
}

