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
  isNewTurn: boolean  // True if this starts a new turn (after silence)
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

export type LLMProvider = 'openai' | 'gemini' | 'gemini-live' | 'adaptive' | 'mock'

export type PromptStyle = 'candidate' | 'coach' | 'star'

export type InterviewRound = 'behavioral' | 'technical' | 'system_design' | 'screening' | 'culture_fit'

// === Interview Prep Types ===

export interface PrepContext {
  companyName: string
  roundType: InterviewRound | ''
  resumeFile: File | null
  resumeParsedText: string
  jdText: string
  workExperience: string
}

export interface InterviewQuestion {
  id: string
  question_text: string
  company_name: string
  interview_round: string
  role: string
  tags: string[]
  difficulty: string
  verified_count: number
  score: number
  tier: 'must_ask' | 'high_probability' | 'stretch'
}

export interface GeneratedAnswer {
  core_message: string
  example_reference: string
  impact_metrics: string
  talking_points: string[]
}

export interface QuestionAnswerPair {
  question_id: string
  question_text: string
  answer_data: GeneratedAnswer
  is_approved: boolean
  is_edited: boolean
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// === WebSocket Message Types ===

// Client -> Server Messages

export interface SessionStartMessage {
  type: 'session.start'
  context: SessionContext
  verbosity: Verbosity
  provider?: LLMProvider
  promptKey?: PromptStyle
  preparedAnswers?: string
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

export interface SpeakerUpdateMessage {
  type: 'speaker.update'
  speaker: 'user' | 'interviewer'
}

export type ClientMessage =
  | SessionStartMessage
  | SessionEndMessage
  | VerbosityChangeMessage
  | PingMessage
  | SpeakerUpdateMessage

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
  isNewTurn: boolean  // True if this starts a new turn (after silence)
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

export interface RateLimitStatusMessage {
  type: 'rate_limit.status'
  dev_mode: boolean
  rpm: number
  buffer_seconds: number
}

export interface RateLimitUpdateMessage {
  type: 'rate_limit.update'
  status: 'idle' | 'queued' | 'executing' | 'timeout'
  queue_position?: number
  estimated_wait?: number
}

export type ServerMessage =
  | SessionReadyMessage
  | TranscriptDeltaMessage
  | SuggestionServerMessage
  | ConnectionStatusMessage
  | ErrorServerMessage
  | PongMessage
  | RateLimitStatusMessage
  | RateLimitUpdateMessage

// === Audio Types ===

export interface AudioStatus {
  microphoneActive: boolean
  systemAudioActive: boolean
  microphoneLevel: number
  systemAudioLevel: number
}
