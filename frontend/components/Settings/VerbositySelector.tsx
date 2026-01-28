'use client'

import { useSessionStore } from '@/stores/sessionStore'
import type { Verbosity } from '@/types'

interface VerbosityOption {
  value: Verbosity
  label: string
  description: string
}

const options: VerbosityOption[] = [
  {
    value: 'concise',
    label: 'Concise',
    description: 'Short bullet points, quick reference',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced suggestions with key points',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive responses with examples',
  },
]

export function VerbositySelector() {
  const { verbosity, setVerbosity } = useSessionStore()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI Verbosity</h3>
      <p className="text-text-secondary text-sm">
        Choose how detailed the AI suggestions should be.
      </p>

      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                       border ${
                         verbosity === option.value
                           ? 'border-accent-blue bg-accent-blue/10'
                           : 'border-border bg-bg-tertiary hover:border-accent-blue/50'
                       }`}
          >
            <input
              type="radio"
              name="verbosity"
              value={option.value}
              checked={verbosity === option.value}
              onChange={() => setVerbosity(option.value)}
              className="mt-1 w-4 h-4 text-accent-blue bg-bg-tertiary border-border
                        focus:ring-accent-blue focus:ring-2"
            />
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-text-secondary">
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
