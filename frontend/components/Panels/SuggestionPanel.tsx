'use client'

import { useSessionStore } from '@/stores/sessionStore'

export function SuggestionPanel() {
  const { currentSuggestion } = useSessionStore()

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">AI Suggestions</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!currentSuggestion ? (
          <div className="text-center text-text-secondary py-8">
            <p className="text-4xl mb-4">💡</p>
            <p>No suggestions yet</p>
            <p className="text-sm mt-2">
              AI will provide suggestions when it detects questions from the
              interviewer
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Suggested Response */}
            <div className="p-4 rounded-lg bg-suggestion-bg">
              <h3 className="text-sm font-semibold text-accent-blue mb-2 flex items-center gap-2">
                <span>💡</span>
                Suggested Response
              </h3>
              <p className="text-text-primary">{currentSuggestion.response}</p>
            </div>

            {/* Key Points */}
            {currentSuggestion.keyPoints.length > 0 && (
              <div className="p-4 rounded-lg bg-bg-tertiary">
                <h3 className="text-sm font-semibold text-accent-green mb-2 flex items-center gap-2">
                  <span>📌</span>
                  Key Points
                </h3>
                <ul className="space-y-2">
                  {currentSuggestion.keyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-text-primary"
                    >
                      <span className="text-accent-green">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-up Tip */}
            {currentSuggestion.followUp && (
              <div className="p-4 rounded-lg bg-bg-tertiary">
                <h3 className="text-sm font-semibold text-accent-yellow mb-2 flex items-center gap-2">
                  <span>💬</span>
                  If They Ask More
                </h3>
                <p className="text-text-secondary">
                  {currentSuggestion.followUp}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
