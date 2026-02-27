// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';
import { AuthInitializer } from '@/components/AuthInitializer';
import { useState } from 'react';


SplashScreen.preventAutoHideAsync();

function RootLayoutContent({ authReady }: { authReady: boolean }) {
  const colorScheme = useColorScheme();
  

  if (!authReady) {
    return null; // NOTHING renders, router cannot resolve
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  return (
    <Provider store={store}>
      <AuthInitializer onReady={() => setAuthReady(true)} />
      <RootLayoutContent authReady={authReady} />
    </Provider>
  );
}