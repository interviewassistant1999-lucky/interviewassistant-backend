"""WebSocket endpoint for relaying between browser and OpenAI."""

import asyncio
import json
import logging
import re
import time
import uuid
from typing import Any, List, Optional, Tuple

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models.messages import (
    ConnectionStatusMessage,
    ErrorMessage,
    PongMessage,
    SessionReadyMessage,
    SuggestionMessage,
    TranscriptDeltaMessage,
)
from services.openai_relay import get_openai_client, get_llm_client
from services.session_manager import session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


def parse_suggestion_response(text: str) -> Tuple[str, List[str], str]:
    """Parse the structured response from LLM into separate fields.

    Expected format:
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


class ConnectionState:
    """State for a single WebSocket connection."""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.session_id: Optional[str] = None
        self.openai_client: Optional[Any] = None  # OpenAIRealtimeClient or MockOpenAIClient
        self.receive_task: Optional[asyncio.Task] = None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for interview sessions."""
    logger.info("[WS] ===== New WebSocket connection =====")
    await websocket.accept()
    logger.info("[WS] WebSocket accepted")
    state = ConnectionState(websocket)
    audio_message_count = 0

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
    else:
        logger.warning(f"Unknown message type: {msg_type}")


async def handle_session_start(state: ConnectionState, data: dict) -> None:
    """Start a new interview session."""
    logger.info(f"[SESSION] ===== Starting new session =====")

    context = data.get("context", {})
    verbosity = data.get("verbosity", "moderate")
    provider = data.get("provider")  # Can be 'openai', 'gemini', or 'mock'

    logger.info(f"[SESSION] Provider requested: {provider}")
    logger.info(f"[SESSION] Verbosity: {verbosity}")
    logger.info(f"[SESSION] Context - Job desc: {len(context.get('jobDescription', ''))} chars")
    logger.info(f"[SESSION] Context - Resume: {len(context.get('resume', ''))} chars")
    logger.info(f"[SESSION] Context - Work exp: {len(context.get('workExperience', ''))} chars")

    # Create session
    session = session_manager.create_session(
        job_description=context.get("jobDescription", ""),
        resume=context.get("resume", ""),
        work_experience=context.get("workExperience", ""),
        verbosity=verbosity,
    )
    state.session_id = session.id
    logger.info(f"[SESSION] Session created: {session.id}")

    # Connect to LLM provider (OpenAI, Gemini, or Mock)
    logger.info(f"[SESSION] Getting LLM client...")
    state.openai_client = get_llm_client(provider)
    provider_name = provider or "default"
    logger.info(f"[SESSION] LLM client obtained: {type(state.openai_client).__name__}")

    logger.info(f"[SESSION] Connecting to LLM provider...")
    connected = await state.openai_client.connect(
        job_description=session.context.job_description,
        resume=session.context.resume,
        work_experience=session.context.work_experience,
        verbosity=verbosity,
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


async def handle_session_end(state: ConnectionState) -> None:
    """End the current session."""
    if state.session_id:
        session_manager.clear_session(state.session_id)
        logger.info(f"Session ended: {state.session_id}")

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
                logger.info(f"[WS-RECV] TRANSCRIPT received: '{transcript[:100]}...'")

                # Add to session
                if state.session_id:
                    session_manager.add_transcript_entry(
                        state.session_id,
                        entry_id,
                        "interviewer",  # Assume input is interviewer
                        transcript,
                        is_final=True,
                    )
                    logger.info(f"[WS-RECV] Transcript added to session")

                # Send to client
                delta_msg = TranscriptDeltaMessage(
                    id=entry_id,
                    speaker="interviewer",
                    text=transcript,
                    isFinal=True,
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

                    suggestion_msg = SuggestionMessage(
                        id=str(uuid.uuid4()),
                        response=response,
                        keyPoints=key_points,
                        followUp=follow_up,
                    )
                    logger.info(f"[WS-RECV] Sending suggestion to client WebSocket...")
                    await state.websocket.send_text(suggestion_msg.model_dump_json())
                    logger.info(f"[WS-RECV] Suggestion SENT to client!")
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

    except asyncio.CancelledError:
        logger.info(f"[WS-RECV] Task cancelled after {message_count} messages")
    except Exception as e:
        logger.error(f"[WS-RECV] !!!!! ERROR: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"[WS-RECV] Traceback:\n{traceback.format_exc()}")


async def cleanup_connection(state: ConnectionState) -> None:
    """Clean up connection resources."""
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
