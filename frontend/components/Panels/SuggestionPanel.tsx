'use client'

import { useEffect, useRef, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import type { Suggestion } from '@/types'

// Elegant card for the current (latest) suggestion - hero treatment
function CurrentSuggestion({ suggestion }: { suggestion: Suggestion }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [suggestion.id])

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Main response - large, readable text */}
      <div className="space-y-4">
        <p className="text-[15px] leading-[1.7] text-white font-light tracking-wide whitespace-pre-wrap">
          {suggestion.response}
        </p>

        {/* Key points - if available */}
        {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex flex-wrap gap-2">
              {suggestion.keyPoints.map((point, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] text-white/70 border border-white/[0.08]"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400/60 mr-2" />
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up hint */}
        {suggestion.followUp && (
          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/40 italic">
              {suggestion.followUp}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Collapsed previous suggestion - minimal pill
function PreviousSuggestionPill({
  suggestion,
  index,
  onExpand
}: {
  suggestion: Suggestion
  index: number
  onExpand: () => void
}) {
  // Truncate response for preview
  const preview = suggestion.response.slice(0, 60) + (suggestion.response.length > 60 ? '...' : '')

  return (
    <button
      onClick={onExpand}
      className="w-full text-left group"
    >
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/40 font-medium">
          {index}
        </span>
        <span className="text-xs text-white/40 truncate group-hover:text-white/60 transition-colors">
          {preview}
        </span>
      </div>
    </button>
  )
}

// Expanded view for a previous suggestion
function ExpandedPreviousSuggestion({
  suggestion,
  onCollapse
}: {
  suggestion: Suggestion
  onCollapse: () => void
}) {
  return (
    <div className="animate-fadeIn">
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
            Previous Response
          </span>
          <button
            onClick={onCollapse}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Collapse
          </button>
        </div>
        <p className="text-sm leading-relaxed text-white/60 whitespace-pre-wrap">
          {suggestion.response}
        </p>
      </div>
    </div>
  )
}

export function SuggestionPanel() {
  const { suggestions } = useSessionStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPrevious, setShowPrevious] = useState(false)

  const currentSuggestion = suggestions.length > 0 ? suggestions[suggestions.length - 1] : null
  const previousSuggestions = suggestions.slice(0, -1).reverse() // Most recent first

  // Auto-collapse previous section when new suggestion arrives
  useEffect(() => {
    setExpandedId(null)
    setShowPrevious(false)
  }, [suggestions.length])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f]">
      {/* Minimal header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium">
              AI Response
            </span>
          </div>
          {suggestions.length > 1 && (
            <button
              onClick={() => setShowPrevious(!showPrevious)}
              className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 transition-colors"
            >
              <span className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center text-[9px]">
                {previousSuggestions.length}
              </span>
              <span className="uppercase tracking-wider">
                {showPrevious ? 'Hide' : 'Previous'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main content area - no scroll needed for current */}
      <div className="flex-1 flex flex-col min-h-0">
        {suggestions.length === 0 ? (
          /* Empty state - elegant waiting */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm text-center">
              Listening for questions...
            </p>
            <p className="text-white/15 text-xs text-center mt-1">
              AI suggestions will appear here
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Previous suggestions - collapsible section */}
            {showPrevious && previousSuggestions.length > 0 && (
              <div className="flex-shrink-0 px-5 py-3 border-b border-white/[0.04] max-h-[30%] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {previousSuggestions.map((suggestion, i) => (
                    expandedId === suggestion.id ? (
                      <ExpandedPreviousSuggestion
                        key={suggestion.id}
                        suggestion={suggestion}
                        onCollapse={() => setExpandedId(null)}
                      />
                    ) : (
                      <PreviousSuggestionPill
                        key={suggestion.id}
                        suggestion={suggestion}
                        index={previousSuggestions.length - i}
                        onExpand={() => setExpandedId(suggestion.id)}
                      />
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Current suggestion - hero area */}
            {currentSuggestion && (
              <div className="flex-1 px-5 py-6 overflow-y-auto custom-scrollbar">
                <CurrentSuggestion suggestion={currentSuggestion} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle bottom gradient fade */}
      <div className="flex-shrink-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
    </div>
  )
}
