import { Stack } from "expo-router";
import { Provider } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useAppSelector, useAppDispatch ,store} from "@/store";
import { bootstrapAuth } from "@/store/auth.slice"

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootNavigator/>
    </Provider>
  );
}


function RootNavigator() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);


  useEffect(() => {
    dispatch(bootstrapAuth());  
  }, []);

  useEffect(() => {
    if (status === "authenticated" || status === "unauthenticated") {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === "idle" || status === "loading") {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={status === "authenticated"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={status === "unauthenticated"}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  );
}