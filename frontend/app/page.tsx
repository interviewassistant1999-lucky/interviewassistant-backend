'use client'

import { useState, useCallback } from 'react'
import { BrowserCheck } from '@/components/BrowserCheck'
import { Disclaimer } from '@/components/Disclaimer'
import { ContextInput } from '@/components/ContextInput/ContextInput'
import { VerbositySelector } from '@/components/Settings/VerbositySelector'
import { ProviderSelector } from '@/components/Settings/ProviderSelector'
import { StatusBar } from '@/components/StatusBar/StatusBar'
import { SplitLayout } from '@/components/Panels/SplitLayout'
import { SessionControls } from '@/components/Controls/SessionControls'
import { useSessionStore } from '@/stores/sessionStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useSuggestionBroadcaster } from '@/hooks/useSuggestionBroadcast'

export default function Home() {
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false)
  const { status, context, verbosity, provider, reset } = useSessionStore()

  const { connect, disconnect, sendMessage, sendAudio } = useWebSocket()
  const { startCapture, stopCapture, error: audioError } = useAudioCapture(sendAudio)
  const { openOverlayWindow, closeOverlayWindow } = useSuggestionBroadcaster()

  const isInSession = status === 'connected' || status === 'connecting' || status === 'reconnecting'

  const handleStart = useCallback(async () => {
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
    })
  }, [connect, startCapture, disconnect, sendMessage, context, verbosity, provider])

  const handleEnd = useCallback(() => {
    // Send session.end message
    sendMessage({ type: 'session.end' })

    // Stop audio capture
    stopCapture()

    // Disconnect WebSocket
    disconnect()

    // Close any open overlay windows
    closeOverlayWindow()

    // Reset store
    reset()
  }, [sendMessage, stopCapture, disconnect, closeOverlayWindow, reset])

  return (
    <BrowserCheck>
      {!hasAcceptedDisclaimer ? (
        <Disclaimer onAccept={() => setHasAcceptedDisclaimer(true)} />
      ) : (
        <main className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h1 className="text-2xl font-bold">Interview Assistant</h1>
            {isInSession && (
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

          {!isInSession ? (
            // Setup View
            <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
              <div className="space-y-8">
                <ContextInput />
                <ProviderSelector />
                <VerbositySelector />

                {audioError && (
                  <div className="p-4 bg-accent-red/10 border border-accent-red rounded-lg text-accent-red">
                    {audioError}
                  </div>
                )}

                <button
                  onClick={handleStart}
                  className="w-full py-4 px-6 bg-accent-green hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">▶</span>
                  Start Interview Session
                </button>
              </div>
            </div>
          ) : (
            // Session View
            <div className="flex-1 flex flex-col">
              <StatusBar />
              <div className="flex-1">
                <SplitLayout />
              </div>
              <SessionControls onStart={handleStart} onEnd={handleEnd} />
            </div>
          )}
        </main>
      )}
    </BrowserCheck>
  )
}
