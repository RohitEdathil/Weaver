"""UI-friendly events emitted by the converser.

The converser reuses the shared text/tool/control/error/done events and adds
audio (base64 PCM), transcript and interruption events for the live session.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from weaver.shared.events import (
    ControlEvent,
    DoneEvent,
    ErrorEvent,
    ToolCallEvent,
)


class TranscriptEvent(BaseModel):
    """A partial or final transcript of live speech.

    ``role`` is ``user`` for the user's spoken input and ``agent`` for the
    model's spoken output.
    """

    type: Literal["transcript"] = "transcript"
    role: Literal["user", "agent"]
    text: str
    partial: bool


class AudioEvent(BaseModel):
    """A chunk of model audio, base64-encoded 24 kHz 16-bit PCM."""

    type: Literal["audio"] = "audio"
    data: str
    mime_type: str


class InterruptedEvent(BaseModel):
    """The model's current response was interrupted."""

    type: Literal["interrupted"] = "interrupted"


ConverserEvent = Annotated[
    Union[
        TranscriptEvent,
        AudioEvent,
        InterruptedEvent,
        ToolCallEvent,
        ControlEvent,
        ErrorEvent,
        DoneEvent,
    ],
    Field(discriminator="type"),
]
