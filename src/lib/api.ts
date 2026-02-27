// lib/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { store } from '@/store';
import { setAccessToken, clearAccessToken, selectAccessToken } from '@/store/auth.slice';
import { ENV } from '@/config/env';
import { getDeviceId } from '@/lib/device';

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
});

// Request interceptor
api.interceptors.request.use(async (config) => {

  const token = selectAccessToken(store.getState());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const success = await refreshAccessToken();
      
      if (success) {
        const token = selectAccessToken(store.getState());
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } else {
        // Refresh failed - logout
        store.dispatch(clearAccessToken());
        await SecureStore.deleteItemAsync('refresh_token');
        // Navigation handled by AuthInitializer
      }
    }
    
    return Promise.reject(error);
  }
);

const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    
    if (!refreshToken) {
      return false;
    }
    
    const response = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
      device_id: await getDeviceId(),
    });
    
    const { access_token } = response.data;
    
    store.dispatch(setAccessToken(access_token));
    
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

export default api;