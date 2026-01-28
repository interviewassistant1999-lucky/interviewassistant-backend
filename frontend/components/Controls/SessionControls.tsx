'use client'

import { useSessionStore } from '@/stores/sessionStore'

interface SessionControlsProps {
  onStart: () => void
  onEnd: () => void
}

export function SessionControls({ onStart, onEnd }: SessionControlsProps) {
  const { status } = useSessionStore()

  const isIdle = status === 'idle'
  const isConnecting = status === 'connecting'
  const isActive = status === 'connected' || status === 'reconnecting'

  return (
    <div className="px-4 py-3 border-t border-border bg-bg-secondary">
      {isIdle && (
        <button
          onClick={onStart}
          className="w-full py-3 px-6 bg-accent-green hover:bg-green-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">▶</span>
          Start Session
        </button>
      )}

      {isConnecting && (
        <button
          disabled
          className="w-full py-3 px-6 bg-accent-yellow/50 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            className="animate-spin h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Connecting...
        </button>
      )}

      {isActive && (
        <button
          onClick={onEnd}
          className="w-full py-3 px-6 bg-accent-red hover:bg-red-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">⏹</span>
          End Session
        </button>
      )}
    </div>
  )
}
