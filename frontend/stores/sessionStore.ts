/**
 * Zustand store for managing session state.
 */

import { create } from 'zustand'
import type {
  ConnectionStatus,
  LLMProvider,
  PromptStyle,
  SessionContext,
  Suggestion,
  TranscriptEntry,
  Verbosity,
} from '@/types'

// Rate limit state for dev mode
interface RateLimitState {
  devMode: boolean
  rpm: number
  bufferSeconds: number
  status: 'idle' | 'queued' | 'executing' | 'timeout'
  queuePosition: number
  estimatedWait: number
}

interface SessionState {
  // Connection state
  status: ConnectionStatus
  latency: number

  // Audio state
  micLevel: number
  systemLevel: number
  micActive: boolean
  systemActive: boolean

  // Content
  transcript: TranscriptEntry[]
  suggestions: Suggestion[]  // Array of all suggestions during session

  // Settings
  verbosity: Verbosity
  provider: LLMProvider
  promptKey: PromptStyle

  // Context (not persisted)
  context: SessionContext

  // Rate limiting state (dev mode)
  rateLimit: RateLimitState

  // Actions
  setStatus: (status: ConnectionStatus) => void
  setLatency: (ms: number) => void
  setAudioLevels: (mic: number, system: number) => void
  setMicActive: (active: boolean) => void
  setSystemActive: (active: boolean) => void
  addTranscriptEntry: (entry: TranscriptEntry) => void
  updateTranscriptEntry: (id: string, text: string, isFinal: boolean) => void
  addSuggestion: (suggestion: Suggestion) => void  // Add to suggestions array
  setVerbosity: (verbosity: Verbosity) => void
  setProvider: (provider: LLMProvider) => void
  setPromptKey: (promptKey: PromptStyle) => void
  setContext: (context: Partial<SessionContext>) => void
  setRateLimitStatus: (status: Partial<RateLimitState>) => void
  reset: () => void
}

const initialContext: SessionContext = {
  jobDescription: '',
  resume: '',
  workExperience: '',
}

const initialRateLimit: RateLimitState = {
  devMode: false,
  rpm: 4,
  bufferSeconds: 10,
  status: 'idle',
  queuePosition: 0,
  estimatedWait: 0,
}

export const useSessionStore = create<SessionState>((set) => ({
  // Initial state
  status: 'idle',
  latency: 0,
  micLevel: 0,
  systemLevel: 0,
  micActive: false,
  systemActive: false,
  transcript: [],
  suggestions: [],  // All suggestions persist during session
  verbosity: 'moderate',
  provider: 'adaptive',  // Default to Adaptive (Groq) for ultra-fast responses
  promptKey: 'candidate',  // Default to candidate mode (first-person, tactical)
  context: { ...initialContext },
  rateLimit: { ...initialRateLimit },

  // Actions
  setStatus: (status) => set({ status }),

  setLatency: (latency) => set({ latency }),

  setAudioLevels: (micLevel, systemLevel) => set({ micLevel, systemLevel }),

  setMicActive: (micActive) => set({ micActive }),

  setSystemActive: (systemActive) => set({ systemActive }),

  addTranscriptEntry: (entry) =>
    set((state) => ({
      transcript: [...state.transcript, entry],
    })),

  updateTranscriptEntry: (id, text, isFinal) =>
    set((state) => ({
      transcript: state.transcript.map((e) =>
        e.id === id ? { ...e, text, isFinal } : e
      ),
    })),

  // Add suggestion to the array (persists all suggestions)
  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [...state.suggestions, suggestion],
    })),

  setVerbosity: (verbosity) => set({ verbosity }),

  setProvider: (provider) => set({ provider }),

  setPromptKey: (promptKey) => set({ promptKey }),

  setContext: (context) =>
    set((state) => ({
      context: { ...state.context, ...context },
    })),

  setRateLimitStatus: (rateLimitUpdate) =>
    set((state) => ({
      rateLimit: { ...state.rateLimit, ...rateLimitUpdate },
    })),

  reset: () =>
    set({
      status: 'idle',
      latency: 0,
      micLevel: 0,
      systemLevel: 0,
      micActive: false,
      systemActive: false,
      transcript: [],
      suggestions: [],  // Only clear on session end
      rateLimit: { ...initialRateLimit },
    }),
}))
