/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseString } from '../models/ApiResponseString';
import type { ChangePasswordRequest } from '../models/ChangePasswordRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserService {
    /**
     * Change password
     * @param requestBody
     * @returns ApiResponseString Password changed
     * @throws ApiError
     */
    public static postApiV1UsersChangepassword(
        requestBody: ChangePasswordRequest,
    ): CancelablePromise<ApiResponseString> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/users/changepassword',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
