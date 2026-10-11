"""Turn the agent's ADK event stream into UI-friendly events."""

from __future__ import annotations

from typing import Any, AsyncIterator

from google.adk.agents._streaming_mode import StreamingMode
from google.adk.agents.run_config import RunConfig
from google.genai import types

from weaver.visualizer.agent import APP_NAME, USER_ID, runner, session_service
from weaver.visualizer.events import (
    ControlEvent,
    DoneEvent,
    ErrorEvent,
    Event,
    TextEvent,
    ToolCallEvent,
    ToolResultEvent,
)

# Tools that mutate the canvas; used to decide when to emit a ``canvas`` event.
CODE_TOOLS = frozenset({"write_code", "apply_patch"})


def _text_of(event: Any) -> str:
    content = getattr(event, "content", None)
    if not content or not content.parts:
        return ""
    return "".join(
        part.text for part in content.parts if part.text and not part.thought
    )


async def stream(session_id: str, message: str) -> AsyncIterator[Event]:
    """Run one user turn and yield UI-friendly events."""
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if session is None:
        yield ErrorEvent(message="Session not found")
        return

    new_message = types.Content(role="user", parts=[types.Part(text=message)])
    run_config = RunConfig(streaming_mode=StreamingMode.SSE)

    emitted_partial = False
    code_changed = False

    try:
        async for event in runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=new_message,
            run_config=run_config,
        ):
            # Partial events carry incomplete function calls (empty args);
            # only the non-partial event holds the full call.
            if not event.partial:
                for call in event.get_function_calls():
                    yield ToolCallEvent(name=call.name, args=_jsonable(call.args))

            for response in event.get_function_responses():
                if response.name in CODE_TOOLS:
                    code_changed = True
                yield ToolResultEvent(
                    name=response.name, result=_jsonable(response.response)
                )

            if event.error_code:
                yield ErrorEvent(message=event.error_message or event.error_code)

            text = _text_of(event)
            if text:
                if event.partial:
                    emitted_partial = True
                    yield TextEvent(text=text, partial=True)
                else:
                    if not emitted_partial:
                        yield TextEvent(text=text, partial=False)
                    emitted_partial = False
    except Exception as exc:  # noqa: BLE001 - surfaced to the client as an event
        yield ErrorEvent(message=f"{type(exc).__name__}: {exc}")
        return

    if code_changed:
        yield ControlEvent(action="refresh_canvas")
    yield DoneEvent()


def _jsonable(value: Any) -> Any:
    """Best-effort conversion of ADK/genai objects into JSON-safe values."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v) for v in value]
    if hasattr(value, "model_dump"):
        try:
            return _jsonable(value.model_dump(exclude_none=True, by_alias=True))
        except Exception:  # noqa: BLE001
            return str(value)
    return str(value)
