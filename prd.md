# Product Requirements Document: Real-Time Interview Assistant

## Overview

A production-grade web application that provides real-time AI-powered coaching during interviews by capturing audio from both the user (microphone) and interviewer (system/tab audio), transcribing the conversation, and delivering contextual suggestions through a teleprompter-style interface.

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Key Decisions](#key-decisions)
3. [MVP Scope](#mvp-scope)
4. [Architecture Overview](#architecture-overview)
5. [Core Functionality](#core-functionality)
6. [Technical Specifications](#technical-specifications)
7. [Security & Privacy](#security--privacy)
8. [User Experience](#user-experience)
9. [API Contracts](#api-contracts)
10. [Data Models](#data-models)
11. [Error Handling](#error-handling)
12. [Deployment](#deployment)
13. [Future Roadmap](#future-roadmap)
14. [Appendix](#appendix)

---

## Product Vision

### Problem Statement
Job candidates often struggle to articulate their experience effectively during interviews, especially under pressure. They need real-time, contextual assistance without disrupting the natural flow of conversation.

### Solution
A "Passive Interview Co-Pilot" that listens to both sides of the conversation, automatically detects questions from the interviewer, and provides concise, relevant suggestions based on the candidate's resume and the job description.

### Target Users
- Job seekers preparing for technical and behavioral interviews
- Career coaches assisting clients
- Professionals in high-stakes interview situations

### Ethical Usage
> **Disclaimer**: This tool is designed to help candidates perform their best by surfacing relevant information from their own experience. Users are responsible for ethical usage. We recommend using this primarily as a practice and preparation tool.

---

## Key Decisions

Decisions made during requirements gathering:

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Product Type** | Hybrid (personal → multi-user) | Start simple, architect for scale |
| **Platform** | Web + Desktop (Electron later) | Web first for speed, Electron for enhanced features |
| **AI Trigger** | Auto-detect questions | Seamless UX, no manual intervention needed |
| **MVP Focus** | Core audio + AI only | Ship fast, validate concept |
| **Styling** | Tailwind CSS | Rapid development, custom dark UI |
| **Theme** | Dark mode only | Cleaner scope, professional look |
| **UI Layout** | Side panel (split view) | Transcript + suggestions visible simultaneously |
| **Speaker ID** | Distinguish speakers | Essential for context and readability |
| **Browser Support** | Chrome/Edge only | Block Safari/Firefox (no system audio) |
| **Context Storage** | No persistence | Maximum privacy, re-enter each session |
| **AI Verbosity** | User configurable | Different users, different needs |
| **Analytics** | None | Privacy first |
| **Testing** | Manual for MVP | Speed over coverage initially |
| **Timeline** | ASAP/Sprint | Fast iteration |

---

## MVP Scope

### In Scope (MVP v1)
- [x] Microphone audio capture
- [x] System/tab audio capture (Chrome/Edge)
- [x] Audio merging and streaming to backend
- [x] WebSocket relay to OpenAI Realtime API
- [x] Real-time transcription display
- [x] AI suggestion generation (auto-detect questions)
- [x] Split panel UI (transcript + suggestions)
- [x] Speaker identification (You vs Interviewer)
- [x] Audio level meters
- [x] Context input (JD, Resume, Experience) - text areas
- [x] Configurable AI verbosity setting
- [x] Connection status indicator
- [x] Auto-reconnection with notification
- [x] Ethical usage disclaimer
- [x] Browser compatibility check

### Out of Scope (Post-MVP)
- [ ] Picture-in-Picture mode
- [ ] Compact overlay mode
- [ ] Transcript download
- [ ] Clear history button
- [ ] Keyboard shortcuts
- [ ] Context persistence/saving
- [ ] User accounts/authentication
- [ ] Analytics/metrics
- [ ] Electron desktop app
- [ ] Offline mode
- [ ] Multi-language support

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Chrome/Edge)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Microphone     │  │  System Audio   │  │      React/Next.js UI       │  │
│  │  (User Voice)   │  │  (Tab Capture)  │  │  - Split Panel Layout       │  │
│  └────────┬────────┘  └────────┬────────┘  │  - Dark Theme Only          │  │
│           │                    │           │  - Audio Level Meters       │  │
│           └──────────┬─────────┘           │  - Verbosity Settings       │  │
│                      ▼                     └─────────────────────────────┘  │
│           ┌─────────────────────┐                        ▲                   │
│           │   Web Audio API    │                        │                   │
│           │  Merge → Mono 24kHz │                        │                   │
│           │      PCM16          │                        │                   │
│           └──────────┬──────────┘                        │                   │
│                      ▼                                   │                   │
│           ┌─────────────────────┐          ┌─────────────┴─────────────┐    │
│           │  WebSocket Client   │◄────────►│    Zustand State Store    │    │
│           │  (Binary + JSON)    │          │                           │    │
│           └──────────┬──────────┘          └───────────────────────────┘    │
└──────────────────────┼──────────────────────────────────────────────────────┘
                       │ WSS (Encrypted)
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI/Python)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        WebSocket Relay Server                          │  │
│  │  - Session Management          - Audio Buffer Queue                   │  │
│  │  - Context Injection           - Periodic Summarization (15 min)      │  │
│  │  - Connection Health           - Graceful Reconnection                │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    OpenAI Realtime API Client                          │  │
│  │  - WSS: wss://api.openai.com/v1/realtime                              │  │
│  │  - Modalities: ["text"]                                                │  │
│  │  - VAD: server_vad enabled                                            │  │
│  │  - Model: gpt-4o-realtime-preview                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Functionality

### 1. Audio Capture System

#### 1.1 Browser Compatibility Gate
```typescript
// Block unsupported browsers at startup
function checkBrowserSupport(): { supported: boolean; reason?: string } {
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
  const isEdge = /Edg/.test(navigator.userAgent);

  if (!isChrome && !isEdge) {
    return {
      supported: false,
      reason: 'This app requires Chrome or Edge for system audio capture. Please switch browsers.'
    };
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    return {
      supported: false,
      reason: 'Your browser version does not support required audio features. Please update.'
    };
  }

  return { supported: true };
}
```

#### 1.2 Microphone Input (User Voice)
```typescript
// Requirements
- Permission: navigator.mediaDevices.getUserMedia({ audio: true })
- Sample Rate: Native capture, resample to 24kHz
- Channels: Mono
- Format: PCM16 (16-bit signed integer)
```

#### 1.3 System/Tab Audio (Interviewer Voice)
```typescript
// Requirements
- Permission: navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
- Note: video: true required but can be ignored/hidden
- Capture Method: Tab audio capture via Screen Share API
- User Action: Select the Zoom/Meet tab to capture
- Sample Rate: Resample to 24kHz
- Channels: Mono
- Format: PCM16
```

#### 1.4 Audio Stream Merger (AudioWorklet)
```typescript
// AudioWorklet Processor - runs in dedicated audio thread
class AudioMergerProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const micInput = inputs[0]?.[0] || new Float32Array(128);
    const systemInput = inputs[1]?.[0] || new Float32Array(128);

    // Mix both inputs (average to prevent clipping)
    const mixed = new Float32Array(micInput.length);
    for (let i = 0; i < micInput.length; i++) {
      mixed[i] = (micInput[i] * 0.5 + systemInput[i] * 0.5);
    }

    // Convert Float32 [-1, 1] to PCM16 [-32768, 32767]
    const pcm16 = new Int16Array(mixed.length);
    for (let i = 0; i < mixed.length; i++) {
      const s = Math.max(-1, Math.min(1, mixed[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Send to main thread for WebSocket transmission
    this.port.postMessage({ type: 'audio', data: pcm16.buffer }, [pcm16.buffer]);

    return true; // Keep processor alive
  }
}

registerProcessor('audio-merger-processor', AudioMergerProcessor);
```

#### 1.5 Audio Level Calculation
```typescript
// Calculate RMS level for audio meters
function calculateAudioLevel(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  // Convert to 0-1 scale with some amplification for visibility
  return Math.min(1, rms * 3);
}
```

### 2. Backend WebSocket Relay

#### 2.1 Project Structure
```
backend/
├── main.py                 # FastAPI application entry
├── config.py               # Environment configuration
├── requirements.txt        # Python dependencies
├── routers/
│   └── websocket.py        # WebSocket endpoint handlers
├── services/
│   ├── openai_relay.py     # OpenAI Realtime API client
│   ├── session_manager.py  # Session state management
│   └── summarizer.py       # Periodic transcript summarization
├── models/
│   ├── session.py          # Session data models
│   └── messages.py         # WebSocket message schemas
└── utils/
    └── audio.py            # Audio buffer utilities
```

#### 2.2 Session Configuration
```python
# Initial session.update payload for OpenAI
def build_session_config(context: dict, verbosity: str) -> dict:
    return {
        "type": "session.update",
        "session": {
            "modalities": ["text"],
            "instructions": build_instructions(context, verbosity),
            "input_audio_format": "pcm16",
            "input_audio_transcription": {
                "model": "whisper-1"
            },
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 700
            },
            "temperature": 0.7,
            "max_response_output_tokens": get_max_tokens(verbosity)
        }
    }

def get_max_tokens(verbosity: str) -> int:
    return {
        "concise": 150,
        "moderate": 300,
        "detailed": 500
    }.get(verbosity, 300)
```

#### 2.3 System Instructions Template
```python
SYSTEM_INSTRUCTIONS_TEMPLATE = """
You are a Passive Interview Co-Pilot. Your role is to assist the candidate during a live interview by providing relevant suggestions ONLY when you detect a question from the interviewer.

## Core Behavior:
1. ONLY respond when the interviewer asks a QUESTION
2. NEVER respond to the candidate's own statements or answers
3. NEVER interrupt with unsolicited advice
4. If you detect small talk or non-questions, remain silent

## Response Style ({verbosity}):
{verbosity_instructions}

## Response Format:
When you detect a question, respond with:
1. **Suggested Response**: A direct answer suggestion
2. **Key Points**: 2-3 bullet points to mention
3. **If They Ask More**: One follow-up tip if the interviewer digs deeper

## Context Provided:

### Job Description:
{job_description}

### Candidate Resume:
{resume}

### Work Experience Details:
{work_experience}

{summary_context}

## Important:
- Reference SPECIFIC details from the candidate's experience
- Use numbers and metrics when available
- Keep suggestions natural and conversational
- Adapt tone to match the interview style (technical vs behavioral)
"""

VERBOSITY_INSTRUCTIONS = {
    "concise": "Keep responses under 2 sentences. Bullet points only. No elaboration.",
    "moderate": "Provide 2-3 sentence suggestions with supporting points. Balanced detail.",
    "detailed": "Give comprehensive suggestions with full context, examples, and structure."
}
```

#### 2.4 Periodic Summarization (Long Sessions)
```python
# Summarize transcript every 15 minutes to manage context length
class TranscriptSummarizer:
    SUMMARY_INTERVAL_MINUTES = 15

    def __init__(self):
        self.full_transcript: list[dict] = []
        self.summaries: list[str] = []
        self.last_summary_time: datetime = datetime.now()

    def add_entry(self, entry: dict):
        self.full_transcript.append(entry)

        # Check if it's time to summarize
        elapsed = (datetime.now() - self.last_summary_time).total_seconds() / 60
        if elapsed >= self.SUMMARY_INTERVAL_MINUTES:
            self._create_summary()

    def _create_summary(self):
        # Get entries since last summary
        recent_entries = self._get_recent_entries()

        # Create summary (done via separate OpenAI call or simple extraction)
        summary = self._summarize(recent_entries)
        self.summaries.append(summary)

        # Reset for next interval
        self.last_summary_time = datetime.now()

    def get_context_for_ai(self) -> str:
        """Return summaries + recent transcript for AI context"""
        context_parts = []

        if self.summaries:
            context_parts.append("### Previous Discussion Summary:")
            context_parts.extend(self.summaries)

        # Include last 5 minutes of full transcript
        recent = self._get_last_n_minutes(5)
        if recent:
            context_parts.append("### Recent Conversation:")
            context_parts.append(self._format_entries(recent))

        return "\n\n".join(context_parts)
```

### 3. Frontend Application

#### 3.1 Project Structure
```
frontend/
├── app/
│   ├── page.tsx                    # Main application page
│   ├── layout.tsx                  # Root layout with providers
│   └── globals.css                 # Global styles + Tailwind
├── components/
│   ├── AudioCapture/
│   │   ├── AudioCapture.tsx        # Main audio capture orchestrator
│   │   ├── AudioMerger.ts          # Web Audio API merger setup
│   │   └── audio-worklet.ts        # AudioWorklet processor code
│   ├── Panels/
│   │   ├── TranscriptPanel.tsx     # Left panel - live transcription
│   │   ├── SuggestionPanel.tsx     # Right panel - AI suggestions
│   │   └── SplitLayout.tsx         # Resizable split container
│   ├── StatusBar/
│   │   ├── StatusBar.tsx           # Top status bar container
│   │   ├── AudioLevelMeter.tsx     # Real-time audio level display
│   │   └── ConnectionStatus.tsx    # WebSocket connection indicator
│   ├── ContextInput/
│   │   ├── ContextInput.tsx        # Context input modal/section
│   │   └── TextAreaField.tsx       # Reusable text area component
│   ├── Settings/
│   │   ├── SettingsPanel.tsx       # Settings drawer/modal
│   │   └── VerbositySelector.tsx   # AI verbosity radio group
│   ├── BrowserCheck.tsx            # Browser compatibility gate
│   └── Disclaimer.tsx              # Ethical usage disclaimer modal
├── hooks/
│   ├── useWebSocket.ts             # WebSocket connection management
│   ├── useAudioCapture.ts          # Audio capture hook
│   └── useReconnection.ts          # Auto-reconnection logic
├── stores/
│   └── sessionStore.ts             # Zustand state management
├── lib/
│   ├── audioUtils.ts               # Audio processing utilities
│   └── constants.ts                # App constants
├── types/
│   └── index.ts                    # TypeScript definitions
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

#### 3.2 Main UI Layout (Dark Theme)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STATUS BAR                                               [⚙️]  │   │
│  │  ● Mic: ████░░░░  │  ● System: ██████░░  │  🟢 Connected (120ms) │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┐ ┌──────────────────────────────────────┐ │
│ │    LIVE TRANSCRIPTION      │ │       AI SUGGESTIONS                 │ │
│ │    (Scrollable)            │ │                                      │ │
│ │                            │ │  💡 Suggested Response:              │ │
│ │ ┌────────────────────────┐ │ │                                      │ │
│ │ │ 👤 Interviewer         │ │ │  "In my role at Acme Corp, I led    │ │
│ │ │ "Tell me about a time  │ │ │  a cross-functional team through    │ │
│ │ │ when you had to lead   │ │ │  a critical product launch..."      │ │
│ │ │ a team through a       │ │ │                                      │ │
│ │ │ challenging project."  │ │ │  📌 Key Points:                      │ │
│ │ └────────────────────────┘ │ │  • Q3 product launch (40% faster)   │ │
│ │                            │ │  • 5-person cross-functional team   │ │
│ │ ┌────────────────────────┐ │ │  • Overcame vendor delay            │ │
│ │ │ 🎤 You                 │ │ │                                      │ │
│ │ │ "That's a great        │ │ │  💬 If They Ask More:               │ │
│ │ │ question. Let me       │ │ │  Mention the retrospective process  │ │
│ │ │ think about..."        │ │ │  you implemented afterward.         │ │
│ │ └────────────────────────┘ │ │                                      │ │
│ │                            │ │                                      │ │
│ │ ┌────────────────────────┐ │ └──────────────────────────────────────┘ │
│ │ │ ▌ (live typing...)    │ │                                          │
│ │ └────────────────────────┘ │                                          │
│ └────────────────────────────┘                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [🔴 End Session]                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.3 Color Scheme (Dark Theme)
```css
/* tailwind.config.js theme extension */
:root {
  --bg-primary: #0f0f0f;      /* Main background */
  --bg-secondary: #1a1a1a;    /* Panel backgrounds */
  --bg-tertiary: #252525;     /* Cards, inputs */
  --border: #333333;          /* Borders */
  --text-primary: #ffffff;    /* Main text */
  --text-secondary: #a0a0a0;  /* Muted text */
  --accent-blue: #3b82f6;     /* Links, highlights */
  --accent-green: #22c55e;    /* Success, connected */
  --accent-yellow: #eab308;   /* Warnings */
  --accent-red: #ef4444;      /* Errors, stop button */
  --interviewer: #60a5fa;     /* Interviewer text color */
  --user: #a78bfa;            /* User text color */
  --suggestion-bg: #1e3a5f;   /* Suggestion card background */
}
```

#### 3.4 Zustand State Store
```typescript
// stores/sessionStore.ts
import { create } from 'zustand';

interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: 'user' | 'interviewer';
  text: string;
  isFinal: boolean;
}

interface Suggestion {
  id: string;
  timestamp: Date;
  response: string;
  keyPoints: string[];
  followUp: string;
}

interface SessionState {
  // Connection
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  latency: number;

  // Audio
  micLevel: number;
  systemLevel: number;
  micActive: boolean;
  systemActive: boolean;

  // Content
  transcript: TranscriptEntry[];
  currentSuggestion: Suggestion | null;

  // Settings
  verbosity: 'concise' | 'moderate' | 'detailed';

  // Context (not persisted)
  context: {
    jobDescription: string;
    resume: string;
    workExperience: string;
  };

  // Actions
  setStatus: (status: SessionState['status']) => void;
  setLatency: (ms: number) => void;
  setAudioLevels: (mic: number, system: number) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  updateTranscriptEntry: (id: string, text: string, isFinal: boolean) => void;
  setSuggestion: (suggestion: Suggestion) => void;
  setVerbosity: (v: SessionState['verbosity']) => void;
  setContext: (ctx: Partial<SessionState['context']>) => void;
  reset: () => void;
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
  currentSuggestion: null,
  verbosity: 'moderate',
  context: {
    jobDescription: '',
    resume: '',
    workExperience: '',
  },

  // Actions
  setStatus: (status) => set({ status }),
  setLatency: (latency) => set({ latency }),
  setAudioLevels: (micLevel, systemLevel) => set({ micLevel, systemLevel }),

  addTranscriptEntry: (entry) => set((state) => ({
    transcript: [...state.transcript, entry]
  })),

  updateTranscriptEntry: (id, text, isFinal) => set((state) => ({
    transcript: state.transcript.map(e =>
      e.id === id ? { ...e, text, isFinal } : e
    )
  })),

  setSuggestion: (suggestion) => set({ currentSuggestion: suggestion }),
  setVerbosity: (verbosity) => set({ verbosity }),
  setContext: (ctx) => set((state) => ({
    context: { ...state.context, ...ctx }
  })),

  reset: () => set({
    status: 'idle',
    transcript: [],
    currentSuggestion: null,
    micLevel: 0,
    systemLevel: 0,
  }),
}));
```

---

## Technical Specifications

### 1. Latency Requirements

| Metric | Target | Maximum |
|--------|--------|---------|
| Audio capture to backend | < 100ms | 200ms |
| Backend to OpenAI | < 50ms | 100ms |
| OpenAI processing | < 800ms | 1000ms |
| Response streaming to UI | < 50ms | 100ms |
| **Total End-to-End** | **< 1000ms** | **< 1500ms** |

### 2. Memory Management

```typescript
// Client-side: Ring buffer for audio (prevents memory leaks)
const MAX_AUDIO_BUFFER_SECONDS = 30;
const SAMPLE_RATE = 24000;
const MAX_BUFFER_SIZE = MAX_AUDIO_BUFFER_SECONDS * SAMPLE_RATE;

// Server-side limits
MAX_TRANSCRIPT_ENTRIES = 500  # Per session
MAX_SESSION_DURATION = 7200   # 2 hours
SUMMARY_INTERVAL = 900        # 15 minutes
```

### 3. WebSocket Reconnection Strategy

```typescript
// Exponential backoff with jitter
const RECONNECT_CONFIG = {
  maxAttempts: 10,
  baseDelay: 1000,      // 1 second
  maxDelay: 30000,      // 30 seconds
  jitterFactor: 0.3,    // ±30% randomization
};

function getReconnectDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    RECONNECT_CONFIG.baseDelay * Math.pow(2, attempt),
    RECONNECT_CONFIG.maxDelay
  );
  const jitter = exponentialDelay * RECONNECT_CONFIG.jitterFactor * (Math.random() - 0.5) * 2;
  return exponentialDelay + jitter;
}
```

### 4. Supported Browsers

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 72+ | ✅ Full support |
| Edge | 79+ | ✅ Full support |
| Firefox | Any | ❌ Blocked (no tab audio) |
| Safari | Any | ❌ Blocked (no tab audio) |

---

## Security & Privacy

### 1. Privacy-First Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA FLOW - NO PERSISTENCE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser                          Backend                        │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │ Audio: Memory   │              │ Audio: Memory   │           │
│  │ Context: Memory │───WSS/TLS───►│ Context: Memory │           │
│  │ Transcript: Mem │              │ No disk writes  │           │
│  │                 │              │ No logging      │           │
│  │ On close: Gone  │              │ On disconnect:  │           │
│  └─────────────────┘              │ Session cleared │           │
│                                   └─────────────────┘           │
│                                          │                       │
│                                          ▼                       │
│                                   ┌─────────────────┐           │
│                                   │ OpenAI API      │           │
│                                   │ (their policy)  │           │
│                                   └─────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Security Measures

- **API Key**: Server-side only, via environment variable
- **Transport**: WSS (TLS 1.3) for all connections
- **CORS**: Strict origin checking
- **No Storage**: No localStorage, no cookies, no IndexedDB
- **No Analytics**: Zero tracking, zero telemetry

### 3. Environment Configuration

```bash
# .env (never committed)
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=http://localhost:3000
```

---

## User Experience

### 1. User Flow

```
┌──────────────────┐
│   Open App       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Browser Check    │─No─►│ Show Error +     │
│ (Chrome/Edge?)   │     │ Browser Links    │
└────────┬─────────┘     └──────────────────┘
         │ Yes
         ▼
┌──────────────────┐
│ Show Disclaimer  │
│ (Ethical Usage)  │
└────────┬─────────┘
         │ Accept
         ▼
┌──────────────────┐
│ Context Input    │
│ • Job Description│
│ • Resume         │
│ • Work Experience│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Verbosity Select │
│ ○ Concise        │
│ ● Moderate       │
│ ○ Detailed       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Start Session    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Grant Permissions│
│ • Microphone     │
│ • Screen Share   │
│   (select tab)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Interview Active │◄────────────────────┐
│ • Live transcript│                     │
│ • AI suggestions │                     │
└────────┬─────────┘                     │
         │                               │
         ▼                               │
┌──────────────────┐    ┌────────────┐   │
│ Question         │─No─►│ Continue   │───┘
│ Detected?        │    │ Listening  │
└────────┬─────────┘    └────────────┘
         │ Yes
         ▼
┌──────────────────┐
│ Show Suggestion  │
│ in Right Panel   │
└────────┬─────────┘
         │
         └───────────────────────────────┘
                    (Loop)
         │
         ▼
┌──────────────────┐
│ End Session      │
│ (Click Stop)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Session Ended    │
│ Data Cleared     │
└──────────────────┘
```

### 2. Disclaimer Modal Content

```markdown
## Interview Assistant - Usage Guidelines

This tool is designed to help you perform your best during interviews
by surfacing relevant information from YOUR OWN experience.

### Recommended Use:
✅ Interview practice and preparation
✅ Remembering key achievements and metrics
✅ Structuring your responses
✅ Reducing interview anxiety

### Your Responsibility:
⚠️ You are responsible for how you use this tool
⚠️ Be authentic - the AI helps you remember, not fabricate
⚠️ Consider disclosure if your company/interviewer has policies

By continuing, you acknowledge these guidelines.

[I Understand - Continue]
```

### 3. Error States

| State | UI Treatment |
|-------|--------------|
| Mic permission denied | Modal with instructions to enable |
| Screen share cancelled | Modal explaining why it's needed |
| Connection lost | Toast notification + auto-reconnect indicator |
| OpenAI error | Toast with "Retrying..." message |
| Session timeout (2hr) | Modal suggesting to restart |

---

## API Contracts

### 1. Client → Backend Messages

```typescript
type ClientMessage =
  | { type: 'session.start'; context: SessionContext; verbosity: Verbosity }
  | { type: 'session.end' }
  | { type: 'audio'; data: ArrayBuffer }
  | { type: 'verbosity.change'; verbosity: Verbosity }
  | { type: 'ping'; timestamp: number };

interface SessionContext {
  jobDescription: string;
  resume: string;
  workExperience: string;
}

type Verbosity = 'concise' | 'moderate' | 'detailed';
```

### 2. Backend → Client Messages

```typescript
type ServerMessage =
  | { type: 'session.ready' }
  | { type: 'transcript.delta'; id: string; speaker: 'user' | 'interviewer'; text: string; isFinal: boolean }
  | { type: 'suggestion'; id: string; response: string; keyPoints: string[]; followUp: string }
  | { type: 'connection.status'; status: 'connected' | 'reconnecting'; latency?: number }
  | { type: 'error'; code: string; message: string; recoverable: boolean }
  | { type: 'pong'; timestamp: number; serverTime: number };
```

---

## Data Models

### 1. Session (Backend - In Memory Only)

```python
@dataclass
class Session:
    id: str
    created_at: datetime
    context: SessionContext
    verbosity: str
    transcript: list[TranscriptEntry]
    summaries: list[str]
    last_summary_at: datetime

@dataclass
class SessionContext:
    job_description: str
    resume: str
    work_experience: str

@dataclass
class TranscriptEntry:
    id: str
    timestamp: datetime
    speaker: Literal['user', 'interviewer']
    text: str
    is_final: bool
```

---

## Error Handling

### Error Codes

| Code | Category | Message | Recoverable |
|------|----------|---------|-------------|
| `CONN_001` | Connection | WebSocket connection failed | Yes |
| `CONN_002` | Connection | Connection lost | Yes |
| `AUDIO_001` | Audio | Microphone permission denied | No |
| `AUDIO_002` | Audio | Screen share cancelled | No |
| `AUDIO_003` | Audio | Audio device not found | No |
| `API_001` | OpenAI | OpenAI connection failed | Yes |
| `API_002` | OpenAI | Rate limit exceeded | Yes (after delay) |
| `API_003` | OpenAI | Invalid API key | No |
| `SESSION_001` | Session | Session expired | No |

### Reconnection Behavior

```typescript
// On connection drop:
1. Show toast: "Connection lost. Reconnecting..."
2. Start exponential backoff reconnection
3. On each attempt: Update toast with attempt count
4. On success: "Reconnected" toast, resume session
5. On max attempts: Show modal to manually retry or end session
```

---

## Deployment

### Local Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
# Add your OPENAI_API_KEY to .env
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Requirements Files

**backend/requirements.txt:**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
websockets==12.0
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
```

**frontend/package.json (key dependencies):**
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "zustand": "4.5.0"
  },
  "devDependencies": {
    "typescript": "5.3.3",
    "tailwindcss": "3.4.1",
    "autoprefixer": "10.4.17",
    "postcss": "8.4.33",
    "@types/react": "18.2.48",
    "@types/node": "20.11.5"
  }
}
```

---

## Future Roadmap

### Phase 2 (Post-MVP)
- [ ] Picture-in-Picture mode
- [ ] Compact overlay mode
- [ ] Transcript download (txt/json)
- [ ] Clear history button
- [ ] Keyboard shortcuts
- [ ] Context templates (save/load locally)

### Phase 3 (Scale)
- [ ] User accounts & authentication
- [ ] Context persistence (cloud sync)
- [ ] Electron desktop app
- [ ] Usage analytics (opt-in)
- [ ] Team/enterprise features

### Phase 4 (Advanced)
- [ ] Multi-language support
- [ ] Custom AI personalities
- [ ] Post-interview analytics
- [ ] Practice mode with AI interviewer
- [ ] Mobile companion app

---

## Appendix

### A. OpenAI Realtime API Events

```python
# Events we handle
HANDLED_EVENTS = {
    "session.created",
    "session.updated",
    "input_audio_buffer.speech_started",
    "input_audio_buffer.speech_stopped",
    "conversation.item.input_audio_transcription.completed",
    "response.text.delta",
    "response.text.done",
    "response.done",
    "error",
}
```

### B. Audio Format Specifications

| Parameter | Value |
|-----------|-------|
| Sample Rate | 24,000 Hz |
| Bit Depth | 16-bit |
| Channels | 1 (Mono) |
| Format | PCM (signed integer) |
| Byte Order | Little Endian |

### C. Glossary

| Term | Definition |
|------|------------|
| VAD | Voice Activity Detection - detects when speech starts/stops |
| PCM16 | Pulse Code Modulation 16-bit - uncompressed audio format |
| AudioWorklet | Web API for low-latency audio processing in dedicated thread |
| Realtime API | OpenAI's streaming API for real-time audio/text interaction |

---

*Document Version: 2.0.0*
*Last Updated: 2025-01-26*
*Status: Ready for Implementation*
