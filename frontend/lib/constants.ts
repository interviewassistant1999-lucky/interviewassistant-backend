/**
 * Application constants.
 */

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export const AUDIO_CONFIG = {
  sampleRate: 24000,
  channels: 1,
  bufferSize: 4096,
} as const

export const RECONNECT_CONFIG = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.3,
} as const

export const ERROR_MESSAGES: Record<string, string> = {
  CONNECTION_LOST: 'Connection lost. Reconnecting...',
  MIC_PERMISSION_DENIED: 'Microphone access is required. Please enable it in your browser settings.',
  SCREEN_PERMISSION_DENIED: 'Screen sharing is required to capture interviewer audio.',
  SESSION_EXPIRED: 'Your session has expired. Please start a new session.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  OPENAI_ERROR: 'AI service temporarily unavailable. Retrying...',
  CONTEXT_TOO_LONG: 'Your context exceeds the maximum length. Please shorten it.',
} as const
