/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseAuthenticationResponse } from '../models/ApiResponseAuthenticationResponse';
import type { ApiResponseVoid } from '../models/ApiResponseVoid';
import type { AuthenticationRequest } from '../models/AuthenticationRequest';
import type { AuthenticationResponse } from '../models/AuthenticationResponse';
import type { ForgetPasswordRequest } from '../models/ForgetPasswordRequest';
import type { RegisterRequest } from '../models/RegisterRequest';
import type { VerifyRequest } from '../models/VerifyRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Register (request OTP)
     * @param requestBody
     * @returns ApiResponseVoid OTP sent
     * @throws ApiError
     */
    public static postApiV1AuthRegister(
        requestBody: RegisterRequest,
    ): CancelablePromise<ApiResponseVoid> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/register',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Forgot password (request OTP)
     * @param requestBody
     * @returns ApiResponseVoid OTP sent
     * @throws ApiError
     */
    public static postApiV1AuthForgetPassword(
        requestBody: ForgetPasswordRequest,
    ): CancelablePromise<ApiResponseVoid> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/forget-password',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Verify OTP and register
     * @param requestBody
     * @returns ApiResponseAuthenticationResponse Auth tokens
     * @throws ApiError
     */
    public static postApiV1AuthVerifyOtpRegister(
        requestBody: VerifyRequest,
    ): CancelablePromise<ApiResponseAuthenticationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/verify-otp-register',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Verify OTP and reset password
     * @param requestBody
     * @returns ApiResponseAuthenticationResponse Auth tokens
     * @throws ApiError
     */
    public static postApiV1AuthVerifyOtpForgetPassword(
        requestBody: VerifyRequest,
    ): CancelablePromise<ApiResponseAuthenticationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/verify-otp-forget-password',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Authenticate with email/password
     * @param requestBody
     * @returns ApiResponseAuthenticationResponse Auth tokens
     * @throws ApiError
     */
    public static postApiV1AuthAuthenticate(
        requestBody: AuthenticationRequest,
    ): CancelablePromise<ApiResponseAuthenticationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/authenticate',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Refresh access token
     * @param authorization Bearer refresh token
     * @returns AuthenticationResponse Raw AuthenticationResponse
     * @throws ApiError
     */
    public static postApiV1AuthRefreshToken(
        authorization: string,
    ): CancelablePromise<AuthenticationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh-token',
            headers: {
                'Authorization': authorization,
            },
        });
    }
}
