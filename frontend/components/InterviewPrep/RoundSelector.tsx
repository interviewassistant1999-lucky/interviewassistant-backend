'use client'

import { useSessionStore } from '@/stores/sessionStore'
import type { InterviewRound } from '@/types'

interface RoundOption {
  value: InterviewRound
  label: string
  description: string
}

const options: RoundOption[] = [
  {
    value: 'screening',
    label: 'Screening',
    description: 'Initial phone/video screen with recruiter or hiring manager',
  },
  {
    value: 'behavioral',
    label: 'Behavioral',
    description: 'Leadership principles, STAR method, past experience questions',
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Coding, algorithms, data structures, system knowledge',
  },
  {
    value: 'system_design',
    label: 'System Design',
    description: 'Architecture, scalability, distributed systems',
  },
  {
    value: 'culture_fit',
    label: 'Culture Fit',
    description: 'Values alignment, team dynamics, work style',
  },
]

export function RoundSelector() {
  const { roundType, setRoundType } = useSessionStore()

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-primary">Interview Round</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
              border ${
                roundType === option.value
                  ? 'border-accent-blue bg-accent-blue/10'
                  : 'border-border bg-bg-tertiary hover:border-accent-blue/50'
              }`}
          >
            <input
              type="radio"
              name="roundType"
              value={option.value}
              checked={roundType === option.value}
              onChange={() => setRoundType(option.value)}
              className="mt-0.5 w-4 h-4 text-accent-blue bg-bg-tertiary border-border focus:ring-accent-blue focus:ring-2"
            />
            <div>
              <span className="font-medium text-sm">{option.label}</span>
              <p className="text-xs text-text-secondary mt-0.5">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
