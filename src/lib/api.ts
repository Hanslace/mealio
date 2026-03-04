// lib/api.ts
import { ENV } from '@/config/env';
import { forceLogout, setAccessToken, store } from '@/store';
import axios from 'axios';
import { refreshAsync } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

const sessionDiscovery = {
  tokenEndpoint: `${ENV.API_BASE_URL}/auth/session/refresh`,
};

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
});

// Request interceptor
api.interceptors.request.use(async (config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Concurrent refresh queue ────────────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in-flight, queue this request until it resolves
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      const success = await refreshAccessToken();
      isRefreshing = false;

      if (success) {
        const token = store.getState().auth.accessToken;
        onRefreshed(token!);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } else {
        refreshSubscribers = [];
        store.dispatch(forceLogout());
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }

    return Promise.reject(error);
  }
);

const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const storedToken = await SecureStore.getItemAsync('refresh_token');
    if (!storedToken) return false;

    const tokenResponse = await refreshAsync(
      { clientId: "", refreshToken: storedToken },
      sessionDiscovery,
    );

    // Rotate refresh token in secure storage
    if (tokenResponse.refreshToken) {
      await SecureStore.setItemAsync('refresh_token', tokenResponse.refreshToken);
    }

    store.dispatch(setAccessToken(tokenResponse.accessToken));
    return true;
  } catch {
    return false;
  }
};

export default api;