'use client'

import { useEffect, useState } from 'react'
import { useSuggestionReceiver } from '@/hooks/useSuggestionBroadcast'
import type { Suggestion } from '@/types'

// Current suggestion - teleprompter style, large and readable
function CurrentSuggestion({ suggestion }: { suggestion: Suggestion }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [suggestion.id])

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}
    >
      {/* Main response */}
      <p className="text-[17px] leading-[1.8] text-white font-light tracking-wide whitespace-pre-wrap">
        {suggestion.response}
      </p>

      {/* Key points */}
      {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex flex-wrap gap-2">
            {suggestion.keyPoints.map((point, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] text-white/70 border border-white/[0.08]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 mr-2" />
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {suggestion.followUp && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-sm text-white/40 italic">
            {suggestion.followUp}
          </p>
        </div>
      )}
    </div>
  )
}

// Minimal previous indicator
function PreviousIndicator({
  count,
  onClick,
  isExpanded
}: {
  count: number
  onClick: () => void
  isExpanded: boolean
}) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all duration-200"
    >
      <span className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] text-white/50 font-medium">
        {count}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {isExpanded ? 'Hide' : 'Previous'}
      </span>
    </button>
  )
}

// Collapsed previous item
function PreviousItem({
  suggestion,
  index,
  onExpand
}: {
  suggestion: Suggestion
  index: number
  onExpand: () => void
}) {
  const preview = suggestion.response.slice(0, 80) + (suggestion.response.length > 80 ? '...' : '')

  return (
    <button
      onClick={onExpand}
      className="w-full text-left py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/40 font-medium mt-0.5">
          {index}
        </span>
        <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors leading-relaxed">
          {preview}
        </span>
      </div>
    </button>
  )
}

// Expanded previous suggestion
function ExpandedPrevious({
  suggestion,
  onCollapse
}: {
  suggestion: Suggestion
  onCollapse: () => void
}) {
  return (
    <div className="animate-fadeIn p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
          Previous
        </span>
        <button
          onClick={onCollapse}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
        >
          Close
        </button>
      </div>
      <p className="text-sm leading-relaxed text-white/60 whitespace-pre-wrap">
        {suggestion.response}
      </p>
    </div>
  )
}

export default function OverlayPage() {
  const { suggestions, sessionEnded } = useSuggestionReceiver()
  const [showPrevious, setShowPrevious] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const currentSuggestion = suggestions.length > 0 ? suggestions[suggestions.length - 1] : null
  const previousSuggestions = suggestions.slice(0, -1).reverse()

  // Auto-collapse when new suggestion arrives
  useEffect(() => {
    setShowPrevious(false)
    setExpandedId(null)
  }, [suggestions.length])

  // Set window title
  useEffect(() => {
    document.title = sessionEnded ? 'Session Ended' : 'Suggestions'
  }, [sessionEnded])

  return (
    <div className="min-h-screen bg-black/90 backdrop-blur-xl">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/[0.04]">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sessionEnded ? 'bg-amber-500/80' : 'bg-emerald-500/80 animate-pulse'}`} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
            {sessionEnded ? 'Session Ended' : 'Live'}
          </span>
        </div>

        {/* Previous indicator & close */}
        <div className="flex items-center gap-3">
          <PreviousIndicator
            count={previousSuggestions.length}
            onClick={() => setShowPrevious(!showPrevious)}
            isExpanded={showPrevious}
          />
          <button
            onClick={() => window.close()}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/40 hover:text-white/80 transition-all text-xs"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-16 pb-8 px-5 min-h-screen flex flex-col">
        {suggestions.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm text-center">
              {sessionEnded ? 'No suggestions were generated' : 'Waiting for questions...'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Previous suggestions - collapsible */}
            {showPrevious && previousSuggestions.length > 0 && (
              <div className="mb-6 space-y-2 max-h-[35vh] overflow-y-auto custom-scrollbar">
                {previousSuggestions.map((suggestion, i) => (
                  expandedId === suggestion.id ? (
                    <ExpandedPrevious
                      key={suggestion.id}
                      suggestion={suggestion}
                      onCollapse={() => setExpandedId(null)}
                    />
                  ) : (
                    <PreviousItem
                      key={suggestion.id}
                      suggestion={suggestion}
                      index={previousSuggestions.length - i}
                      onExpand={() => setExpandedId(suggestion.id)}
                    />
                  )
                ))}
              </div>
            )}

            {/* Current suggestion - hero */}
            {currentSuggestion && (
              <div className="flex-1">
                <CurrentSuggestion suggestion={currentSuggestion} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom fade */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
    </div>
  )
}
