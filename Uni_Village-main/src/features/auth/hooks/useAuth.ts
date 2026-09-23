import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api';
import type {
    RegisterRequest,
    VerifyRequest,
    LoginRequest,
    ForgetPasswordRequest,
    ChangePasswordRequest,
} from '../types';
import { mapAuthResponse } from '../types';
import { mapProfileToUser } from '../utils';

export function useLogin() {
    const { setTokens, setUser } = useAuthStore();

    return useMutation({
        mutationFn: (data: LoginRequest) => authApi.login(data),
        onSuccess: (response) => {
            const { tokens, profile } = response;
            setTokens(tokens);
            const user = mapProfileToUser(profile);
            setUser(user);
            console.log('[Auth] User initialized:', { id: user.id, displayName: user.displayName });
        },
    });
}

export function useRegister() {
    return useMutation({
        mutationFn: (data: RegisterRequest) => authApi.register(data),
    });
}

export function useVerifyRegisterOtp() {
    const { setTokens } = useAuthStore();

    return useMutation({
        mutationFn: (data: VerifyRequest) => authApi.verifyRegisterOtp(data),
        onSuccess: (response) => {
            if (response.result) {
                const tokens = mapAuthResponse(response.result);
                setTokens(tokens);
            }
        },
    });
}

export function useForgotPassword() {
    return useMutation({
        mutationFn: (data: ForgetPasswordRequest) => authApi.forgotPassword(data),
    });
}

export function useVerifyForgotPasswordOtp() {
    const { setTokens } = useAuthStore();

    return useMutation({
        mutationFn: (data: VerifyRequest) => authApi.verifyForgotPasswordOtp(data),
        onSuccess: (response) => {
            if (response.result) {
                const tokens = mapAuthResponse(response.result);
                setTokens(tokens);
            }
        },
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
    });
}

export function useLogout() {
    const queryClient = useQueryClient();
    const { clear } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            await clear();
        },
        onSuccess: () => {
            queryClient.clear();
        },
    });
}
