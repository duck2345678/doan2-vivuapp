/**
 * useUploadImage Hook - Mutations for uploading avatar and cover images
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { Profile } from '../types';
import { profileKeys } from './useProfile';

interface UploadFile {
    uri: string;
    name: string;
    type: string;
}

interface UseUploadImageOptions {
    onSuccess?: (data: Profile) => void;
    onError?: (error: Error) => void;
}

/**
 * Hook to upload avatar image
 */
export function useUploadAvatar({ onSuccess, onError }: UseUploadImageOptions = {}) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (file: UploadFile) => profileApi.uploadAvatar(file),
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
        uploadAvatar: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}

/**
 * Hook to upload cover image
 */
export function useUploadCover({ onSuccess, onError }: UseUploadImageOptions = {}) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (file: UploadFile) => profileApi.uploadCover(file),
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
        uploadCover: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}
