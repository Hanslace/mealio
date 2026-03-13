import { ENV } from "@/config/env";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

const REFRESH_ENDPOINT = `${ENV.API_BASE_URL}/auth/session/refresh`;

// ─── Keys ────────────────────────────────────────────────────────────────────
const REFRESH_TOKEN_KEY = "refresh_token";

// ─── Types ───────────────────────────────────────────────────────────────────
export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
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

    const res = await fetch(REFRESH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: storedRefresh }),
    });

    if (!res.ok) throw new Error('refresh_failed');

    const tokenResponse = await res.json();

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




// ─── Slice ───────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Can be dispatched by an Axios/fetch interceptor when a 401 comes back
     * and refresh also fails (force logout without network call).
     */
    resetAccessToken(state) {
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

  },
});

export const { resetAccessToken, setAccessToken } = authSlice.actions;
export default authSlice.reducer;