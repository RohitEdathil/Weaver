"""Per-session state for the converser's tools.

The ``use_visualizer`` tool runs deep inside the live invocation, far from the
WebSocket handler. This module keeps the state that belongs to the
session rather than the tool call: the outbound control-event channel (so the
tool can tell the live session the canvas changed) and a busy lock (so the
model cannot start a second visualizer run while one is still going).
"""

from __future__ import annotations

import asyncio

from weaver.shared.events import Event

_queues: dict[str, asyncio.Queue[Event]] = {}
_locks: dict[str, asyncio.Lock] = {}


def register(session_id: str) -> asyncio.Queue[Event]:
    """Create and register the outbound queue for a live session."""
    queue: asyncio.Queue[Event] = asyncio.Queue()
    _queues[session_id] = queue
    return queue


def unregister(session_id: str) -> None:
    """Drop a session's queue and busy lock when its live session ends."""
    _queues.pop(session_id, None)
    _locks.pop(session_id, None)


def lock(session_id: str) -> asyncio.Lock:
    """The busy lock for a session, created on first use."""
    return _locks.setdefault(session_id, asyncio.Lock())


def publish(session_id: str, event: Event) -> None:
    """Queue a control event for the session, if it still has a listener."""
    queue = _queues.get(session_id)
    if queue is not None:
        queue.put_nowait(event)
