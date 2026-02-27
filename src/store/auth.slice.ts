// store/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  accessToken: string | null;
}

const initialState: AuthState = {
  accessToken: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken: (
      state,
      action: PayloadAction<string>
    ) => {
      state.accessToken = action.payload;
    },

    clearAccessToken: (state) => {
      state.accessToken = null;
    },
  },
});

// Actions
export const { setAccessToken, clearAccessToken } = authSlice.actions;

// Selectors
export const selectAccessToken = (state: { auth: AuthState }) =>
  state.auth.accessToken;

// Derived/computed selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.accessToken !== null ;


// Reducer
export default authSlice.reducer;