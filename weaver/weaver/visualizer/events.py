"""UI-friendly events emitted by the visualizer stream.

Each event is a pydantic model so the API layer can serialize it to the SSE wire
format and clients share a single, typed contract.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class TextEvent(BaseModel):
    """A chunk of assistant text; ``partial`` marks streaming deltas."""

    type: Literal["text"] = "text"
    text: str
    partial: bool


class ToolCallEvent(BaseModel):
    """The model requested a tool call."""

    type: Literal["tool_call"] = "tool_call"
    name: str


ControlAction = Literal["refresh_canvas"]


class ControlEvent(BaseModel):
    """A control instruction for the client UI."""

    type: Literal["control"] = "control"
    action: ControlAction


class ErrorEvent(BaseModel):
    """An error surfaced to the client."""

    type: Literal["error"] = "error"
    message: str


class DoneEvent(BaseModel):
    """The turn is complete."""

    type: Literal["done"] = "done"


Event = Annotated[
    Union[
        TextEvent,
        ToolCallEvent,
        ControlEvent,
        ErrorEvent,
        DoneEvent,
    ],
    Field(discriminator="type"),
]
