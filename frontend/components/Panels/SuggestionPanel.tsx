'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { Suggestion } from '@/types'

function SuggestionCard({ suggestion, index }: { suggestion: Suggestion; index: number }) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-bg-tertiary border border-border">
      {/* Suggestion number header */}
      <div className="text-xs text-text-secondary mb-2">
        Suggestion #{index + 1}
      </div>

      {/* Suggested Response */}
      <div className="p-3 rounded-lg bg-suggestion-bg">
        <h3 className="text-sm font-semibold text-accent-blue mb-2 flex items-center gap-2">
          <span>💡</span>
          Suggested Response
        </h3>
        <p className="text-text-primary whitespace-pre-wrap">{suggestion.response}</p>
      </div>

      {/* Key Points */}
      {suggestion.keyPoints.length > 0 && (
        <div className="p-3 rounded-lg bg-bg-secondary">
          <h3 className="text-sm font-semibold text-accent-green mb-2 flex items-center gap-2">
            <span>📌</span>
            Key Points
          </h3>
          <ul className="space-y-1">
            {suggestion.keyPoints.map((point, pointIndex) => (
              <li
                key={pointIndex}
                className="flex items-start gap-2 text-text-primary text-sm"
              >
                <span className="text-accent-green">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up Tip */}
      {suggestion.followUp && (
        <div className="p-3 rounded-lg bg-bg-secondary">
          <h3 className="text-sm font-semibold text-accent-yellow mb-2 flex items-center gap-2">
            <span>💬</span>
            If They Ask More
          </h3>
          <p className="text-text-secondary text-sm">
            {suggestion.followUp}
          </p>
        </div>
      )}
    </div>
  )
}

export function SuggestionPanel() {
  const { suggestions } = useSessionStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new suggestions are added
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    })
  }, [suggestions])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">AI Suggestions</h2>
        {suggestions.length > 0 && (
          <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p className="text-4xl mb-4">💡</p>
            <p>No suggestions yet</p>
            <p className="text-sm mt-2">
              AI will provide suggestions when it detects questions from the
              interviewer
            </p>
          </div>
        ) : (
          <>
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
              />
            ))}
            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}
