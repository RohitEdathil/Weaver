"""The visualizer text agent.

A single, self-contained ADK agent that writes the canvas source code for a
session. It writes a p5.js sketch (JavaScript only); the fixed HTML shell that
hosts it lives in ``canvas``. It talks to the tools in ``tools`` to read, patch
and rewrite the current sketch, and exposes a token stream that the API layer
forwards over SSE.

The canvas code lives in the ADK session state under ``CODE_STATE_KEY`` so it
survives across turns (and can later move to a durable session service without
touching the agent).
"""

from __future__ import annotations

from weaver.visualizer.config import MODE
from weaver.visualizer.service import (
    create_session,
    deliver_snapshot,
    get_canvas,
    get_code,
    get_conversation,
)
from weaver.visualizer.stream import stream

__all__ = [
    "MODE",
    "create_session",
    "deliver_snapshot",
    "get_canvas",
    "get_code",
    "get_conversation",
    "stream",
]
