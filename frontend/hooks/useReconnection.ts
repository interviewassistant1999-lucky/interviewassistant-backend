'use client'

import { useCallback, useRef, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

const RECONNECT_CONFIG = {
  maxAttempts: 10,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  jitterFactor: 0.3, // ±30% randomization
}

function getReconnectDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    RECONNECT_CONFIG.baseDelay * Math.pow(2, attempt),
    RECONNECT_CONFIG.maxDelay
  )
  const jitter =
    exponentialDelay *
    RECONNECT_CONFIG.jitterFactor *
    (Math.random() - 0.5) *
    2
  return Math.round(exponentialDelay + jitter)
}

export function useReconnection(reconnectFn: () => Promise<boolean> | boolean) {
  const [attemptCount, setAttemptCount] = useState(0)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { setStatus } = useSessionStore()

  const cancelReconnection = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsReconnecting(false)
    setAttemptCount(0)
  }, [])

  const startReconnection = useCallback(async () => {
    if (isReconnecting) return

    setIsReconnecting(true)
    setStatus('reconnecting')

    const attemptReconnect = async (attempt: number): Promise<void> => {
      if (attempt >= RECONNECT_CONFIG.maxAttempts) {
        console.error('Max reconnection attempts reached')
        setIsReconnecting(false)
        setStatus('error')
        return
      }

      setAttemptCount(attempt + 1)

      try {
        const success = await reconnectFn()
        if (success) {
          setIsReconnecting(false)
          setAttemptCount(0)
          setStatus('connected')
          return
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error)
      }

      // Schedule next attempt
      const delay = getReconnectDelay(attempt)
      console.log(
        `Reconnection attempt ${attempt + 1} failed. Retrying in ${delay}ms...`
      )

      timeoutRef.current = setTimeout(() => {
        attemptReconnect(attempt + 1)
      }, delay)
    }

    attemptReconnect(0)
  }, [isReconnecting, reconnectFn, setStatus])

  return {
    startReconnection,
    cancelReconnection,
    isReconnecting,
    attemptCount,
    maxAttempts: RECONNECT_CONFIG.maxAttempts,
  }
}
