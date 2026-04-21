/**
 * Authentication Store
 * Manages authentication state using Zustand
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  tenant_id?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    role: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.login(username, password);
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.register(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  loadUser: () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');

    // Also check if the auth cookie exists - if localStorage has data
    // but cookie is missing, the session is invalid (cookie expired/cleared)
    const hasAuthCookie = document.cookie.split(';').some(c =>
      c.trim().startsWith('auth_token=')
    );

    if (token && userStr && hasAuthCookie) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          isAuthenticated: true,
        });
      } catch {
        // Invalid data, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    } else if (token || userStr) {
      // localStorage has stale data but cookie is missing - clear it
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
