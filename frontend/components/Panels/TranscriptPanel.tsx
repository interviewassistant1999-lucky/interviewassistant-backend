'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

export function TranscriptPanel() {
  const { transcript } = useSessionStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    })
  }, [transcript])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Live Transcription</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {transcript.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p>Waiting for conversation...</p>
            <p className="text-sm mt-2">
              Speak to see the transcription appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transcript.map((entry, index) => {
              // Check if this is a continuation from the same speaker
              // BUT if isNewTurn is true, always start a new block (even for same speaker)
              const prevEntry = index > 0 ? transcript[index - 1] : null
              const sameSpeaker = prevEntry?.speaker === entry.speaker && !entry.isNewTurn
              const isInterviewer = entry.speaker === 'interviewer'

              // If same speaker and not a new turn, just append the text
              if (sameSpeaker) {
                return (
                  <span key={entry.id} className="inline">
                    {' '}
                    <span className={isInterviewer ? 'text-text-primary' : 'text-accent-blue'}>
                      {entry.text}
                    </span>
                    {!entry.isFinal && (
                      <span className="inline-block w-1.5 h-3 ml-0.5 bg-accent-blue animate-pulse" />
                    )}
                  </span>
                )
              }

              // New speaker - show label and start new block
              return (
                <div key={entry.id} className="pt-2 first:pt-0">
                  <div className={`flex items-start gap-2 ${isInterviewer ? '' : ''}`}>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                        isInterviewer
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-accent-blue/20 text-accent-blue'
                      }`}
                    >
                      {isInterviewer ? 'Interviewer' : 'You'}
                    </span>
                    <span className={isInterviewer ? 'text-text-primary' : 'text-accent-blue'}>
                      {entry.text}
                      {!entry.isFinal && (
                        <span className="inline-block w-1.5 h-3 ml-0.5 bg-accent-blue animate-pulse" />
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
