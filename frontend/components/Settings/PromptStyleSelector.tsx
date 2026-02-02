'use client'

import { useSessionStore } from '@/stores/sessionStore'
import type { PromptStyle } from '@/types'

interface PromptOption {
  value: PromptStyle
  label: string
  description: string
  badge?: string
}

const options: PromptOption[] = [
  {
    value: 'candidate',
    label: 'Candidate Mode',
    description: 'First-person responses as if YOU are speaking. Battle-tested, tactical, personal.',
    badge: 'Recommended',
  },
  {
    value: 'coach',
    label: 'Coach Mode',
    description: 'Third-person coaching suggestions. Classic interview assistant style.',
  },
  {
    value: 'star',
    label: 'STAR Mode',
    description: 'Behavioral interview specialist. Structures answers using Situation-Task-Action-Result.',
    badge: 'Behavioral',
  },
]

export function PromptStyleSelector() {
  const { promptKey, setPromptKey } = useSessionStore()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Response Style</h3>
      <p className="text-text-secondary text-sm">
        Choose how the AI structures its suggestions.
      </p>

      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                       border ${
                         promptKey === option.value
                           ? 'border-accent-green bg-accent-green/10'
                           : 'border-border bg-bg-tertiary hover:border-accent-green/50'
                       }`}
          >
            <input
              type="radio"
              name="promptStyle"
              value={option.value}
              checked={promptKey === option.value}
              onChange={() => setPromptKey(option.value)}
              className="mt-1 w-4 h-4 text-accent-green bg-bg-tertiary border-border
                        focus:ring-accent-green focus:ring-2"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{option.label}</span>
                {option.badge && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      option.badge === 'Recommended'
                        ? 'bg-accent-green/20 text-accent-green'
                        : option.badge === 'Behavioral'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-accent-yellow/20 text-accent-yellow'
                    }`}
                  >
                    {option.badge}
                  </span>
                )}
              </div>
              <div className="text-sm text-text-secondary">
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>

      {promptKey === 'candidate' && (
        <div className="p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg text-sm">
          <p className="font-medium text-accent-green mb-1">First-Person Mode:</p>
          <p className="text-text-secondary">
            Responses are written as if you're speaking directly. The AI pulls specific
            examples from your resume and crafts "battle stories" you can use.
          </p>
        </div>
      )}

      {promptKey === 'star' && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm">
          <p className="font-medium text-purple-400 mb-1">STAR Method:</p>
          <p className="text-text-secondary">
            Answers are structured as Situation → Task → Action → Result.
            Great for behavioral interview questions like "Tell me about a time when..."
          </p>
        </div>
      )}
    </div>
  )
}
