/**
 * Who is logged in.
 *
 * The token is a JWT from POST /api/auth/login. It is kept in localStorage so
 * a refresh does not log you out, and lib/api.js attaches it to every request.
 * It expires after 30 minutes server-side, so any 401 is treated as "session
 * over" rather than an error worth showing.
 */

import { create } from "zustand";
import { authApi } from "../lib/api.js";

const TOKEN_KEY = "token";

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  /** true until the first loadUser() settles, so routes do not flash to /login */
  loading: Boolean(localStorage.getItem(TOKEN_KEY)),

  /** Register does NOT log you in -- the backend returns the user, not a token. */
  register: (email, password, displayName) =>
    authApi.register(email, password, displayName || undefined),

  login: async (email, password) => {
    const { access_token } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    set({ token: access_token });
    const user = await authApi.profile();
    set({ user, loading: false });
    return user;
  },

  /** Called once on app start to turn a stored token back into a user. */
  loadUser: async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      set({ loading: false, user: null, token: null });
      return null;
    }
    try {
      const user = await authApi.profile();
      set({ user, loading: false });
      return user;
    } catch {
      // expired or invalid -- drop it silently, this is normal after 30 min
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, loading: false });
      return null;
    }
  },

  updateProfile: async (body) => {
    const user = await authApi.updateProfile(body);
    set({ user });
    return user;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, loading: false });
  },

  isAuthenticated: () => Boolean(get().token),
}));
