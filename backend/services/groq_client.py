"""Groq API client for ultra-fast transcription and LLM suggestions.

Groq provides:
- Whisper transcription: ~50-100ms for 3-second chunks
- Llama 3.3 70B: 10x faster than other providers

This module is used by the Adaptive provider for maximum speed.
"""

import asyncio
import base64
import io
import json
import logging
import time
import wave
from typing import Optional

import httpx

from config import settings
from services.prompts import get_prompt, get_response_format, format_suggestion_for_display, DEFAULT_PROMPT
from services.turn_detector import TurnDetector, TurnDetectorConfig

logger = logging.getLogger(__name__)

# Groq API endpoints
GROQ_API_BASE = "https://api.groq.com/openai/v1"
GROQ_TRANSCRIPTION_URL = f"{GROQ_API_BASE}/audio/transcriptions"
GROQ_CHAT_URL = f"{GROQ_API_BASE}/chat/completions"

# Models
WHISPER_MODEL = "whisper-large-v3-turbo"  # Fast and accurate
LLAMA_MODEL = "llama-3.3-70b-versatile"  # 10x faster than alternatives


def pcm16_to_wav(pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
    """Convert raw PCM16 audio to WAV format for Groq API."""
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(2)  # 16-bit = 2 bytes
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()


class GroqTranscriptionClient:
    """Client for Groq Whisper transcription API.

    Ultra-fast transcription: ~50-100ms for 3-second audio chunks.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client: Optional[httpx.AsyncClient] = None
        self._request_count = 0
        self._last_request_time = 0

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
        return self._client

    async def transcribe(self, audio_bytes: bytes, sample_rate: int = 16000) -> Optional[str]:
        """Transcribe audio using Groq Whisper API.

        Args:
            audio_bytes: Raw PCM16 audio data
            sample_rate: Audio sample rate (default 16000 for Whisper)

        Returns:
            Transcribed text or None if failed
        """
        try:
            start_time = time.time()

            # Convert to WAV format
            wav_bytes = pcm16_to_wav(audio_bytes, sample_rate=sample_rate)

            client = await self._get_client()

            # Send to Groq
            files = {
                "file": ("audio.wav", wav_bytes, "audio/wav"),
                "model": (None, WHISPER_MODEL),
                "response_format": (None, "text"),
                "language": (None, "en"),
            }

            response = await client.post(GROQ_TRANSCRIPTION_URL, files=files)

            elapsed = (time.time() - start_time) * 1000
            self._request_count += 1
            self._last_request_time = time.time()

            if response.status_code == 200:
                transcript = response.text.strip()
                logger.info(f"[GROQ-WHISPER] Transcribed in {elapsed:.0f}ms: '{transcript[:50]}...'")
                return transcript
            else:
                logger.error(f"[GROQ-WHISPER] Error {response.status_code}: {response.text}")
                return None

        except Exception as e:
            logger.error(f"[GROQ-WHISPER] Transcription error: {e}")
            return None

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


class GroqLLMClient:
    """Client for Groq Llama suggestions.

    Ultra-fast LLM: Llama 3.3 70B is 10x faster than alternatives.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client: Optional[httpx.AsyncClient] = None
        self._system_prompt = ""
        self._prompt_key = DEFAULT_PROMPT
        self._request_count = 0

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
        return self._client

    def set_context(
        self,
        job_description: str = "",
        resume: str = "",
        work_experience: str = "",
        verbosity: str = "moderate",
        prompt_key: str = None,
    ):
        """Set the system prompt with interview context.

        Args:
            job_description: The job being interviewed for
            resume: Candidate's resume
            work_experience: Additional experience details
            verbosity: Response length (concise/moderate/detailed)
            prompt_key: Which prompt to use (candidate/coach/star)
        """
        self._prompt_key = prompt_key or DEFAULT_PROMPT
        self._system_prompt = get_prompt(
            prompt_key=self._prompt_key,
            job_description=job_description[:2000] if job_description else "",
            resume=resume[:2000] if resume else "",
            work_experience=work_experience[:2000] if work_experience else "",
            verbosity=verbosity,
        )

    async def get_suggestion(self, transcript: str) -> Optional[dict]:
        """Get a suggestion for the given transcript.

        Args:
            transcript: The interviewer's statement/question

        Returns:
            Dict with is_question, suggestion, and formatted_text, or None if failed
        """
        try:
            start_time = time.time()

            client = await self._get_client()

            payload = {
                "model": LLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": self._system_prompt},
                    {"role": "user", "content": f"The interviewer said: \"{transcript}\"\n\nAnalyze and respond in JSON format."}
                ],
                "temperature": 0.7,
                "max_tokens": 600,
                "response_format": {"type": "json_object"}
            }

            response = await client.post(GROQ_CHAT_URL, json=payload)

            elapsed = (time.time() - start_time) * 1000
            self._request_count += 1

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                logger.info(f"[GROQ-LLAMA] Suggestion in {elapsed:.0f}ms")

                result = json.loads(content)

                # Format the suggestion for display using the appropriate format
                if result.get("is_question") and result.get("suggestion"):
                    response_format = get_response_format(self._prompt_key)
                    formatted_text = format_suggestion_for_display(
                        result["suggestion"],
                        response_format
                    )
                    result["formatted_text"] = formatted_text

                return result
            else:
                logger.error(f"[GROQ-LLAMA] Error {response.status_code}: {response.text}")
                return None

        except Exception as e:
            logger.error(f"[GROQ-LLAMA] Suggestion error: {e}")
            return None

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


class GroqAdaptiveClient:
    """Combined Groq client for the Adaptive provider.

    Uses Groq for both transcription (Whisper) and suggestions (Llama).
    Implements Semantic Turn Detection to avoid jittery suggestions.

    Key features:
    - Instant transcription (~50-100ms) shown to user immediately
    - Accumulates transcripts until speaker finishes (silence + complete sentence)
    - Only generates suggestions when a complete "turn" is detected
    - Avoids false triggers from connective words and incomplete sentences
    """

    def __init__(self):
        self._connected = False
        self._transcription_client: Optional[GroqTranscriptionClient] = None
        self._llm_client: Optional[GroqLLMClient] = None
        self._gemini_fallback = None  # Lazy loaded
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._running = False

        # Semantic turn detection
        self._turn_detector: Optional[TurnDetector] = None

        # Transcript merging for overlapping chunks
        self._last_transcript = ""
        self._transcript_buffer = []

        # Frontend VAD speech timing (Option B1)
        self._frontend_is_speaking = True  # Assume speaking until told otherwise
        self._frontend_silence_ms = 0.0

    @property
    def is_connected(self) -> bool:
        return self._connected

    def update_speech_timing(self, is_speaking: bool, silence_ms: float) -> None:
        """Update speech timing from frontend VAD.

        This is used for more accurate turn detection - we wait for the
        frontend to signal that speech has ended before generating suggestions.
        """
        self._frontend_is_speaking = is_speaking
        self._frontend_silence_ms = silence_ms
        logger.debug(f"[GROQ-ADAPTIVE] Speech timing: speaking={is_speaking}, silence={silence_ms:.0f}ms")

    async def check_and_trigger_suggestion(self) -> None:
        """Check if conditions are met to trigger suggestion generation.

        This is called periodically when speech timing updates arrive,
        even if no audio is being sent (during silence).
        """
        if not self._connected or not self._turn_detector:
            return

        # Only check if using frontend VAD timing
        if not settings.use_speech_timing_for_turns:
            return

        # Check if frontend VAD says speech has ended with sufficient silence
        if not self._frontend_is_speaking and self._frontend_silence_ms >= settings.speech_silence_threshold_ms:
            # Check if we have accumulated content
            current_text = self._turn_detector.get_current_text()
            if current_text and len(current_text.split()) >= settings.turn_min_words:
                logger.info(f"[GROQ-ADAPTIVE] Triggering suggestion: silence={self._frontend_silence_ms:.0f}ms >= {settings.speech_silence_threshold_ms}ms")
                complete_text = self._turn_detector.force_complete()
                if complete_text:
                    await self._on_turn_complete(complete_text)

    async def connect(
        self,
        job_description: str = "",
        resume: str = "",
        work_experience: str = "",
        verbosity: str = "moderate",
        prompt_key: str = None,
    ) -> bool:
        """Initialize Groq clients.

        Args:
            job_description: The job being interviewed for
            resume: Candidate's resume
            work_experience: Additional experience details
            verbosity: Response length (concise/moderate/detailed)
            prompt_key: Which prompt style to use (candidate/coach/star)
        """
        try:
            groq_api_key = settings.groq_api_key

            if not groq_api_key:
                logger.error("[GROQ-ADAPTIVE] No GROQ_API_KEY configured")
                return False

            # Initialize clients
            self._transcription_client = GroqTranscriptionClient(groq_api_key)
            self._llm_client = GroqLLMClient(groq_api_key)

            # Set context for suggestions with prompt selection
            self._llm_client.set_context(
                job_description=job_description,
                resume=resume,
                work_experience=work_experience,
                verbosity=verbosity,
                prompt_key=prompt_key,
            )

            # Initialize semantic turn detector (if enabled)
            if settings.turn_detection_enabled:
                turn_config = TurnDetectorConfig(
                    pause_threshold_ms=800,
                    silence_threshold_ms=settings.turn_silence_threshold_ms,
                    min_words=settings.turn_min_words,
                    min_chars=10,
                )
                self._turn_detector = TurnDetector(
                    config=turn_config,
                    on_turn_complete=self._on_turn_complete,
                )

                # Option B1: Use frontend VAD for turn detection
                # DON'T start the internal monitoring loop - we'll manually trigger based on frontend VAD
                if settings.use_speech_timing_for_turns:
                    logger.info(f"[GROQ-ADAPTIVE] Turn detection with frontend VAD (silence={settings.speech_silence_threshold_ms}ms)")
                    # Don't call start() - we'll manually trigger turn completion
                else:
                    # Option A: Use turn_detector's internal monitoring (transcript timing)
                    await self._turn_detector.start()
                    logger.info(f"[GROQ-ADAPTIVE] Turn detection with transcript timing (silence={settings.turn_silence_threshold_ms}ms)")
            else:
                logger.info("[GROQ-ADAPTIVE] Turn detection disabled - suggestions on every chunk")

            self._connected = True
            self._running = True

            prompt_name = prompt_key or DEFAULT_PROMPT
            logger.info(f"[GROQ-ADAPTIVE] Connected with semantic turn detection (prompt: {prompt_name})")
            return True

        except Exception as e:
            logger.error(f"[GROQ-ADAPTIVE] Connection failed: {e}")
            return False

    async def send_audio(self, audio_data: bytes) -> None:
        """Process audio chunk with semantic turn detection.

        Flow:
        1. Transcribe immediately (~50-100ms) - fast feedback
        2. Send transcript to frontend for live display
        3. Add to TurnDetector for accumulation
        4. Check frontend VAD - only generate suggestion when speech actually ended
        """
        if not self._connected:
            return

        try:
            # Transcribe with Groq Whisper (instant feedback)
            transcript = await self._transcription_client.transcribe(audio_data)

            if not transcript or len(transcript.strip()) < 3:
                return

            # Merge with previous transcript (handle overlapping chunks)
            merged_transcript = self._merge_transcript(transcript)

            if not merged_transcript:
                return

            # Send transcript to frontend immediately (live display)
            await self._message_queue.put({
                "type": "conversation.item.input_audio_transcription.completed",
                "transcript": merged_transcript,
            })

            # Use semantic turn detection if enabled
            if self._turn_detector:
                # Add to turn detector buffer
                self._turn_detector.add_transcript(merged_transcript)

                # Check if frontend VAD says speech has ended with sufficient silence
                # This is more accurate than transcript-timing based detection
                if settings.use_speech_timing_for_turns:
                    if not self._frontend_is_speaking and self._frontend_silence_ms >= settings.speech_silence_threshold_ms:
                        # Frontend says speech ended - check if we have content and force complete
                        current_text = self._turn_detector.get_current_text()
                        if current_text and len(current_text.split()) >= settings.turn_min_words:
                            logger.info(f"[GROQ-ADAPTIVE] Frontend VAD: speech ended, silence={self._frontend_silence_ms:.0f}ms, forcing turn complete")
                            complete_text = self._turn_detector.force_complete()
                            if complete_text:
                                await self._on_turn_complete(complete_text)
                # If not using frontend VAD, turn_detector's internal monitoring handles it
            else:
                # No turn detection - generate suggestion immediately (legacy behavior)
                await self._on_turn_complete(merged_transcript)

        except Exception as e:
            logger.error(f"[GROQ-ADAPTIVE] Error processing audio: {e}")

    async def _on_turn_complete(self, complete_text: str) -> None:
        """Called when TurnDetector identifies a complete speaker turn.

        This is where we generate the AI suggestion, only after the
        interviewer has finished speaking.
        """
        logger.info(f"[GROQ-ADAPTIVE] Turn complete: '{complete_text[:100]}...'")

        # Reset transcript merging state for next turn
        # This prevents words from question 1 being incorrectly detected
        # as overlapping with question 2
        self._last_transcript = ""
        self._transcript_buffer = []

        try:
            # Get suggestion from Groq Llama
            suggestion_data = await self._llm_client.get_suggestion(complete_text)

            if suggestion_data and suggestion_data.get("is_question") and suggestion_data.get("suggestion"):
                # Use the pre-formatted text if available
                formatted = suggestion_data.get("formatted_text")

                if not formatted:
                    # Fallback formatting
                    suggestion = suggestion_data["suggestion"]
                    formatted = f"**Suggested Response:**\n{suggestion.get('response', '')}\n\n"

                    if suggestion.get('key_points'):
                        formatted += "**Key Points:**\n"
                        for point in suggestion['key_points']:
                            formatted += f"- {point}\n"
                        formatted += "\n"

                    if suggestion.get('follow_up'):
                        formatted += f"**If They Ask More:**\n{suggestion['follow_up']}"

                await self._message_queue.put({
                    "type": "response.text.done",
                    "text": formatted,
                })
                logger.info("[GROQ-ADAPTIVE] Suggestion sent to client")
            else:
                logger.info("[GROQ-ADAPTIVE] Not a question, no suggestion generated")

        except Exception as e:
            logger.error(f"[GROQ-ADAPTIVE] Error generating suggestion: {e}")

    def _merge_transcript(self, new_transcript: str) -> str:
        """Merge overlapping transcripts to avoid word duplication.

        When using overlapping chunks (0-4s, 3-7s, etc.), the same words
        may appear at the end of one chunk and start of the next.
        This function detects and removes such duplicates.
        """
        if not self._last_transcript:
            self._last_transcript = new_transcript
            return new_transcript

        # Look for overlap between end of last transcript and start of new
        last_words = self._last_transcript.split()[-5:]  # Last 5 words
        new_words = new_transcript.split()

        # Find overlap
        overlap_start = -1
        for i in range(min(len(last_words), len(new_words))):
            # Check if last N words of previous match first N words of new
            if last_words[-(i+1):] == new_words[:i+1]:
                overlap_start = i + 1

        if overlap_start > 0:
            # Remove overlapping words from new transcript
            merged = " ".join(new_words[overlap_start:])
        else:
            merged = new_transcript

        self._last_transcript = new_transcript
        return merged.strip() if merged.strip() else None

    async def _try_gemini_fallback(self, audio_data: bytes):
        """Fall back to Gemini if Groq fails."""
        try:
            if self._gemini_fallback is None:
                from services.gemini_client import GeminiClient
                self._gemini_fallback = GeminiClient()
                # Connect would need context, skip for now

            logger.warning("[GROQ-ADAPTIVE] Falling back to Gemini")
            # Could forward audio to Gemini here

        except Exception as e:
            logger.error(f"[GROQ-ADAPTIVE] Gemini fallback failed: {e}")

    async def receive_messages(self):
        """Yield messages from the queue."""
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
            pass

    async def disconnect(self):
        """Disconnect and cleanup."""
        self._connected = False
        self._running = False

        # Stop turn detector and process any remaining turn
        if self._turn_detector:
            remaining = self._turn_detector.force_complete()
            if remaining:
                logger.info(f"[GROQ-ADAPTIVE] Processing remaining turn on disconnect: '{remaining[:50]}...'")
                await self._on_turn_complete(remaining)
            # Only stop if it was started (Option A mode)
            if not settings.use_speech_timing_for_turns:
                await self._turn_detector.stop()
            stats = self._turn_detector.get_stats()
            logger.info(f"[GROQ-ADAPTIVE] Turn detector stats: {stats}")

        if self._transcription_client:
            await self._transcription_client.close()
        if self._llm_client:
            await self._llm_client.close()

        logger.info("[GROQ-ADAPTIVE] Disconnected")
