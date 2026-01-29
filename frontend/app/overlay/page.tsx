'use client'

import { useEffect, useRef } from 'react'
import { useSuggestionReceiver } from '@/hooks/useSuggestionBroadcast'
import type { Suggestion } from '@/types'

function SuggestionCard({ suggestion, isLatest }: { suggestion: Suggestion; isLatest: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${isLatest ? 'border-accent-blue bg-suggestion-bg/80' : 'border-border/50 bg-bg-tertiary/60'}`}>
      {/* Suggested Response */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-accent-blue mb-1 flex items-center gap-1">
          <span>💡</span>
          Suggested Response
        </h3>
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {suggestion.response}
        </p>
      </div>

      {/* Key Points */}
      {suggestion.keyPoints.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-accent-green mb-1 flex items-center gap-1">
            <span>📌</span>
            Key Points
          </h3>
          <ul className="space-y-1">
            {suggestion.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-1 text-xs text-text-primary">
                <span className="text-accent-green">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up */}
      {suggestion.followUp && (
        <div>
          <h3 className="text-xs font-semibold text-accent-yellow mb-1 flex items-center gap-1">
            <span>💬</span>
            If They Ask More
          </h3>
          <p className="text-xs text-text-secondary">{suggestion.followUp}</p>
        </div>
      )}
    </div>
  )
}

export default function OverlayPage() {
  const { suggestions } = useSuggestionReceiver()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest suggestion
  useEffect(() => {
    requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    })
  }, [suggestions])

  // Set window title
  useEffect(() => {
    document.title = 'AI Suggestions - Interview Assistant'
  }, [])

  const latestSuggestion = suggestions.length > 0 ? suggestions[suggestions.length - 1] : null

  return (
    <div className="min-h-screen bg-bg-primary/95 backdrop-blur-sm">
      {/* Header - Draggable area */}
      <div className="sticky top-0 z-10 bg-bg-secondary/90 backdrop-blur border-b border-border px-3 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span>💡</span>
            AI Suggestions
          </h1>
          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded">
                {suggestions.length}
              </span>
            )}
            <button
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
              title="Scroll to latest"
            >
              ↓ Latest
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="p-3 space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">💡</p>
            <p className="text-text-secondary text-sm">Waiting for suggestions...</p>
            <p className="text-text-secondary text-xs mt-1">
              Start your interview session in the main window
            </p>
          </div>
        ) : (
          <>
            {/* Show only latest suggestion prominently, older ones collapsed */}
            {suggestions.length > 1 && (
              <details className="group">
                <summary className="text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  {suggestions.length - 1} previous suggestion{suggestions.length > 2 ? 's' : ''}
                </summary>
                <div className="mt-2 space-y-2 opacity-70">
                  {suggestions.slice(0, -1).map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isLatest={false}
                    />
                  ))}
                </div>
              </details>
            )}

            {/* Latest suggestion */}
            {latestSuggestion && (
              <div className="animate-fade-in">
                <div className="text-xs text-accent-blue mb-2 font-medium">
                  ✨ Latest Suggestion
                </div>
                <SuggestionCard
                  suggestion={latestSuggestion}
                  isLatest={true}
                />
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-secondary/80 backdrop-blur border-t border-border px-3 py-1.5">
        <p className="text-xs text-text-secondary text-center">
          Resize and position this window as needed
        </p>
      </div>
    </div>
  )
}
