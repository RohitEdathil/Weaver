"""WebSocket bridge between the browser and the converser's live session.

Mirrors the ADK live server: the browser sends ``LiveRequest`` JSON (text turns
or base64 audio blobs) and the server forwards every agent event back as a
``ConverserEvent``. Modelled on the reference implementation.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequest, LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.genai import types

import weaver.tracing as tracing
from weaver.converser import bus
from weaver.converser.agent import APP_NAME, USER_ID, runner, session_service
from weaver.converser.stream import to_events
from weaver.settings import settings

logger = logging.getLogger(__name__)


async def _ensure_session(session_id: str) -> None:
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if session is None:
        await session_service.create_session(
            app_name=APP_NAME, user_id=USER_ID, session_id=session_id
        )


def _run_config() -> RunConfig:
    return RunConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=settings.converser_voice,
                )
            )
        ),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        # gemini-3.8-live caps at a 128k-token window. Compress older turns at
        # ~78% and shrink back to ~62%, which also lifts the Live API's session
        # duration cap.
        context_window_compression=types.ContextWindowCompressionConfig(
            trigger_tokens=100000,
            sliding_window=types.SlidingWindow(target_tokens=80000),
        ),
    )


async def run(websocket: WebSocket, session_id: str) -> None:
    """Serve one converser live session over a WebSocket."""
    await websocket.accept()
    await _ensure_session(session_id)

    live_request_queue = LiveRequestQueue()
    run_config = _run_config()
    control_queue = bus.register(session_id)

    async def forward_events() -> None:
        async for event in runner.run_live(
            user_id=USER_ID,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            for out in to_events(event):
                await websocket.send_text(out.model_dump_json())

    async def forward_control() -> None:
        # Control events the visualizer tool raises, e.g. a canvas change.
        while True:
            event = await control_queue.get()
            await websocket.send_text(event.model_dump_json())

    async def process_messages() -> None:
        try:
            while True:
                data = await websocket.receive_text()
                live_request_queue.send(LiveRequest.model_validate_json(data))
        except WebSocketDisconnect:
            logger.info("Converser client disconnected for session %s", session_id)

    tasks = [
        asyncio.create_task(forward_events()),
        asyncio.create_task(forward_control()),
        asyncio.create_task(process_messages()),
    ]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
    try:
        for task in done:
            task.result()
    except WebSocketDisconnect:
        logger.info("Converser websocket closed for session %s", session_id)
    except Exception:  # noqa: BLE001 - log and drop the connection
        logger.exception("Converser live session failed for %s", session_id)
    finally:
        # Backstop for a cancelled run: ADK finalizes the trace itself on a
        # graceful end, but not when the loop is torn down early. Idempotent.
        tracing.finalize_live_session(session_id)
        bus.unregister(session_id)
        live_request_queue.close()
        for task in pending:
            task.cancel()
