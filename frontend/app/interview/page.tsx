'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrowserCheck } from '@/components/BrowserCheck'
import { Disclaimer } from '@/components/Disclaimer'
import { ContextInput } from '@/components/ContextInput/ContextInput'
import { VerbositySelector } from '@/components/Settings/VerbositySelector'
import { ProviderSelector } from '@/components/Settings/ProviderSelector'
import { PromptStyleSelector } from '@/components/Settings/PromptStyleSelector'
import { StatusBar } from '@/components/StatusBar/StatusBar'
import { SplitLayout } from '@/components/Panels/SplitLayout'
import { SessionControls } from '@/components/Controls/SessionControls'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useSuggestionBroadcaster } from '@/hooks/useSuggestionBroadcast'
import { useAuth } from '@/hooks/useAuth'

// Map provider names to API key provider names
const providerKeyMap: Record<string, string> = {
  adaptive: 'groq',
  groq: 'groq',
  openai: 'openai',
  gemini: 'gemini',
}

interface APIKeyInfo {
  provider: string
  masked_key: string
}

export default function Home() {
  const router = useRouter()
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([])
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [isCheckingKey, setIsCheckingKey] = useState(false)
  const { status, context, verbosity, provider, promptKey, transcript, suggestions, reset } = useSessionStore()
  const { isAuthenticated, _hasHydrated } = useAuthStore()
  const { fetchWithAuth } = useAuth()

  const { connect, disconnect, sendMessage, sendAudio } = useWebSocket()

  // Check if user has API key for current provider
  const hasApiKeyForProvider = useCallback((providerName: string) => {
    const keyProvider = providerKeyMap[providerName?.toLowerCase()] || providerName
    return apiKeys.some((k) => k.provider === keyProvider)
  }, [apiKeys])

  // Load API keys on mount (after hydration completes)
  useEffect(() => {
    const loadApiKeys = async () => {
      // Wait for Zustand to hydrate from localStorage before making authenticated requests
      if (!_hasHydrated) return
      if (!isAuthenticated) return

      try {
        const response = await fetchWithAuth('/api/settings/api-keys')
        if (response.ok) {
          const data = await response.json()
          setApiKeys(data)
        }
      } catch (err) {
        console.error('Failed to load API keys:', err)
      }
    }

    loadApiKeys()
  }, [isAuthenticated, _hasHydrated, fetchWithAuth])

  // Track current speaker to detect changes
  const currentSpeakerRef = useRef<'user' | 'interviewer'>('interviewer')

  // Track last speech timing sent to avoid duplicate messages
  const lastSpeechTimingRef = useRef<{ isSpeaking: boolean; silenceDurationMs: number }>({
    isSpeaking: true,
    silenceDurationMs: 0,
  })

  // Handle periodic speech timing updates (sent even during silence)
  const handleSpeechTiming = useCallback((timing: { isSpeaking: boolean; silenceDurationMs: number }) => {
    // Only send if timing has meaningfully changed (avoid flooding)
    const timingChanged =
      timing.isSpeaking !== lastSpeechTimingRef.current.isSpeaking ||
      Math.abs(timing.silenceDurationMs - lastSpeechTimingRef.current.silenceDurationMs) > 500

    if (timingChanged) {
      lastSpeechTimingRef.current = {
        isSpeaking: timing.isSpeaking,
        silenceDurationMs: timing.silenceDurationMs,
      }
      sendMessage({
        type: 'speech.timing',
        isSpeaking: timing.isSpeaking,
        silenceDurationMs: timing.silenceDurationMs,
      } as any)  // Type cast since this is a new message type
    }
  }, [sendMessage])

  // Handle audio chunk with speaker detection
  const handleAudioChunk = useCallback((chunk: {
    data: ArrayBuffer
    speaker: 'user' | 'interviewer'
    isSpeaking: boolean
    silenceDurationMs: number
  }) => {
    // Send audio data
    sendAudio(chunk.data)

    // Send speaker update if changed
    if (chunk.speaker !== currentSpeakerRef.current) {
      currentSpeakerRef.current = chunk.speaker
      sendMessage({
        type: 'speaker.update',
        speaker: chunk.speaker,
      })
    }
  }, [sendAudio, sendMessage])

  const { startCapture, stopCapture, error: audioError } = useAudioCapture(undefined, handleAudioChunk, handleSpeechTiming)
  const { openOverlayWindow, closeOverlayWindow } = useSuggestionBroadcaster()

  const isInSession = status === 'connected' || status === 'connecting' || status === 'reconnecting'
  const hasSessionContent = transcript.length > 0 || suggestions.length > 0

  const handleStart = useCallback(async () => {
    // Clear any previous errors
    setApiKeyError(null)

    // Check if user is authenticated
    if (!isAuthenticated) {
      setApiKeyError('Please log in to start an interview session.')
      return
    }

    // Check if user has API key for selected provider (skip for mock)
    if (provider && provider.toLowerCase() !== 'mock') {
      if (!hasApiKeyForProvider(provider)) {
        const keyProvider = providerKeyMap[provider?.toLowerCase()] || provider
        setApiKeyError(
          `No API key found for ${keyProvider}. Please add your API key in Settings to continue.`
        )
        return
      }
    }

    // Clear previous session if any
    if (sessionEnded) {
      reset()
      setSessionEnded(false)
    }

    // Connect WebSocket
    connect()

    // Start audio capture
    const captureSuccess = await startCapture()
    if (!captureSuccess) {
      disconnect()
      return
    }

    // Send session.start message
    sendMessage({
      type: 'session.start',
      context: {
        jobDescription: context.jobDescription,
        resume: context.resume,
        workExperience: context.workExperience,
      },
      verbosity,
      provider,
      promptKey,
    })
  }, [connect, startCapture, disconnect, sendMessage, context, verbosity, provider, promptKey, sessionEnded, reset, isAuthenticated, hasApiKeyForProvider])

  const handleEnd = useCallback(() => {
    // Send session.end message
    sendMessage({ type: 'session.end' })

    // Stop audio capture
    stopCapture()

    // Disconnect WebSocket
    disconnect()

    // Notify overlay windows (they will show "session ended" banner)
    closeOverlayWindow()

    // Mark session as ended but DON'T reset - preserve content for review
    setSessionEnded(true)
  }, [sendMessage, stopCapture, disconnect, closeOverlayWindow])

  const handleNewSession = useCallback(() => {
    // Now clear everything for a fresh start
    reset()
    setSessionEnded(false)
  }, [reset])

  const handleBackToDashboard = useCallback(() => {
    // Clear session and redirect to dashboard
    reset()
    setSessionEnded(false)
    router.push('/dashboard')
  }, [reset, router])

  return (
    <BrowserCheck>
      {!hasAcceptedDisclaimer ? (
        <Disclaimer onAccept={() => setHasAcceptedDisclaimer(true)} />
      ) : (
        <main className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h1 className="text-2xl font-bold">Interview Assistant</h1>
            {(isInSession || sessionEnded) && (
              <button
                onClick={openOverlayWindow}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                title="Open suggestions in a floating window"
              >
                <span>↗</span>
                Pop Out Suggestions
              </button>
            )}
          </header>

          {/* Session Ended Banner */}
          {sessionEnded && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between">
              <span className="text-amber-300 text-sm">Session ended — Review your transcript and suggestions below</span>
              <button
                onClick={handleNewSession}
                className="px-4 py-1.5 bg-accent-blue hover:bg-blue-600 rounded text-sm font-medium transition-colors"
              >
                New Session
              </button>
            </div>
          )}

          {!isInSession && !sessionEnded ? (
            // Setup View
            <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
              <div className="space-y-8">
                <ContextInput />
                <ProviderSelector />
                <PromptStyleSelector />
                <VerbositySelector />

                {audioError && (
                  <div className="p-4 bg-accent-red/10 border border-accent-red rounded-lg text-accent-red">
                    {audioError}
                  </div>
                )}

                {apiKeyError && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-300 mb-2">{apiKeyError}</p>
                    <Link
                      href="/dashboard/settings"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-sm font-medium transition-colors"
                    >
                      <span>→</span>
                      Go to Settings
                    </Link>
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 mb-2">Please log in to start an interview session.</p>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <span>→</span>
                      Log In
                    </Link>
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={!isAuthenticated}
                  className="w-full py-4 px-6 bg-accent-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">▶</span>
                  Start Interview Session
                </button>
              </div>
            </div>
          ) : (
            // Session View (active or ended for review)
            <div className="flex-1 flex flex-col">
              {!sessionEnded && <StatusBar />}
              <div className="flex-1">
                <SplitLayout />
              </div>
              {!sessionEnded ? (
                <SessionControls onStart={handleStart} onEnd={handleEnd} />
              ) : (
                // Session ended - show dashboard and new session buttons
                <div className="px-6 py-4 border-t border-border bg-bg-secondary">
                  <div className="max-w-3xl mx-auto flex items-center justify-center gap-4">
                    <button
                      onClick={handleBackToDashboard}
                      className="flex-1 max-w-xs py-3 px-6 bg-accent-blue hover:bg-blue-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>←</span>
                      Go to Dashboard
                    </button>
                    <button
                      onClick={handleNewSession}
                      className="flex-1 max-w-xs py-3 px-6 bg-accent-green hover:bg-green-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>+</span>
                      New Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </BrowserCheck>
  )
}
