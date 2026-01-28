'use client'

import { useSessionStore } from '@/stores/sessionStore'

export function ConnectionStatus() {
  const { status, latency } = useSessionStore()

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-accent-green',
          text: `Connected (${latency}ms)`,
        }
      case 'connecting':
        return {
          color: 'bg-accent-yellow',
          text: 'Connecting...',
        }
      case 'reconnecting':
        return {
          color: 'bg-accent-yellow animate-pulse',
          text: 'Reconnecting...',
        }
      case 'error':
        return {
          color: 'bg-accent-red',
          text: 'Error',
        }
      default:
        return {
          color: 'bg-text-secondary',
          text: 'Disconnected',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
      <span className="text-sm text-text-secondary">{config.text}</span>
    </div>
  )
}
