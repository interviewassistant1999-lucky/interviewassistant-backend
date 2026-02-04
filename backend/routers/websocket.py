"""WebSocket endpoint for relaying between browser and OpenAI."""

import asyncio
import json
import logging
import re
import time
import uuid
from datetime import datetime
from typing import Any, List, Optional, Tuple

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.messages import (
    ConnectionStatusMessage,
    ErrorMessage,
    PongMessage,
    SessionReadyMessage,
    SuggestionMessage,
    TranscriptDeltaMessage,
)
from config import settings
from services.openai_relay import get_openai_client, get_llm_client
from services.session_manager import session_manager
from services.auth_service import auth_service
from services.encryption import decrypt_api_key
from db.database import AsyncSessionLocal
from db.models import User, InterviewSession, UserAPIKey, LLMProvider

logger = logging.getLogger(__name__)

router = APIRouter()


def parse_suggestion_response(text: str) -> Tuple[str, List[str], str]:
    """Parse the structured response from LLM into separate fields.

    Supports multiple formats:

    Candidate Mode (new):
    **Say First:** <opening line>
    **Your Story:** <battle story>
    **Drop These:** <metrics>
    **Pro Tip:** <tactical advice>

    Coach Mode (original):
    **Suggested Response:**
    <response text>
    **Key Points:**
    - point 1
    - point 2
    **If They Ask More:**
    <follow-up text>

    Returns:
        Tuple of (response, key_points, follow_up)
    """
    response = ""
    key_points: List[str] = []
    follow_up = ""

    # Normalize line endings
    text = text.replace('\r\n', '\n')

    # Check if this is Candidate Mode format (has "Say First" or "Your Story")
    is_candidate_mode = "**Say First:**" in text or "**Your Story:**" in text

    if is_candidate_mode:
        # Parse Candidate Mode format
        parts = []

        # Extract "Say First" section
        say_first_match = re.search(
            r'\*\*Say First[:\*]*\*?\*?\s*(.*?)(?=\n\*\*|\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if say_first_match:
            opening = say_first_match.group(1).strip()
            if opening:
                parts.append(f"**Start with:** {opening}")

        # Extract "Your Story" section
        story_match = re.search(
            r'\*\*Your Story[:\*]*\*?\*?\s*(.*?)(?=\n\*\*|\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if story_match:
            story = story_match.group(1).strip()
            if story:
                parts.append(f"\n**Then say:** {story}")

        # Extract "Drop These" section (metrics) -> becomes key_points
        metrics_match = re.search(
            r'\*\*Drop These[:\*]*\*?\*?\s*(.*?)(?=\n\*\*|\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if metrics_match:
            metrics = metrics_match.group(1).strip()
            # Split by | or newlines
            if '|' in metrics:
                key_points = [m.strip() for m in metrics.split('|') if m.strip()]
            else:
                key_points = [m.strip() for m in metrics.split('\n') if m.strip()]

        # Extract "Pro Tip" section -> becomes follow_up
        tip_match = re.search(
            r'\*\*Pro Tip[:\*]*\*?\*?\s*(.*?)(?=\n\*\*|\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if tip_match:
            follow_up = tip_match.group(1).strip()

        response = '\n'.join(parts) if parts else text.strip()

    else:
        # Parse Coach Mode format (original)

        # Try to extract "Suggested Response" section
        response_match = re.search(
            r'\*\*Suggested Response[:\*]*\*?\*?\s*\n(.*?)(?=\n\*\*Key Points|\n\*\*If They Ask|\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if response_match:
            response = response_match.group(1).strip()

        # Try to extract "Key Points" section
        key_points_match = re.search(
            r'\*\*Key Points[:\*]*\*?\*?\s*\n(.*?)(?=\n\*\*If They Ask|\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if key_points_match:
            points_text = key_points_match.group(1).strip()
            # Extract bullet points (lines starting with -, *, •, or numbers)
            for line in points_text.split('\n'):
                line = line.strip()
                # Remove leading bullet markers
                cleaned = re.sub(r'^[-*•]\s*|^\d+[.)]\s*', '', line).strip()
                if cleaned:
                    key_points.append(cleaned)

        # Try to extract "If They Ask More" section
        follow_up_match = re.search(
            r'\*\*If They Ask More[:\*]*\*?\*?\s*\n(.*?)(?=\Z)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        if follow_up_match:
            follow_up = follow_up_match.group(1).strip()

        # If no structured format found, use the entire text as response
        if not response and not key_points and not follow_up:
            response = text.strip()

    return response, key_points, follow_up


# Silence threshold for detecting new turns (in seconds)
# Option A (legacy): Based on transcript arrival time
# If more than this much time passes between transcripts, it's a new turn
# Must be greater than audio_buffer_seconds (3s) to avoid false triggers
NEW_TURN_SILENCE_THRESHOLD = 5.0


class ConnectionState:
    """State for a single WebSocket connection."""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.session_id: Optional[str] = None
        self.openai_client: Optional[Any] = None  # OpenAIRealtimeClient or MockOpenAIClient
        self.receive_task: Optional[asyncio.Task] = None
        self.current_speaker: str = "interviewer"  # Track current speaker for transcripts
        self.last_transcript_time: float = 0.0  # Track last transcript time for new turn detection (Option A)

        # Option B1: Speech timing from frontend VAD
        self.speech_end_timestamp: Optional[float] = None  # When speech last ended (from frontend)
        self.silence_duration_ms: float = 0.0  # Current silence duration (from frontend)
        self.silence_before_speech_ms: float = 0.0  # Captured silence duration before speech resumed
        self.was_speaking: bool = True  # Track previous speaking state to detect transitions

        # User authentication
        self.user_id: Optional[str] = None  # Authenticated user ID
        self.user_api_key: Optional[str] = None  # User's decrypted API key for the provider

        # Database session tracking
        self.db_session_id: Optional[str] = None  # ID of InterviewSession in database
        self.session_start_time: Optional[datetime] = None
        self.provider_used: Optional[str] = None

        # Accumulated transcript and suggestions for saving to DB
        self.transcript_entries: List[dict] = []
        self.suggestion_entries: List[dict] = []
        self.context: dict = {}  # Job description, resume, etc.


async def authenticate_websocket(token: Optional[str]) -> Optional[str]:
    """Authenticate WebSocket connection using JWT token.

    Args:
        token: JWT token from query params

    Returns:
        User ID if valid, None otherwise
    """
    if not token:
        return None

    user_id = auth_service.decode_token(token)
    if not user_id:
        return None

    # Verify user exists
    async with AsyncSessionLocal() as db:
        user = await auth_service.get_user_by_id(db, user_id)
        if not user:
            return None

    return user_id


async def get_user_api_key(user_id: str, provider: str) -> Optional[str]:
    """Get user's decrypted API key for a provider.

    Args:
        user_id: The user's ID
        provider: LLM provider name (groq, openai, gemini)

    Returns:
        Decrypted API key or None if not found
    """
    try:
        # Map provider names to enum
        provider_map = {
            'adaptive': LLMProvider.GROQ,
            'groq': LLMProvider.GROQ,
            'openai': LLMProvider.OPENAI,
            'gemini': LLMProvider.GEMINI,
        }

        llm_provider = provider_map.get(provider.lower())
        if not llm_provider:
            return None

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(UserAPIKey)
                .where(UserAPIKey.user_id == user_id)
                .where(UserAPIKey.provider == llm_provider)
            )
            key_record = result.scalar_one_or_none()

            if key_record and settings.encryption_key:
                return decrypt_api_key(key_record.encrypted_key)

    except Exception as e:
        logger.error(f"[WS] Error getting user API key: {e}")

    return None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """Main WebSocket endpoint for interview sessions.

    Args:
        websocket: The WebSocket connection
        token: Optional JWT token for authentication
    """
    logger.info("[WS] ===== New WebSocket connection =====")
    await websocket.accept()
    logger.info("[WS] WebSocket accepted")
    state = ConnectionState(websocket)
    audio_message_count = 0

    # Authenticate if token provided
    if token:
        user_id = await authenticate_websocket(token)
        if user_id:
            state.user_id = user_id
            logger.info(f"[WS] Authenticated user: {user_id}")
        else:
            logger.warning("[WS] Invalid authentication token")
    else:
        logger.info("[WS] No authentication token provided (anonymous session)")

    try:
        while True:
            # Receive message from client
            message = await websocket.receive()

            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    # Binary audio data
                    audio_message_count += 1
                    if audio_message_count == 1:
                        logger.info(f"[WS] ===== First audio message received! Size: {len(message['bytes'])} bytes =====")
                    elif audio_message_count % 50 == 0:
                        logger.info(f"[WS] Audio messages received: {audio_message_count}")
                    await handle_audio_data(state, message["bytes"])
                elif "text" in message:
                    # JSON message
                    data = json.loads(message["text"])
                    msg_type = data.get("type", "unknown")
                    logger.info(f"[WS] JSON message received: type={msg_type}")
                    await handle_json_message(state, data)

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected: {state.session_id} (total audio messages: {audio_message_count})")
    except Exception as e:
        logger.error(f"[WS] !!!!! WebSocket error: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"[WS] Traceback:\n{traceback.format_exc()}")
        try:
            error_msg = ErrorMessage(
                code="CONN_002",
                message="Connection error occurred",
                recoverable=False,
            )
            await websocket.send_text(error_msg.model_dump_json())
        except Exception:
            pass
    finally:
        logger.info(f"[WS] Cleaning up connection...")
        await cleanup_connection(state)
        logger.info(f"[WS] Connection cleanup complete")


async def handle_json_message(state: ConnectionState, data: dict) -> None:
    """Handle incoming JSON messages from client."""
    msg_type = data.get("type")

    if msg_type == "session.start":
        await handle_session_start(state, data)
    elif msg_type == "session.end":
        await handle_session_end(state)
    elif msg_type == "verbosity.change":
        await handle_verbosity_change(state, data)
    elif msg_type == "ping":
        await handle_ping(state, data)
    elif msg_type == "speaker.update":
        await handle_speaker_update(state, data)
    elif msg_type == "speech.timing":
        await handle_speech_timing(state, data)
    else:
        logger.warning(f"Unknown message type: {msg_type}")


async def handle_session_start(state: ConnectionState, data: dict) -> None:
    """Start a new interview session."""
    logger.info(f"[SESSION] ===== Starting new session =====")

    context = data.get("context", {})
    verbosity = data.get("verbosity", "moderate")
    provider = data.get("provider")  # Can be 'openai', 'gemini', 'adaptive', or 'mock'
    prompt_key = data.get("promptKey")  # Can be 'candidate', 'coach', or 'star'

    logger.info(f"[SESSION] Provider requested: {provider}")
    logger.info(f"[SESSION] Prompt style: {prompt_key or 'default (candidate)'}")
    logger.info(f"[SESSION] Verbosity: {verbosity}")
    logger.info(f"[SESSION] Context - Job desc: {len(context.get('jobDescription', ''))} chars")
    logger.info(f"[SESSION] Context - Resume: {len(context.get('resume', ''))} chars")
    logger.info(f"[SESSION] Context - Work exp: {len(context.get('workExperience', ''))} chars")
    logger.info(f"[SESSION] User ID: {state.user_id or 'anonymous'}")

    # Store context for later database saving
    state.context = context
    state.provider_used = provider
    state.session_start_time = datetime.utcnow()

    # Get user's API key if authenticated
    user_api_key = None
    if state.user_id and provider and provider.lower() != 'mock':
        user_api_key = await get_user_api_key(state.user_id, provider)
        if user_api_key:
            state.user_api_key = user_api_key
            logger.info(f"[SESSION] Using user's {provider} API key")
        else:
            # User doesn't have an API key for this provider
            logger.warning(f"[SESSION] User has no API key for {provider}")
            error_msg = ErrorMessage(
                code="API_KEY_MISSING",
                message=f"No API key found for {provider}. Please add your API key in Settings.",
                recoverable=False,
            )
            await state.websocket.send_text(error_msg.model_dump_json())
            return

    # Create in-memory session
    session = session_manager.create_session(
        job_description=context.get("jobDescription", ""),
        resume=context.get("resume", ""),
        work_experience=context.get("workExperience", ""),
        verbosity=verbosity,
    )
    state.session_id = session.id
    logger.info(f"[SESSION] Session created: {session.id}")

    # Connect to LLM provider with user's API key
    logger.info(f"[SESSION] Getting LLM client...")
    state.openai_client = get_llm_client(provider, api_key=user_api_key)
    provider_name = provider or "default"
    logger.info(f"[SESSION] LLM client obtained: {type(state.openai_client).__name__}")

    logger.info(f"[SESSION] Connecting to LLM provider...")
    connected = await state.openai_client.connect(
        job_description=session.context.job_description,
        resume=session.context.resume,
        work_experience=session.context.work_experience,
        verbosity=verbosity,
        prompt_key=prompt_key,
    )
    logger.info(f"[SESSION] LLM connection result: {connected}")

    if connected:
        # Start receiving from LLM provider in background
        logger.info(f"[SESSION] Starting receive_from_openai background task...")
        state.receive_task = asyncio.create_task(
            receive_from_openai(state)
        )
        logger.info(f"[SESSION] Background task started")

        # Send ready message
        ready_msg = SessionReadyMessage()
        await state.websocket.send_text(ready_msg.model_dump_json())
        logger.info(f"[SESSION] Sent session.ready message to client")

        # Send connection status
        status_msg = ConnectionStatusMessage(status="connected")
        await state.websocket.send_text(status_msg.model_dump_json())
        logger.info(f"[SESSION] Sent connection.status=connected to client")

        logger.info(f"[SESSION] ===== Session started successfully: {session.id} (provider: {provider_name}) =====")
    else:
        logger.error(f"[SESSION] !!!!! Failed to connect to LLM provider: {provider_name}")
        error_msg = ErrorMessage(
            code="API_001",
            message=f"Failed to connect to LLM provider ({provider_name})",
            recoverable=True,
        )
        await state.websocket.send_text(error_msg.model_dump_json())


async def save_session_to_db(state: ConnectionState) -> Optional[str]:
    """Save session data to the database.

    Args:
        state: Connection state with session data

    Returns:
        Database session ID or None if failed
    """
    if not state.user_id:
        logger.info("[SESSION] Skipping DB save - no authenticated user")
        return None

    if not state.transcript_entries and not state.suggestion_entries:
        logger.info("[SESSION] Skipping DB save - no content to save")
        return None

    try:
        async with AsyncSessionLocal() as db:
            # Calculate duration
            duration_seconds = 0
            if state.session_start_time:
                duration_seconds = int((datetime.utcnow() - state.session_start_time).total_seconds())

            # Create database session record
            db_session = InterviewSession(
                user_id=state.user_id,
                job_description=state.context.get("jobDescription"),
                resume=state.context.get("resume"),
                work_experience=state.context.get("workExperience"),
                transcript=state.transcript_entries,
                suggestions=state.suggestion_entries,
                duration_seconds=duration_seconds,
                provider_used=state.provider_used,
                created_at=state.session_start_time or datetime.utcnow(),
                ended_at=datetime.utcnow(),
            )
            db.add(db_session)
            await db.commit()

            logger.info(f"[SESSION] Saved to database: {db_session.id} ({len(state.transcript_entries)} transcripts, {len(state.suggestion_entries)} suggestions, {duration_seconds}s)")
            return db_session.id

    except Exception as e:
        logger.error(f"[SESSION] Failed to save to database: {e}")
        import traceback
        logger.error(f"[SESSION] Traceback:\n{traceback.format_exc()}")
        return None


async def handle_session_end(state: ConnectionState) -> None:
    """End the current session."""
    logger.info(f"[SESSION] Ending session: {state.session_id}")

    # Save session to database before clearing
    if state.user_id and (state.transcript_entries or state.suggestion_entries):
        db_session_id = await save_session_to_db(state)
        if db_session_id:
            state.db_session_id = db_session_id

    if state.session_id:
        session_manager.clear_session(state.session_id)
        logger.info(f"[SESSION] In-memory session cleared: {state.session_id}")

    if state.openai_client:
        await state.openai_client.disconnect()

    if state.receive_task:
        state.receive_task.cancel()
        try:
            await state.receive_task
        except asyncio.CancelledError:
            pass

    state.session_id = None
    state.openai_client = None
    state.receive_task = None


async def handle_verbosity_change(state: ConnectionState, data: dict) -> None:
    """Update verbosity setting."""
    if state.session_id:
        verbosity = data.get("verbosity", "moderate")
        session_manager.set_verbosity(state.session_id, verbosity)
        logger.debug(f"Verbosity changed to: {verbosity}")


async def handle_ping(state: ConnectionState, data: dict) -> None:
    """Respond to ping with pong."""
    timestamp = data.get("timestamp", 0)
    pong_msg = PongMessage(
        timestamp=timestamp,
        serverTime=int(time.time() * 1000),
    )
    await state.websocket.send_text(pong_msg.model_dump_json())


async def handle_speaker_update(state: ConnectionState, data: dict) -> None:
    """Update the current speaker for transcript labeling."""
    speaker = data.get("speaker", "interviewer")
    if speaker in ("user", "interviewer"):
        state.current_speaker = speaker
        logger.debug(f"[WS] Speaker updated to: {speaker}")


async def handle_speech_timing(state: ConnectionState, data: dict) -> None:
    """Update speech timing from frontend VAD for Option B1 turn detection."""
    is_speaking = data.get("isSpeaking", True)
    silence_ms = data.get("silenceDurationMs", 0.0)

    # Detect transition from silence to speech (speech just resumed)
    # Capture the silence duration that occurred before speech resumed
    if is_speaking and not state.was_speaking:
        # Speech just resumed - capture how long the silence was
        state.silence_before_speech_ms = state.silence_duration_ms
        logger.info(f"[WS] Speech resumed after {state.silence_before_speech_ms:.0f}ms of silence")

    # Update current state
    state.silence_duration_ms = silence_ms
    state.was_speaking = is_speaking

    # Track if speech just ended
    if not is_speaking and state.speech_end_timestamp is None:
        state.speech_end_timestamp = time.time()
    elif is_speaking:
        state.speech_end_timestamp = None  # Reset when speech resumes

    # Pass to LLM client for AI suggestion timing AND trigger check
    # This is critical because audio chunks are NOT sent during silence
    if state.openai_client and hasattr(state.openai_client, 'update_speech_timing'):
        state.openai_client.update_speech_timing(is_speaking, silence_ms)

    # Also trigger suggestion check if LLM client supports it
    # This handles the case where silence threshold is reached but no audio is being sent
    if state.openai_client and hasattr(state.openai_client, 'check_and_trigger_suggestion'):
        await state.openai_client.check_and_trigger_suggestion()

    logger.debug(f"[WS] Speech timing: speaking={is_speaking}, silence={silence_ms:.0f}ms, beforeSpeech={state.silence_before_speech_ms:.0f}ms")


async def handle_audio_data(state: ConnectionState, audio_bytes: bytes) -> None:
    """Forward audio data to LLM client."""
    if not state.openai_client:
        logger.warning("[WS-AUDIO] No LLM client available!")
        return
    if not state.openai_client.is_connected:
        logger.warning("[WS-AUDIO] LLM client not connected!")
        return
    await state.openai_client.send_audio(audio_bytes)


async def receive_from_openai(state: ConnectionState) -> None:
    """Background task to receive messages from LLM and forward to client."""
    logger.info("[WS-RECV] ===== receive_from_openai task started =====")

    if not state.openai_client:
        logger.error("[WS-RECV] No LLM client available!")
        return

    current_transcript_id: Optional[str] = None
    message_count = 0

    try:
        logger.info("[WS-RECV] Starting to receive messages from LLM client...")
        async for message in state.openai_client.receive_messages():
            message_count += 1
            event_type = message.get("type", "")
            logger.info(f"[WS-RECV] ===== Message #{message_count} from LLM: type={event_type} =====")

            if event_type == "conversation.item.input_audio_transcription.completed":
                # Transcription completed
                transcript = message.get("transcript", "")
                entry_id = str(uuid.uuid4())
                speaker = state.current_speaker  # Use detected speaker
                logger.info(f"[WS-RECV] TRANSCRIPT received from {speaker}: '{transcript[:100]}...'")

                # Detect if this is a new turn
                current_time = time.time()
                is_new_turn = False

                if settings.use_speech_timing_for_turns:
                    # Option B1: Use frontend VAD speech timing (more accurate)
                    # Check if there was significant silence BEFORE this speech started
                    # We use silence_before_speech_ms which captures the silence duration
                    # at the moment speech resumed (before it was reset to 0)
                    if state.silence_before_speech_ms >= settings.speech_silence_threshold_ms:
                        is_new_turn = True
                        logger.info(f"[WS-RECV] New turn detected (B1 VAD silence before speech: {state.silence_before_speech_ms:.0f}ms)")
                        # Reset after using it so we don't mark every transcript as new turn
                        state.silence_before_speech_ms = 0
                    elif state.last_transcript_time == 0:
                        # First transcript is always a new turn
                        is_new_turn = True
                else:
                    # Option A (legacy): Use transcript arrival time
                    if state.last_transcript_time > 0:
                        silence_duration = current_time - state.last_transcript_time
                        if silence_duration >= NEW_TURN_SILENCE_THRESHOLD:
                            is_new_turn = True
                            logger.info(f"[WS-RECV] New turn detected (Option A silence: {silence_duration:.1f}s)")
                    else:
                        # First transcript is always a new turn
                        is_new_turn = True

                state.last_transcript_time = current_time

                # Add to session
                if state.session_id:
                    session_manager.add_transcript_entry(
                        state.session_id,
                        entry_id,
                        speaker,
                        transcript,
                        is_final=True,
                    )
                    logger.info(f"[WS-RECV] Transcript added to session (speaker: {speaker}, newTurn: {is_new_turn})")

                # Accumulate for database saving
                state.transcript_entries.append({
                    "id": entry_id,
                    "speaker": speaker,
                    "text": transcript,
                    "timestamp": current_time,
                    "isNewTurn": is_new_turn,
                })

                # Send to client
                delta_msg = TranscriptDeltaMessage(
                    id=entry_id,
                    speaker=speaker,
                    text=transcript,
                    isFinal=True,
                    isNewTurn=is_new_turn,
                )
                logger.info(f"[WS-RECV] Sending transcript to client WebSocket...")
                await state.websocket.send_text(delta_msg.model_dump_json())
                logger.info(f"[WS-RECV] Transcript SENT to client!")

            elif event_type == "response.text.delta":
                # Streaming text response
                delta = message.get("delta", "")
                if not current_transcript_id:
                    current_transcript_id = str(uuid.uuid4())
                logger.info(f"[WS-RECV] Text delta received: '{delta[:50]}...'")

            elif event_type == "response.text.done":
                # Response complete - parse and send as suggestion
                text = message.get("text", "")
                logger.info(f"[WS-RECV] SUGGESTION received: '{text[:100]}...'")

                if text:
                    # Parse the structured response into separate fields
                    response, key_points, follow_up = parse_suggestion_response(text)
                    logger.info(f"[WS-RECV] Parsed suggestion: response={len(response)} chars, {len(key_points)} key points, follow_up={len(follow_up)} chars")

                    suggestion_id = str(uuid.uuid4())
                    suggestion_msg = SuggestionMessage(
                        id=suggestion_id,
                        response=response,
                        keyPoints=key_points,
                        followUp=follow_up,
                    )
                    logger.info(f"[WS-RECV] Sending suggestion to client WebSocket...")
                    await state.websocket.send_text(suggestion_msg.model_dump_json())
                    logger.info(f"[WS-RECV] Suggestion SENT to client!")

                    # Accumulate for database saving
                    state.suggestion_entries.append({
                        "id": suggestion_id,
                        "response": response,
                        "keyPoints": key_points,
                        "followUp": follow_up,
                        "timestamp": time.time(),
                    })
                current_transcript_id = None

            elif event_type == "error":
                error = message.get("error", {})
                logger.error(f"[WS-RECV] ERROR from LLM: {error}")
                error_msg = ErrorMessage(
                    code="API_003",
                    message=error.get("message", "LLM error"),
                    recoverable=True,
                )
                await state.websocket.send_text(error_msg.model_dump_json())

            elif event_type in ("rate_limit.status", "rate_limit.update"):
                # Forward rate limit messages directly to client (dev mode)
                logger.info(f"[WS-RECV] Rate limit message: {event_type}")
                await state.websocket.send_text(json.dumps(message))

    except asyncio.CancelledError:
        logger.info(f"[WS-RECV] Task cancelled after {message_count} messages")
    except Exception as e:
        logger.error(f"[WS-RECV] !!!!! ERROR: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"[WS-RECV] Traceback:\n{traceback.format_exc()}")


async def cleanup_connection(state: ConnectionState) -> None:
    """Clean up connection resources."""
    # Save session to database if not already saved
    if state.user_id and state.session_id and not state.db_session_id:
        if state.transcript_entries or state.suggestion_entries:
            logger.info("[WS] Saving session on disconnect...")
            await save_session_to_db(state)

    if state.receive_task:
        state.receive_task.cancel()
        try:
            await state.receive_task
        except asyncio.CancelledError:
            pass

    if state.openai_client:
        await state.openai_client.disconnect()

    if state.session_id:
        session_manager.clear_session(state.session_id)
