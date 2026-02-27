import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { ENV } from '@/config/env';
import { recordLog } from '@/lib/logger';
import { useAppDispatch } from '@/store/hooks';
import { setAccessToken } from '@/store/auth.slice';
import { getDeviceId } from '@/lib/device';


export default function USLScreen() {
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    (async () => {
      try {
        const deviceId = await getDeviceId();
        const redirectUri = 'mealio://auth/return';

        const url =
          `${ENV.USL_URL}/start` +
          `?device_id=${deviceId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}`;

        const result = await WebBrowser.openAuthSessionAsync(
          url,
          redirectUri
        );

        if (result.type !== 'success' || !result.url) {
          recordLog({
            code: 'USL_OPEN_ABORTED',
            category: 'SYSTEM',
            severity: 'ERROR',
            note: `USL aborted: ${result.type}`,
          });
          return;
        }

        // ---- extract authorization code ----
        const parsed = Linking.parse(result.url);
        const code = parsed.queryParams?.code;

        if (!code || typeof code !== 'string') {
          throw new Error('Missing authorization code');
        }

        // ---- exchange code for tokens ----
        const tokenRes = await fetch(
          `${ENV.API_BASE_URL}/auth/exchange`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              client_id: ENV.CLIENT_ID,
              device_id: deviceId
            }),
          }
        );

        if (!tokenRes.ok) {
          throw new Error('Token exchange failed');
        }

        const {
          access_token,
          refresh_token,
        } = await tokenRes.json();

        // ---- store securely ----
        dispatch(
          setAccessToken(access_token)
        );
          
        await SecureStore.setItemAsync('refresh_token', refresh_token, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          });

      } catch (err) {
        recordLog({
          code: 'USL_AUTH_FAILED',
          category: 'SYSTEM',
          severity: 'ERROR',
          note: 'USL auth flow failed',
          payload: { error: String(err) },
        });
      }

    })();
  }, [dispatch]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
