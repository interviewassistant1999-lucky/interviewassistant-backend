'use client'

import { useSessionStore } from '@/stores/sessionStore'
import type { LLMProvider } from '@/types'

interface ProviderOption {
  value: LLMProvider
  label: string
  description: string
  badge?: string
}

const options: ProviderOption[] = [
  {
    value: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini 1.5 Flash - Free tier available',
    badge: 'Free',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o Realtime API - Requires paid subscription',
  },
  {
    value: 'mock',
    label: 'Demo Mode',
    description: 'Simulated responses for testing - No API key needed',
    badge: 'Testing',
  },
]

export function ProviderSelector() {
  const { provider, setProvider } = useSessionStore()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI Provider</h3>
      <p className="text-text-secondary text-sm">
        Choose which AI model to use for interview assistance.
      </p>

      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                       border ${
                         provider === option.value
                           ? 'border-accent-blue bg-accent-blue/10'
                           : 'border-border bg-bg-tertiary hover:border-accent-blue/50'
                       }`}
          >
            <input
              type="radio"
              name="provider"
              value={option.value}
              checked={provider === option.value}
              onChange={() => setProvider(option.value)}
              className="mt-1 w-4 h-4 text-accent-blue bg-bg-tertiary border-border
                        focus:ring-accent-blue focus:ring-2"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{option.label}</span>
                {option.badge && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      option.badge === 'Free'
                        ? 'bg-accent-green/20 text-accent-green'
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

      {provider === 'gemini' && (
        <div className="p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg text-sm">
          <p className="font-medium text-accent-blue mb-1">Get your free Gemini API key:</p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            https://aistudio.google.com/apikey
          </a>
        </div>
      )}

      {provider === 'openai' && (
        <div className="p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-lg text-sm">
          <p className="text-accent-yellow">
            OpenAI Realtime API requires a paid subscription. Consider using Gemini for free tier testing.
          </p>
        </div>
      )}
    </div>
  )
}
