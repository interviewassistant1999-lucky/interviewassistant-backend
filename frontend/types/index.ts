/**
 * Shared TypeScript type definitions for the Interview Assistant frontend.
 */

// === Session Types ===

export interface TranscriptEntry {
  id: string
  timestamp: Date
  speaker: 'user' | 'interviewer'
  text: string
  isFinal: boolean
}

export interface Suggestion {
  id: string
  timestamp: Date
  response: string
  keyPoints: string[]
  followUp: string
}

export interface SessionContext {
  jobDescription: string
  resume: string
  workExperience: string
}

export type Verbosity = 'concise' | 'moderate' | 'detailed'

export type LLMProvider = 'openai' | 'gemini' | 'mock'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// === WebSocket Message Types ===

// Client -> Server Messages

export interface SessionStartMessage {
  type: 'session.start'
  context: SessionContext
  verbosity: Verbosity
  provider?: LLMProvider
}

export interface SessionEndMessage {
  type: 'session.end'
}

export interface VerbosityChangeMessage {
  type: 'verbosity.change'
  verbosity: Verbosity
}

export interface PingMessage {
  type: 'ping'
  timestamp: number
}

export type ClientMessage =
  | SessionStartMessage
  | SessionEndMessage
  | VerbosityChangeMessage
  | PingMessage

// Server -> Client Messages

export interface SessionReadyMessage {
  type: 'session.ready'
}

export interface TranscriptDeltaMessage {
  type: 'transcript.delta'
  id: string
  speaker: 'user' | 'interviewer'
  text: string
  isFinal: boolean
}

export interface SuggestionServerMessage {
  type: 'suggestion'
  id: string
  response: string
  keyPoints: string[]
  followUp: string
}

export interface ConnectionStatusMessage {
  type: 'connection.status'
  status: 'connected' | 'reconnecting'
  latency?: number
}

export interface ErrorServerMessage {
  type: 'error'
  code: string
  message: string
  recoverable: boolean
}

export interface PongMessage {
  type: 'pong'
  timestamp: number
  serverTime: number
}

export type ServerMessage =
  | SessionReadyMessage
  | TranscriptDeltaMessage
  | SuggestionServerMessage
  | ConnectionStatusMessage
  | ErrorServerMessage
  | PongMessage

// === Audio Types ===

export interface AudioStatus {
  microphoneActive: boolean
  systemAudioActive: boolean
  microphoneLevel: number
  systemAudioLevel: number
}
