/**
 * Zustand store for managing authentication state.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  subscription_tier: 'free' | 'pro'
  created_at: string
}

interface AuthState {
  // State
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  _hasHydrated: boolean  // Track if store has hydrated from localStorage

  // Actions
  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  isAuthenticated: () => boolean
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      // Actions
      setAuth: (user, token) =>
        set({
          user,
          token,
          error: null,
        }),

      setUser: (user) => set({ user }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      logout: () =>
        set({
          user: null,
          token: null,
          error: null,
        }),

      isAuthenticated: () => {
        const state = get()
        return !!state.token && !!state.user
      },

      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        // Called when hydration completes
        state?.setHasHydrated(true)
      },
    }
  )
)
