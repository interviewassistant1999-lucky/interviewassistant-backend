'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { Suggestion } from '@/types'

const CHANNEL_NAME = 'interview-assistant-suggestions'

interface BroadcastMessage {
  type: 'suggestion-update' | 'suggestions-sync' | 'request-sync' | 'session-ended'
  suggestions?: Suggestion[]
}

/**
 * Hook for broadcasting suggestions to overlay windows.
 * Used by the main app to send updates.
 */
export function useSuggestionBroadcaster() {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const { suggestions } = useSessionStore()

  useEffect(() => {
    // Create broadcast channel
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)

    // Listen for sync requests from overlay windows
    channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      if (event.data.type === 'request-sync') {
        // Send current suggestions to the requesting window
        channelRef.current?.postMessage({
          type: 'suggestions-sync',
          suggestions: useSessionStore.getState().suggestions,
        })
      }
    }

    return () => {
      channelRef.current?.close()
    }
  }, [])

  // Broadcast whenever suggestions change
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'suggestion-update',
        suggestions,
      })
    }
  }, [suggestions])

  const openOverlayWindow = useCallback(() => {
    const width = 450
    const height = 600
    const left = window.screen.width - width - 50
    const top = 50

    const overlayWindow = window.open(
      '/overlay',
      'suggestion-overlay',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    // Focus the overlay window
    overlayWindow?.focus()

    return overlayWindow
  }, [])

  const closeOverlayWindow = useCallback(() => {
    // Broadcast session ended message to close overlay windows
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'session-ended' })
    }
  }, [])

  return { openOverlayWindow, closeOverlayWindow }
}

/**
 * Hook for receiving suggestions in overlay windows.
 * Used by the overlay page to receive updates.
 */
export function useSuggestionReceiver() {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  useEffect(() => {
    // Create broadcast channel
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)

    // Listen for updates from main window
    channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      if (event.data.type === 'suggestion-update' || event.data.type === 'suggestions-sync') {
        if (event.data.suggestions) {
          setSuggestions(event.data.suggestions)
        }
      } else if (event.data.type === 'session-ended') {
        // Close the overlay window when session ends
        window.close()
      }
    }

    // Request initial sync
    channelRef.current.postMessage({ type: 'request-sync' })

    return () => {
      channelRef.current?.close()
    }
  }, [])

  return { suggestions }
}
