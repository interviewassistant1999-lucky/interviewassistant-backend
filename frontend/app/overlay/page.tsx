'use client'

import { useEffect, useRef } from 'react'
import { useSuggestionReceiver } from '@/hooks/useSuggestionBroadcast'
import type { Suggestion } from '@/types'

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="space-y-3">
      {/* Suggested Response */}
      <div>
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {suggestion.response}
        </p>
      </div>

      {/* Key Points */}
      {suggestion.keyPoints.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <ul className="space-y-1">
            {suggestion.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-text-secondary">
                <span className="text-accent-green mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up - subtle */}
      {suggestion.followUp && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-text-secondary/80 italic">{suggestion.followUp}</p>
        </div>
      )}
    </div>
  )
}

export default function OverlayPage() {
  const { suggestions } = useSuggestionReceiver()
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
    document.title = 'Suggestions'
  }, [])

  const latestSuggestion = suggestions.length > 0 ? suggestions[suggestions.length - 1] : null

  return (
    <div className="min-h-screen bg-black/85 backdrop-blur-md text-white">
      {/* Close button - minimal, top right */}
      <button
        onClick={() => window.close()}
        className="fixed top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all text-xs z-50"
        title="Close"
      >
        ✕
      </button>

      {/* Content */}
      <div className="p-4 pt-10 min-h-screen">
        {suggestions.length === 0 ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <p className="text-white/40 text-sm">Waiting for suggestions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Previous suggestions - very subtle */}
            {suggestions.length > 1 && (
              <div className="space-y-3 opacity-40 text-xs">
                {suggestions.slice(0, -1).map((suggestion, index) => (
                  <div key={suggestion.id} className="pb-3 border-b border-white/5">
                    <p className="text-white/70 line-clamp-2">{suggestion.response}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Latest suggestion - prominent */}
            {latestSuggestion && (
              <div className="animate-fade-in">
                <SuggestionCard suggestion={latestSuggestion} />
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
