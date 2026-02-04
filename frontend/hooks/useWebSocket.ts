'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import type { ClientMessage, ServerMessage, Suggestion, TranscriptEntry } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    setStatus,
    setLatency,
    addTranscriptEntry,
    updateTranscriptEntry,
    addSuggestion,
    setRateLimitStatus,
  } = useSessionStore()

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data)
        console.log('[WS] Received message:', message.type, message)

        switch (message.type) {
          case 'session.ready':
            setStatus('connected')
            break

          case 'transcript.delta': {
            console.log('[WS] Adding TRANSCRIPT entry:', message)
            const entry: TranscriptEntry = {
              id: message.id,
              timestamp: new Date(),
              speaker: message.speaker,
              text: message.text,
              isFinal: message.isFinal,
              isNewTurn: message.isNewTurn,
            }

            // Check if we need to update or add
            const store = useSessionStore.getState()
            const existing = store.transcript.find((t) => t.id === message.id)

            if (existing) {
              updateTranscriptEntry(message.id, message.text, message.isFinal)
            } else {
              addTranscriptEntry(entry)
            }
            break
          }

          case 'suggestion': {
            console.log('[WS] Adding SUGGESTION:', message)
            const suggestion: Suggestion = {
              id: message.id,
              timestamp: new Date(),
              response: message.response,
              keyPoints: message.keyPoints,
              followUp: message.followUp,
            }
            addSuggestion(suggestion)
            break
          }

          case 'connection.status':
            if (message.status === 'connected') {
              setStatus('connected')
            } else if (message.status === 'reconnecting') {
              setStatus('reconnecting')
            }
            if (message.latency !== undefined) {
              setLatency(message.latency)
            }
            break

          case 'pong': {
            const latency = Date.now() - message.timestamp
            setLatency(latency)
            break
          }

          case 'error':
            console.error('Server error:', message.code, message.message)
            if (!message.recoverable) {
              setStatus('error')
            }
            break

          // Rate limit status messages (dev mode)
          case 'rate_limit.status':
            // Initial status from backend
            setRateLimitStatus({
              devMode: message.dev_mode,
              rpm: message.rpm,
              bufferSeconds: message.buffer_seconds,
            })
            console.log('Rate limit mode enabled:', message)
            break

          case 'rate_limit.update':
            // Status updates during session
            setRateLimitStatus({
              status: message.status,
              queuePosition: message.queue_position || 0,
              estimatedWait: message.estimated_wait || 0,
            })
            break
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    },
    [setStatus, setLatency, addTranscriptEntry, updateTranscriptEntry, addSuggestion, setRateLimitStatus]
  )

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setStatus('connecting')

    // Get auth token and pass it as query parameter
    const token = useAuthStore.getState().token
    const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const pingMessage: ClientMessage = {
            type: 'ping',
            timestamp: Date.now(),
          }
          ws.send(JSON.stringify(pingMessage))
        }
      }, 5000)
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      console.log('WebSocket closed')
      setStatus('idle')
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setStatus('error')
    }
  }, [handleMessage, setStatus])

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('idle')
  }, [setStatus])

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connect,
    disconnect,
    sendMessage,
    sendAudio,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}
