import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  useAuthRequest,
  makeRedirectUri,
} from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { useAppDispatch, setAccessToken } from "@/store";
import { ENV } from "@/config/env";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: `${ENV.USL_URL}/authorize`,
};

export default function AuthScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [exchanging, setExchanging] = useState(false);

  const schemeParam = Constants.expoConfig?.scheme;
  const scheme =
    typeof schemeParam === "string"
      ? schemeParam
      : Array.isArray(schemeParam)
      ? schemeParam[0]
      : undefined;

  const redirectUri = makeRedirectUri({ scheme });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: "",
      redirectUri: "",
      usePKCE: false,
      extraParams: {
        backend_url: ENV.API_BASE_URL,
        redirect_uri: redirectUri,
      },
    },
    discovery
  );

  // ─── React to the auth response ───────────────────────────────────
  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const { code } = response.params;
      handleCodeExchange(code);
    } else if (response.type === "error") {
      Alert.alert("Authentication failed", response.error?.message ?? "Please try again.");
    }
    // "cancel" / "dismiss" → do nothing, stay on auth page
  }, [response]);

  const handleCodeExchange = async (code: string) => {
    setExchanging(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/session/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error('exchange_failed');

      const tokenResponse = await res.json();

      if (tokenResponse.refreshToken) {
        await SecureStore.setItemAsync("refresh_token", tokenResponse.refreshToken);
      }
      dispatch(setAccessToken(tokenResponse.accessToken));
      router.replace("/(app)");
    } catch {
      setExchanging(false);
      Alert.alert("Sign-in failed", "Could not complete sign-in. Please try again.");
    }
  };

  const loading = exchanging || !request;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Mealio</Text>
        <Text style={styles.subtitle}>Feast your tummy.</Text>
      </View>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={() => promptAsync()}
          disabled={loading}
        >
          {exchanging ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: "#888",
    marginTop: 8,
  },
  bottom: {
    paddingTop: 16,
  },
  button: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
});
