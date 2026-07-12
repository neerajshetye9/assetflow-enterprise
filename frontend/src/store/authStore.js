import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      membership: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, membership, accessToken, refreshToken) =>
        set({ user, membership, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, membership: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'assetflow-auth' }
  )
);
