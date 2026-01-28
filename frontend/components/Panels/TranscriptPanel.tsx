'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

export function TranscriptPanel() {
  const { transcript } = useSessionStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Live Transcription</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcript.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p>Waiting for conversation...</p>
            <p className="text-sm mt-2">
              Speak to see the transcription appear here
            </p>
          </div>
        ) : (
          transcript.map((entry) => (
            <div
              key={entry.id}
              className={`p-3 rounded-lg ${
                entry.speaker === 'interviewer'
                  ? 'bg-bg-tertiary border-l-2 border-interviewer'
                  : 'bg-bg-tertiary border-l-2 border-user'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {entry.speaker === 'interviewer' ? '👤' : '🎤'}
                </span>
                <span
                  className={`text-sm font-medium ${
                    entry.speaker === 'interviewer'
                      ? 'text-interviewer'
                      : 'text-user'
                  }`}
                >
                  {entry.speaker === 'interviewer' ? 'Interviewer' : 'You'}
                </span>
              </div>
              <p className="text-text-primary">
                {entry.text}
                {!entry.isFinal && (
                  <span className="inline-block w-2 h-4 ml-1 bg-accent-blue animate-pulse" />
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
