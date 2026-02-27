// lib/auth.ts
import * as SecureStore from 'expo-secure-store';
import { ENV } from '@/config/env';
import type { AppDispatch } from '@/store';
import { setAccessToken, clearAccessToken } from '@/store/auth.slice';
import { getDeviceId } from '@/lib/device';
import { recordLog } from '@/lib/logger';

export async function bootstrapAuth(
  dispatch: AppDispatch
): Promise<void> {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');

    if (!refreshToken) {
      recordLog({
        code: 'BOOTSTRAP_NO_TOKEN',
        category: 'AUTH',
        severity: 'INFO',
        note: 'No refresh token found',
      });
      return ; // No token = not authenticated (inferred from Redux state)
    }

    const deviceId = await getDeviceId();

    const response = await fetch(
      `${ENV.API_BASE_URL}/auth/bootstrap`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: refreshToken,
          device_id: deviceId,
        }),
      }
    );

    if (!response.ok) {
      await SecureStore.deleteItemAsync('refresh_token');
      dispatch(clearAccessToken());

      recordLog({
        code: 'AUTH_REFRESH_FAILED',
        category: 'AUTH',
        severity: 'WARN',
        note: 'Refresh token rejected during bootstrap',
        payload: {
          status: response.status,
        },
      });

      return;
    }

    const { access_token, refresh_token } = await response.json();

    // Store access token in Redux
    dispatch(setAccessToken(access_token));

    await SecureStore.setItemAsync('refresh_token', refresh_token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    recordLog({
      code: 'BOOTSTRAP_SUCCESS',
      category: 'AUTH',
      severity: 'INFO',
      note: 'Auth bootstrap successful',
    });
  } catch (error) {
    recordLog({
      code: 'BOOTSTRAP_ERROR',
      category: 'AUTH',
      severity: 'ERROR',
      note: `Bootstrap error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}



export async function signOut(dispatch: AppDispatch): Promise<void> {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) {
      fetch(`${ENV.API_BASE_URL}/auth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch((error) => {
        recordLog({
          code: 'REVOKE_ERROR',
          category: 'AUTH',
          severity: 'WARN',
          note: `Token revocation failed: ${error.message}`,
        });
      });
    }

    await SecureStore.deleteItemAsync('refresh_token');
    dispatch(clearAccessToken());

    recordLog({
      code: 'SIGN_OUT_SUCCESS',
      category: 'AUTH',
      severity: 'INFO',
      note: 'User signed out successfully',
    });
  } catch (error) {
    recordLog({
      code: 'SIGN_OUT_ERROR',
      category: 'AUTH',
      severity: 'ERROR',
      note: `Sign out error: ${error instanceof Error ? error.message : String(error)}`,
    });
    dispatch(clearAccessToken());
  }
}