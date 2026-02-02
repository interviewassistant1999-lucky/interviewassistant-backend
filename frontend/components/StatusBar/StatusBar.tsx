'use client'

import { useSessionStore } from '@/stores/sessionStore'
import { AudioLevelMeter } from './AudioLevelMeter'
import { ConnectionStatus } from './ConnectionStatus'
import { RateLimitIndicator } from './RateLimitIndicator'

export function StatusBar() {
  const { micLevel, systemLevel, micActive, systemActive } = useSessionStore()

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-6">
        <AudioLevelMeter label="Mic" level={micLevel} active={micActive} />
        <AudioLevelMeter label="System" level={systemLevel} active={systemActive} />
        <RateLimitIndicator />
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus />
        <button
          className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
          aria-label="Settings"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
