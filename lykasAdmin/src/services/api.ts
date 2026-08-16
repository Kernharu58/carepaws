import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from "./tokenStore";
import type { ApiErrorPayload } from "@/types/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// §5.1/§11.6.2 — access tokens are short-lived (15m default); this
// interceptor transparently refreshes once on a 401 and retries the
// original request, so the rest of the app never has to think about
// token expiry. `refreshPromise` collapses concurrent 401s into a single
// refresh call rather than firing one refresh request per failed request.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = res.data.data;
    setAccessToken(accessToken);
    setRefreshToken(newRefreshToken);
    return accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/api/auth/login") || originalRequest?.url?.includes("/api/auth/refresh");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }

      // Refresh failed — the session is truly over; let the caller (or
      // AuthContext) redirect to /login rather than doing it here, so this
      // module doesn't reach into routing.
    }

    return Promise.reject(error);
  }
);

/** Pulls a human-readable message out of the shared error envelope (§8.1), falling back sensibly if the response isn't in that shape. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.message) return payload.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** Pulls per-field validation errors (§11.1's { field, message }[] shape) for mapping onto form fields. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const payload = error.response?.data as ApiErrorPayload | undefined;
  if (!payload?.errors) return {};
  return Object.fromEntries(payload.errors.map((e) => [e.field, e.message]));
}
