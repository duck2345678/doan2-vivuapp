/**
 * API Client Configuration
 * Centralized HTTP client with interceptors for authentication and error handling
 */

import { env } from "@/config/env";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { AuthTokens } from "@/features/auth/types";
import { isAuthResponse, mapAuthResponse } from "@/features/auth/types";
import { ApiError } from "@/lib/errors/ApiError";
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { API_ENDPOINTS } from "./endpoints";

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

const axiosInstance: AxiosInstance = axios.create({
  baseURL: env.API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const logRequest = (config: AxiosRequestConfig) => {
  if (__DEV__) {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log("[API Request Data]", config.data);
    }
  }
};

const logResponse = (response: AxiosResponse) => {
  if (__DEV__) {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    console.log("[API Response Data]", response.data);
  }
};

const logError = (error: AxiosError) => {
  if (__DEV__) {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const status = error.response?.status;
    const responseData = error.response?.data as
      | Record<string, unknown>
      | undefined;
    const errorMessage = responseData?.message as string | undefined;

    // Skip logging for expected/handled business errors (not real errors)
    const isExpectedError =
      // Already a member - handled gracefully in UI
      (status === 403 &&
        errorMessage?.toLowerCase()?.includes("already a member")) ||
      // Pending approval - handled gracefully in UI
      (status === 403 && errorMessage?.toLowerCase()?.includes("pending"));

    if (isExpectedError) {
      // Log as info instead of error for expected business cases
      console.log(`[API Info] ${method} ${url} - ${status}: ${errorMessage}`);
      return;
    }

    console.error(
      `[API Error] ${method} ${url}${status ? ` - ${status}` : ""}`,
    );

    // Only log response data for non-auth errors to avoid logging sensitive data
    if (error.response?.data && !url?.includes("/auth/")) {
      console.error("[API Error Details]", error.response.data);
    } else if (!error.response) {
      console.error("[API Error Details]", error.message);
    }
  }
};

let refreshPromise: Promise<AuthTokens | null> | null = null;

const isRefreshRequest = (config: AxiosRequestConfig): boolean => {
  if (!config.url) return false;
  return config.url.includes(API_ENDPOINTS.AUTH.REFRESH);
};

const refreshAccessToken = async (): Promise<AuthTokens | null> => {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();

  if (!refreshToken) {
    await clear();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await axiosInstance.post(
          API_ENDPOINTS.AUTH.REFRESH,
          null,
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          },
        );

        if (!isAuthResponse(response.data)) {
          await clear();
          return null;
        }

        const tokens = mapAuthResponse(response.data);
        await setTokens(tokens);
        return tokens;
      } catch (error: any) {
        if (__DEV__) {
          console.log(
            "[Auth] Refresh token failed:",
            error?.response?.status,
            error?.response?.data,
          );
        }
        await clear();

        // Check if account is locked (403 with ACCOUNT_LOCKED or any 403 during refresh)
        const status = error?.response?.status;
        const errorData = error?.response?.data;
        const errorCode =
          typeof errorData === "string"
            ? JSON.parse(errorData)?.error
            : errorData?.error;

        if (status === 403 || errorCode === "ACCOUNT_LOCKED") {
          console.log("[Auth] Account locked - redirecting to login");
          // Import router dynamically to avoid circular dependency
          const { router } = await import("expo-router");
          router.replace("/login");
        }

        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

axiosInstance.interceptors.request.use(
  async (config) => {
    logRequest(config);

    if (isRefreshRequest(config)) {
      return config;
    }

    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      const headers = config.headers ?? {};
      if (!("Authorization" in headers)) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      config.headers = headers;
    }

    return config;
  },
  (error) => {
    logError(error);
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    logResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    logError(error);

    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest(originalRequest)
    ) {
      originalRequest._retry = true;

      const tokens = await refreshAccessToken();
      if (tokens?.accessToken) {
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${tokens.accessToken}`,
        };
        return axiosInstance(originalRequest);
      }
    }

    throw ApiError.fromAxiosError(error);
  },
);

/**
 * Type-safe API client
 */
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.get<T>(url, config).then((res) => res.data),

  post: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    axiosInstance.post<T>(url, data, config).then((res) => res.data),

  put: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    axiosInstance.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    axiosInstance.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.delete<T>(url, config).then((res) => res.data),

  postMultipart: <T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    axiosInstance
      .post<T>(url, formData, {
        ...config,
        headers: {
          ...config?.headers,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data),

  putMultipart: <T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    axiosInstance
      .put<T>(url, formData, {
        ...config,
        headers: {
          ...config?.headers,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data),

  patchMultipart: <T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    axiosInstance
      .patch<T>(url, formData, {
        ...config,
        headers: {
          ...config?.headers,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data),
};

export { axiosInstance };

