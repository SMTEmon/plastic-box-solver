import { create } from 'zustand';
import { authApi } from '../lib/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: true,

  login: async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.access_token);
      set({ token: response.access_token });
      await get().restoreSession();
      return true;
    } catch (error) {
      throw error;
    }
  },

  register: async (email, password, display_name) => {
    try {
      await authApi.register(email, password, display_name);
      return await get().login(email, password);
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  restoreSession: async () => {
    set({ loading: true });
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, loading: false });
      return;
    }

    try {
      const profile = await authApi.profile();
      set({ user: profile, loading: false });
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  },
}));
