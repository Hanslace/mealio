// components/AuthInitializer.tsx
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated } from '@/store/auth.slice';
import { bootstrapAuth } from '@/lib/auth';
import { ensureDeviceIdentity } from '@/lib/device';
import { recordLog } from '@/lib/logger';

export function AuthInitializer({ onReady }: { onReady: () => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth on mount
  useEffect(() => {
    const prepare = async () => {
      try {
        setIsLoading(true);
        
        // Ensure device identity
        await ensureDeviceIdentity();

        // Check auth state
        await bootstrapAuth(dispatch);
        
      } catch (error) {
        recordLog({code:'AUTH_INIT_ERROR', category: 'AUTH', severity:'ERROR', note: `Auth initialization failed: ${error instanceof Error ? error.message : String(error)}`});
      } finally {
        setIsLoading(false);
        onReady();
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, [dispatch]);

  // Protected route navigation
  useEffect(() => {
    if (isLoading) return; // Wait until auth check completes

    const inAuthGroup = segments[0]?.includes('usl') ?? false;

    if (!isAuthenticated && !inAuthGroup) {
        recordLog({
            code: 'AUTH_REDIRECT_LOGIN',
            category: 'AUTH',
            severity: 'INFO',
            note: 'Redirecting unauthenticated user to login',
        });
      router.replace('/usl');
    } else if (isAuthenticated && inAuthGroup) {
        recordLog({
            code: 'AUTH_REDIRECT_HOME',
            category: 'AUTH',
            severity: 'INFO',
            note: 'Redirecting authenticated user to home',
        });
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, router]);

  return null; // This component only handles side effects
}