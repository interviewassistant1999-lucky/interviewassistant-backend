'use client'

import { TranscriptPanel } from './TranscriptPanel'
import { SuggestionPanel } from './SuggestionPanel'

export function SplitLayout() {
  return (
    <div className="flex h-full">
      {/* Left Panel - Transcript */}
      <div className="w-1/2 border-r border-border bg-bg-secondary">
        <TranscriptPanel />
      </div>

      {/* Right Panel - Suggestions */}
      <div className="w-1/2 bg-bg-secondary">
        <SuggestionPanel />
      </div>
    </div>
  )
}
