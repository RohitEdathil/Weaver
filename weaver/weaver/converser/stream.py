"""Turn ADK live events into UI-friendly converser events."""

from __future__ import annotations

import base64
from typing import Iterator

from google.adk.events import Event as AdkEvent

from weaver.converser.events import (
    AudioEvent,
    ConverserEvent,
    InterruptedEvent,
    TranscriptEvent,
)
from weaver.shared.events import (
    ControlEvent,
    DoneEvent,
    ErrorEvent,
    ToolCallEvent,
)

# The tool whose invocation tells the UI to reveal the visualizer.
VISUALIZER_TOOL = "use_visualizer"


def _audio_events(event: AdkEvent) -> Iterator[AudioEvent]:
    """Yield one event per audio inline-data part in the event content."""
    content = event.content
    if not content or not content.parts:
        return
    for part in content.parts:
        inline = part.inline_data
        mime_type = inline.mime_type if inline else None
        if inline and inline.data and mime_type and mime_type.startswith("audio/"):
            yield AudioEvent(
                data=base64.b64encode(inline.data).decode("ascii"),
                mime_type=mime_type,
            )


def to_events(event: AdkEvent) -> Iterator[ConverserEvent]:
    """Map a single ADK live event to zero or more UI events."""
    if event.error_code:
        yield ErrorEvent(message=event.error_message or event.error_code)

    if event.input_transcription and event.input_transcription.text:
        yield TranscriptEvent(
            role="user",
            text=event.input_transcription.text,
            partial=bool(event.partial),
        )
    if event.output_transcription and event.output_transcription.text:
        yield TranscriptEvent(
            role="agent",
            text=event.output_transcription.text,
            partial=bool(event.partial),
        )

    yield from _audio_events(event)

    # Partial events carry incomplete function calls (empty args); only the
    # non-partial event holds the full call.
    if not event.partial:
        for call in event.get_function_calls():
            yield ToolCallEvent(name=call.name)
            if call.name == VISUALIZER_TOOL:
                yield ControlEvent(action="open_visualizer")

    if event.interrupted:
        yield InterruptedEvent()

    if event.turn_complete:
        yield DoneEvent()
