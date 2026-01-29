# Interview Assistant

Real-Time Interview Assistant MVP - AI-powered coaching during interviews with audio capture, transcription, and contextual suggestions.

## Features

- **Live Transcription**: Real-time speech-to-text of interview conversations
- **AI Suggestions**: Context-aware answer suggestions when questions are detected
- **Dual Audio Capture**: Captures both microphone (you) and system audio (interviewer)
- **Smart Question Detection**: Waits for complete questions before generating suggestions
- **Session Persistence**: All suggestions persist throughout the interview session
- **Pop-out Overlay**: Floating suggestion window you can position anywhere on screen
- **PWA Support**: Install as app for minimal browser chrome
- **Multiple LLM Providers**: Supports Gemini (free) and OpenAI

## Prerequisites

- **Git** - https://git-scm.com/downloads
- **Python 3.10+** - https://www.python.org/downloads/
- **Node.js 18+** - https://nodejs.org/
- **Google Chrome or Microsoft Edge** (required for system audio capture)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mLucky7/interview_assistant.git
cd interview_assistant
```

### 2. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env
```

#### Configure the `.env` file:

```env
# For FREE usage with Gemini (recommended):
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key-here

# Get your free Gemini API key at:
# https://aistudio.google.com/apikey

ALLOWED_ORIGINS=http://localhost:3000
USE_MOCK_OPENAI=false
```

#### Start the backend server:

```bash
# Make sure you're in the backend folder with venv activated
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 3. Frontend Setup

Open a **new terminal** window:

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

You should see:
```
▲ Next.js 14.1.0
- Local: http://localhost:3000
```

### 4. Test the Application

1. **Open Chrome/Edge** and go to: `http://localhost:3000`

2. **Accept the disclaimer** by clicking "I Understand - Continue"

3. **Fill in context** (optional but recommended):
   - Job Description: Paste the job posting
   - Resume: Paste your resume
   - Work Experience: Add relevant details

4. **Select Provider**: Choose "Gemini" (free tier)

5. **Click "Start Interview Session"**

6. **Grant permissions**:
   - Allow microphone access
   - When screen share dialog appears:
     - Select a Chrome tab (or the whole screen)
     - **Important**: Check the "Share audio" or "Share tab audio" checkbox

7. **Test the flow**:
   - Speak an interview question like: "Tell me about yourself"
   - Watch the **Live Transcription** panel for your speech
   - Wait 2 seconds after finishing the question
   - The **AI Suggestions** panel should show a suggested response

## Getting a Free Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `backend/.env` file

The free tier includes:
- 15 requests per minute
- 1,500 requests per day
- Audio transcription support

## Project Structure

```
interview_assistant/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Your local config (create from .env.example)
│   ├── routers/
│   │   └── websocket.py        # WebSocket endpoint
│   └── services/
│       ├── gemini_client.py    # Gemini LLM integration
│       └── openai_relay.py     # OpenAI integration + factory
├── frontend/
│   ├── app/                    # Next.js pages
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand state management
│   └── package.json            # Node dependencies
└── progress.txt                # Development history & patterns
```

## Useful Commands

```bash
# Backend (from backend folder with venv activated)
uvicorn main:app --reload --port 8000    # Start server
python -m py_compile main.py              # Check syntax

# Frontend (from frontend folder)
npm run dev          # Start dev server
npm run typecheck    # Check TypeScript types
npm run build        # Build for production
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check Python version (`python --version`), ensure venv is activated |
| Frontend won't start | Check Node version (`node --version`), delete `node_modules` and run `npm install` again |
| No audio levels showing | Ensure microphone permission is granted, check browser console for errors |
| System audio not working | Must use Chrome/Edge, must check "Share audio" in screen share dialog |
| No suggestions appearing | Check backend terminal for logs, ensure Gemini API key is valid |
| 429 Rate limit error | Gemini free tier has limits; wait a minute and try again |

## Install as App (PWA)

For the best experience with minimal browser UI:

1. Open the app in **Chrome/Edge**
2. Click the **install icon** in the address bar (or Menu > Install Interview Assistant)
3. Click **Install**
4. The app now runs with minimal chrome - no address bar!

**Benefits of PWA mode:**
- Cleaner interface without browser controls
- Pop-out overlay window has minimal title bar
- Can be launched from desktop/start menu
- Works offline (basic caching)

## Pop-out Suggestion Overlay

During an interview session:

1. Click **"Pop Out Suggestions"** button in the header
2. A floating window opens with AI suggestions
3. **Resize and drag** the window to your preferred position
4. Keep it visible while you're in your interview tab

The overlay shows:
- Latest suggestion prominently displayed
- Previous suggestions faded above (for reference)
- Minimal close button (✕) in corner

## Tech Stack

- **Backend**: Python, FastAPI, WebSockets
- **Frontend**: Next.js 14, React, Zustand, Tailwind CSS
- **LLM**: Google Gemini (default), OpenAI (optional)
- **Audio**: Web Audio API, AudioWorklet
- **PWA**: Service Worker, Web App Manifest

## Future Scope

- **Desktop Application**: Native app using Electron or Tauri for complete window control, system tray, and global hotkeys
- **Mobile App**: React Native or Flutter version for mobile interviews
- **More LLM Providers**: Claude, Llama, local models via Ollama
- **Interview Analytics**: Post-interview analysis and improvement suggestions

## License

MIT
