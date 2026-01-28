"""OpenAI Realtime API client for WebSocket communication."""

import asyncio
import json
import logging
import random
from typing import AsyncGenerator, Optional

import websockets
from websockets.client import WebSocketClientProtocol

from config import settings

logger = logging.getLogger(__name__)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"

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

## Important:
- Reference SPECIFIC details from the candidate's experience
- Use numbers and metrics when available
- Keep suggestions natural and conversational
- Adapt tone to match the interview style (technical vs behavioral)
"""

VERBOSITY_INSTRUCTIONS = {
    "concise": "Keep responses under 2 sentences. Bullet points only. No elaboration.",
    "moderate": "Provide 2-3 sentence suggestions with supporting points. Balanced detail.",
    "detailed": "Give comprehensive suggestions with full context, examples, and structure.",
}


def get_max_tokens(verbosity: str) -> int:
    """Get max response tokens based on verbosity setting."""
    return {
        "concise": 150,
        "moderate": 300,
        "detailed": 500,
    }.get(verbosity, 300)


def build_instructions(
    job_description: str,
    resume: str,
    work_experience: str,
    verbosity: str = "moderate",
) -> str:
    """Build the system instructions with user context."""
    verbosity_instructions = VERBOSITY_INSTRUCTIONS.get(
        verbosity, VERBOSITY_INSTRUCTIONS["moderate"]
    )

    return SYSTEM_INSTRUCTIONS_TEMPLATE.format(
        verbosity=verbosity,
        verbosity_instructions=verbosity_instructions,
        job_description=job_description or "(Not provided)",
        resume=resume or "(Not provided)",
        work_experience=work_experience or "(Not provided)",
    )


class OpenAIRealtimeClient:
    """Client for OpenAI Realtime API."""

    def __init__(self):
        self._ws: Optional[WebSocketClientProtocol] = None
        self._connected = False

    @property
    def is_connected(self) -> bool:
        """Check if connected to OpenAI."""
        return self._connected and self._ws is not None

    async def connect(
        self,
        job_description: str = "",
        resume: str = "",
        work_experience: str = "",
        verbosity: str = "moderate",
    ) -> bool:
        """Establish connection to OpenAI Realtime API."""
        try:
            headers = {
                "Authorization": f"Bearer {settings.openai_api_key}",
                "OpenAI-Beta": "realtime=v1",
            }

            self._ws = await websockets.connect(
                OPENAI_REALTIME_URL,
                extra_headers=headers,
            )
            self._connected = True

            # Send session configuration
            await self._send_session_update(
                job_description, resume, work_experience, verbosity
            )

            logger.info("Connected to OpenAI Realtime API")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to OpenAI: {e}")
            self._connected = False
            return False

    async def _send_session_update(
        self,
        job_description: str,
        resume: str,
        work_experience: str,
        verbosity: str,
    ) -> None:
        """Send session.update to configure the session."""
        if not self._ws:
            return

        instructions = build_instructions(
            job_description, resume, work_experience, verbosity
        )

        session_config = {
            "type": "session.update",
            "session": {
                "modalities": ["text"],
                "instructions": instructions,
                "input_audio_format": "pcm16",
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 700,
                },
                "temperature": 0.7,
                "max_response_output_tokens": get_max_tokens(verbosity),
            },
        }

        await self._ws.send(json.dumps(session_config))
        logger.debug("Sent session.update to OpenAI")

    async def send_audio(self, audio_data: bytes) -> None:
        """Send audio data to OpenAI."""
        if not self._ws or not self._connected:
            return

        try:
            # Send audio as input_audio_buffer.append
            import base64

            audio_b64 = base64.b64encode(audio_data).decode("utf-8")
            message = {
                "type": "input_audio_buffer.append",
                "audio": audio_b64,
            }
            await self._ws.send(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending audio: {e}")

    async def receive_messages(self) -> AsyncGenerator[dict, None]:
        """Receive messages from OpenAI."""
        if not self._ws:
            return

        try:
            async for message in self._ws:
                if isinstance(message, str):
                    yield json.loads(message)
        except websockets.exceptions.ConnectionClosed:
            logger.warning("OpenAI connection closed")
            self._connected = False
        except Exception as e:
            logger.error(f"Error receiving message: {e}")
            self._connected = False

    async def disconnect(self) -> None:
        """Close the connection to OpenAI."""
        if self._ws:
            await self._ws.close()
            self._ws = None
        self._connected = False
        logger.info("Disconnected from OpenAI Realtime API")


class MockOpenAIClient:
    """Mock client for testing without OpenAI API key."""

    # Sample interviewer questions for simulation
    MOCK_QUESTIONS = [
        "Tell me about yourself and your background.",
        "What interests you about this role?",
        "Can you describe a challenging project you worked on?",
        "How do you handle tight deadlines?",
        "What are your greatest strengths?",
        "Where do you see yourself in 5 years?",
        "Why are you leaving your current position?",
        "How do you handle conflicts with team members?",
    ]

    # Mock suggestions based on question patterns
    MOCK_SUGGESTIONS = {
        "yourself": {
            "response": "Start with your current role, then highlight 2-3 key achievements that align with this position. End with why you're excited about this opportunity.",
            "keyPoints": [
                "Lead with your most relevant experience",
                "Quantify achievements where possible",
                "Connect your background to the role",
            ],
            "followUp": "Be ready to elaborate on any specific project or achievement you mention.",
        },
        "interest": {
            "response": "Focus on the company's mission, the role's challenges, and how it aligns with your career goals.",
            "keyPoints": [
                "Research the company beforehand",
                "Mention specific aspects of the role",
                "Show genuine enthusiasm",
            ],
            "followUp": "Have specific examples of company news or products you admire.",
        },
        "challenging": {
            "response": "Use the STAR method: Situation, Task, Action, Result. Pick a project that shows problem-solving skills.",
            "keyPoints": [
                "Choose a relevant technical challenge",
                "Explain your specific contribution",
                "Quantify the positive outcome",
            ],
            "followUp": "Be prepared to dive into technical details if asked.",
        },
        "deadline": {
            "response": "Describe your prioritization process and give a specific example of delivering under pressure.",
            "keyPoints": [
                "Show you can break down large tasks",
                "Mention communication with stakeholders",
                "Highlight successful delivery",
            ],
            "followUp": "Discuss how you handle scope changes or blockers.",
        },
        "strength": {
            "response": "Choose strengths relevant to the role and back them up with specific examples.",
            "keyPoints": [
                "Pick 2-3 genuine strengths",
                "Provide concrete examples",
                "Tie them to job requirements",
            ],
            "followUp": "Be ready to discuss how you've developed these strengths.",
        },
        "default": {
            "response": "Take a moment to think, then provide a structured response with specific examples from your experience.",
            "keyPoints": [
                "Listen carefully to the full question",
                "Use specific examples",
                "Keep your answer focused and relevant",
            ],
            "followUp": "Ask for clarification if the question is unclear.",
        },
    }

    def __init__(self):
        self._connected = False
        self._audio_buffer = bytearray()
        self._audio_chunks_received = 0
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._running = False

    @property
    def is_connected(self) -> bool:
        """Check if mock client is connected."""
        return self._connected

    async def connect(
        self,
        job_description: str = "",
        resume: str = "",
        work_experience: str = "",
        verbosity: str = "moderate",
    ) -> bool:
        """Simulate connection to OpenAI."""
        self._connected = True
        self._running = True
        self._verbosity = verbosity
        logger.info("[MOCK] Connected to Mock OpenAI client")
        return True

    async def send_audio(self, audio_data: bytes) -> None:
        """Receive audio data and simulate transcription after enough chunks."""
        if not self._connected:
            return

        self._audio_buffer.extend(audio_data)
        self._audio_chunks_received += 1

        # Simulate transcription every ~50 chunks (roughly 2-3 seconds of audio)
        if self._audio_chunks_received >= 50:
            self._audio_chunks_received = 0
            self._audio_buffer.clear()

            # Randomly decide to "detect" a question
            if random.random() < 0.3:  # 30% chance to simulate a question
                question = random.choice(self.MOCK_QUESTIONS)
                await self._simulate_transcription(question)
                await self._simulate_suggestion(question)

    async def _simulate_transcription(self, text: str) -> None:
        """Queue a transcription message."""
        await self._message_queue.put({
            "type": "conversation.item.input_audio_transcription.completed",
            "transcript": text,
        })

    async def _simulate_suggestion(self, question: str) -> None:
        """Queue a suggestion based on the question."""
        # Find matching suggestion
        suggestion = self.MOCK_SUGGESTIONS["default"]
        question_lower = question.lower()

        for keyword, sugg in self.MOCK_SUGGESTIONS.items():
            if keyword in question_lower:
                suggestion = sugg
                break

        # Simulate some delay for "processing"
        await asyncio.sleep(0.5)

        # Build response text
        response_text = f"""**Suggested Response:**
{suggestion['response']}

**Key Points:**
{chr(10).join('• ' + point for point in suggestion['keyPoints'])}

**If They Ask More:**
{suggestion['followUp']}"""

        await self._message_queue.put({
            "type": "response.text.done",
            "text": response_text,
        })

    async def receive_messages(self) -> AsyncGenerator[dict, None]:
        """Yield messages from the mock queue."""
        try:
            while self._running:
                try:
                    message = await asyncio.wait_for(
                        self._message_queue.get(),
                        timeout=0.1
                    )
                    yield message
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            logger.debug("[MOCK] Receive task cancelled")

    async def disconnect(self) -> None:
        """Disconnect the mock client."""
        self._connected = False
        self._running = False
        self._audio_buffer.clear()
        logger.info("[MOCK] Disconnected from Mock OpenAI client")


def get_openai_client():
    """Factory function to get the appropriate OpenAI client.

    Deprecated: Use get_llm_client() instead for provider selection.
    """
    if settings.use_mock_openai:
        logger.info("Using Mock OpenAI client (USE_MOCK_OPENAI=true)")
        return MockOpenAIClient()
    else:
        logger.info("Using real OpenAI Realtime API client")
        return OpenAIRealtimeClient()


def get_llm_client(provider: str = None):
    """Factory function to get the appropriate LLM client based on provider.

    Args:
        provider: The LLM provider to use ('openai', 'gemini', or 'mock').
                 If None, uses the configured default from settings.

    Returns:
        An LLM client instance (OpenAIRealtimeClient, GeminiClient, or MockOpenAIClient).
    """
    # Determine which provider to use
    if provider is None:
        provider = settings.effective_provider

    provider = provider.lower()

    if provider == "mock":
        logger.info("Using Mock client")
        return MockOpenAIClient()
    elif provider == "gemini":
        # Import here to avoid circular imports and allow graceful fallback
        try:
            from services.gemini_client import GeminiClient
            logger.info("Using Gemini API client")
            return GeminiClient()
        except ImportError as e:
            logger.error(f"Failed to import GeminiClient: {e}")
            logger.warning("Falling back to Mock client")
            return MockOpenAIClient()
    elif provider == "openai":
        logger.info("Using OpenAI Realtime API client")
        return OpenAIRealtimeClient()
    else:
        logger.warning(f"Unknown provider '{provider}', falling back to Mock client")
        return MockOpenAIClient()
