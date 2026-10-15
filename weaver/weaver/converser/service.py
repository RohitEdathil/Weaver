"""Session helpers for the converser.

The converser's ADK session shares the Weaver session id so it sees the same
session as the visualizer. The agent, app and runner live in ``agent``.
"""

from __future__ import annotations

from weaver.converser.agent import APP_NAME, USER_ID, session_service


async def create_session(session_id: str) -> None:
    """Create the ADK session backing a Weaver session's converser."""
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=session_id,
    )
