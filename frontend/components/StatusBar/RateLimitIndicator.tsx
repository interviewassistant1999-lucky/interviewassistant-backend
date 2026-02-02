'use client'

import { useSessionStore } from '@/stores/sessionStore'

/**
 * Shows rate limiting status when in dev mode.
 * 
 * Displays:
 * - Dev mode indicator badge
 * - Current request status (queued/executing)
 * - Queue position and estimated wait time
 */
export function RateLimitIndicator() {
  const { rateLimit } = useSessionStore()

  // Don't show anything if not in dev mode
  if (!rateLimit.devMode) {
    return null
  }

  const getStatusColor = () => {
    switch (rateLimit.status) {
      case 'queued':
        return 'text-accent-yellow'
      case 'executing':
        return 'text-accent-green'
      case 'timeout':
        return 'text-accent-red'
      default:
        return 'text-text-secondary'
    }
  }

  const getStatusIcon = () => {
    switch (rateLimit.status) {
      case 'queued':
        return (
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      case 'executing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Dev Mode Badge */}
      <span className="px-2 py-0.5 text-xs font-medium bg-accent-yellow/20 text-accent-yellow rounded-full">
        DEV
      </span>
      
      {/* Rate Limit Info */}
      <span className="text-xs text-text-secondary">
        {rateLimit.rpm} RPM • {rateLimit.bufferSeconds}s buffer
      </span>

      {/* Status Indicator */}
      {rateLimit.status !== 'idle' && (
        <div className={`flex items-center gap-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          {rateLimit.status === 'queued' && (
            <span className="text-xs">
              Queue #{rateLimit.queuePosition} (~{Math.round(rateLimit.estimatedWait)}s)
            </span>
          )}
          {rateLimit.status === 'executing' && (
            <span className="text-xs">Processing...</span>
          )}
          {rateLimit.status === 'timeout' && (
            <span className="text-xs">Timeout</span>
          )}
        </div>
      )}
    </div>
  )
}
