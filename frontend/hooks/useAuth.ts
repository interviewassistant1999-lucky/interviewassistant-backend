/**
 * Authentication hook for login, signup, and session management.
 */

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AuthResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    email: string
    name: string
    subscription_tier: 'free' | 'pro'
    created_at: string
  }
}

interface ApiError {
  detail: string
}

export function useAuth() {
  const { user, token, isLoading, error, setAuth, setLoading, setError, logout } =
    useAuthStore()

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        })

        if (!response.ok) {
          const errorData: ApiError = await response.json()
          throw new Error(errorData.detail || 'Signup failed')
        }

        const data: AuthResponse = await response.json()
        setAuth(data.user, data.access_token)
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signup failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setAuth, setLoading, setError]
  )

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const errorData: ApiError = await response.json()
          throw new Error(errorData.detail || 'Login failed')
        }

        const data: AuthResponse = await response.json()
        setAuth(data.user, data.access_token)
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setAuth, setLoading, setError]
  )

  const refreshToken = useCallback(async () => {
    if (!token) return null

    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        logout()
        return null
      }

      const data: AuthResponse = await response.json()
      setAuth(data.user, data.access_token)
      return data
    } catch {
      logout()
      return null
    }
  }, [token, setAuth, logout])

  const getGoogleOAuthUrl = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/google`)
      if (!response.ok) {
        throw new Error('Google OAuth not available')
      }
      const data = await response.json()
      return data.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get OAuth URL'
      setError(message)
      throw err
    }
  }, [setError])

  const handleGoogleCallback = useCallback(
    async (code: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/api/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const errorData: ApiError = await response.json()
          throw new Error(errorData.detail || 'OAuth failed')
        }

        const data: AuthResponse = await response.json()
        setAuth(data.user, data.access_token)
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setAuth, setLoading, setError]
  )

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        // Only logout if we actually had a token (avoid logout during hydration)
        // When token is null, it means hydration hasn't completed yet
        if (token) {
          logout()
        }
        throw new Error('Session expired')
      }

      return response
    },
    [token, logout]
  )

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!token && !!user,
    signup,
    login,
    logout,
    refreshToken,
    getGoogleOAuthUrl,
    handleGoogleCallback,
    fetchWithAuth,
  }
}
