import type { Profile } from '@/features/profile/types';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
    AuthTokens,
    BackendAuthResponse,
    ChangePasswordRequest,
    ForgetPasswordRequest,
    LoginRequest,
    RegisterRequest,
    VerifyRequest,
} from '../types';
import { mapAuthResponse } from '../types';

export interface LoginResponse {
    tokens: AuthTokens;
    profile: Profile;
}

export const authApi = {
    register: (data: RegisterRequest): Promise<ApiResponse<void>> =>
        apiClient.post<ApiResponse<void>>(API_ENDPOINTS.AUTH.REGISTER, data),

    verifyRegisterOtp: (data: VerifyRequest): Promise<ApiResponse<BackendAuthResponse>> =>
        apiClient.post<ApiResponse<BackendAuthResponse>>(
            API_ENDPOINTS.AUTH.VERIFY_REGISTER_OTP,
            data
        ),

    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<ApiResponse<BackendAuthResponse>>(
            API_ENDPOINTS.AUTH.AUTHENTICATE,
            data
        );

        const tokens = mapAuthResponse(response.result);

        // Note: We need to set the token for the immediate next request
        // The interceptor will use the store, but we haven't stored tokens yet
        const profileResponse = await apiClient.get<ApiResponse<Profile>>(
            API_ENDPOINTS.PROFILE.ME,
            {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            }
        );

        return {
            tokens,
            profile: profileResponse.result
        };
    },

    forgotPassword: (data: ForgetPasswordRequest): Promise<ApiResponse<void>> =>
        apiClient.post<ApiResponse<void>>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data),

    verifyForgotPasswordOtp: (data: VerifyRequest): Promise<ApiResponse<BackendAuthResponse>> =>
        apiClient.post<ApiResponse<BackendAuthResponse>>(
            API_ENDPOINTS.AUTH.VERIFY_FORGOT_PASSWORD_OTP,
            data
        ),

    changePassword: (data: ChangePasswordRequest): Promise<ApiResponse<string>> =>
        apiClient.post<ApiResponse<string>>(API_ENDPOINTS.USERS.CHANGE_PASSWORD, data),
};
