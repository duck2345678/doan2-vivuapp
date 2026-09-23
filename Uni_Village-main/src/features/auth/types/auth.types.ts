/**
 * Auth Types
 */

import type { BaseEntity } from '@/shared/types';
import type {
    AuthenticationRequest as BackendAuthRequest,
    AuthenticationResponse as BackendAuthResponse,
    RegisterRequest as BackendRegisterRequest,
    ForgetPasswordRequest as BackendForgetPasswordRequest,
    VerifyRequest as BackendVerifyRequest,
    ChangePasswordRequest as BackendChangePasswordRequest,
} from '@/shared/types/backend.types';

export type { BackendAuthRequest, BackendAuthResponse, BackendRegisterRequest, BackendForgetPasswordRequest, BackendVerifyRequest, BackendChangePasswordRequest };

export interface User extends BaseEntity {
    id: number;
    userId: number;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export type LoginRequest = BackendAuthRequest;
export type RegisterRequest = BackendRegisterRequest;
export type VerifyRequest = BackendVerifyRequest;
export type ForgetPasswordRequest = BackendForgetPasswordRequest;
export type ChangePasswordRequest = BackendChangePasswordRequest;

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * Type guard to check if response is a valid AuthenticationResponse
 */
export function isAuthResponse(data: unknown): data is BackendAuthResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.access_token === 'string' &&
        typeof obj.refresh_token === 'string'
    );
}

/**
 * Map API AuthenticationResponse to internal AuthTokens
 */
export function mapAuthResponse(response: BackendAuthResponse): AuthTokens {
    return {
        accessToken: response.access_token || '',
        refreshToken: response.refresh_token || '',
    };
}
