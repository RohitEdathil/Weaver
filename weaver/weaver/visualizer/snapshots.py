"""Per-session coordination for canvas snapshots.

The ``view_canvas`` tool runs deep inside the agent loop, while the screenshot
is produced by the user's browser. The tool registers a future here and waits
on it; the HTTP layer resolves that future when the client posts the captured
image. Registering the future is idempotent, so the stream can open it when it
sees the tool call and the tool can await the very same future.
"""

from __future__ import annotations

import asyncio

_pending: dict[str, asyncio.Future[str]] = {}


def open(session_id: str) -> asyncio.Future[str]:
    """Return the session's pending snapshot future, creating it if needed."""
    future = _pending.get(session_id)
    if future is None or future.done():
        future = asyncio.get_running_loop().create_future()
        _pending[session_id] = future
    return future


def deliver(session_id: str, data_url: str) -> bool:
    """Resolve a waiting snapshot future with the captured image.

    Returns whether a future was waiting; ``False`` means the snapshot arrived
    with no tool left to consume it.
    """
    future = _pending.pop(session_id, None)
    if future is None or future.done():
        return False
    future.set_result(data_url)
    return True


def fail(session_id: str, message: str) -> bool:
    """Reject a waiting snapshot future with a capture error."""
    future = _pending.pop(session_id, None)
    if future is None or future.done():
        return False
    future.set_exception(RuntimeError(message))
    return True


def close(session_id: str) -> None:
    """Drop a session's pending future, cancelling it if still waiting."""
    future = _pending.pop(session_id, None)
    if future is not None and not future.done():
        future.cancel()
