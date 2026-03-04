import { ENV } from "@/config/env";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { refreshAsync } from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

const sessionDiscovery = {
  tokenEndpoint: `${ENV.API_BASE_URL}/auth/session/refresh`,
};

// ─── Keys ────────────────────────────────────────────────────────────────────
const REFRESH_TOKEN_KEY = "refresh_token";

// ─── Types ───────────────────────────────────────────────────────────────────
export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  // refresh token is NEVER stored in Redux — it lives only in SecureStore
  status: AuthStatus;
}

const initialState: AuthState = {
  accessToken: null,
  status: "idle", // splash shows while status === "idle" | "loading"
};

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Called on app boot from the splash screen.
 * 1. Read refresh token from SecureStore.
 * 2. If found, hit backend to get a fresh access + refresh pair.
 * 3. If anything fails → unauthenticated.
 */
export const bootstrapAuth = createAsyncThunk<
  { accessToken: string }, // only access token goes into Redux
  void,
  { rejectValue: string }
>("auth/bootstrap", async (_, { rejectWithValue }) => {
  try {
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!storedRefresh) {
      return rejectWithValue("no_refresh_token");
    }

    const tokenResponse = await refreshAsync(
      { clientId: "", refreshToken: storedRefresh },
      sessionDiscovery,
    );

    // Rotate refresh token in SecureStore — access token stays in memory
    if (tokenResponse.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResponse.refreshToken);
    }

    return { accessToken: tokenResponse.accessToken };
  } catch (err) {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return rejectWithValue("bootstrap_error");
  }
});


export const logout = createAsyncThunk("auth/logout", async () => {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
});

// ─── Slice ───────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Can be dispatched by an Axios/fetch interceptor when a 401 comes back
     * and refresh also fails (force logout without network call).
     */
    forceLogout(state) {
      state.accessToken = null;
      state.status = "unauthenticated";
    },
    /**
     * Called by the token-refresh interceptor after a silent refresh succeeds.
     */
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.status = "authenticated";
    },
  },
  extraReducers: (builder) => {
    // ── Bootstrap ──────────────────────────────────
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = "loading";
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.status = "authenticated";
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.accessToken = null;
        state.status = "unauthenticated";
      });


    // ── Logout ─────────────────────────────────────
    builder.addCase(logout.fulfilled, (state) => {
      state.accessToken = null;
      state.status = "unauthenticated";
    });
  },
});

export const { forceLogout, setAccessToken } = authSlice.actions;
export default authSlice.reducer;