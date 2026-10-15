"""Session helpers for the visualizer.

Create the ADK session backing a Weaver session and read back its canvas code,
rendered canvas page and conversation. The agent, app and runner live in
``agent``.

The visualizer agent only writes the p5.js sketch; the fixed HTML shell (p5 CDN,
base styles, script tag) lives here in ``assets`` so the agent never has to.
"""

from __future__ import annotations

import re
from pathlib import Path

from google.genai import types

from weaver.visualizer.agent import APP_NAME, USER_ID, session_service
from weaver.visualizer.tools import CODE_STATE_KEY

_ASSETS = Path(__file__).parent / "assets"

_TEMPLATE = (_ASSETS / "canvas.html").read_text(encoding="utf-8")

# The initial sketch shown before the agent writes anything.
PLACEHOLDER = (_ASSETS / "placeholder.js").read_text(encoding="utf-8")

# A literal "</script>" anywhere in the code would close the script tag early.
_END_SCRIPT = re.compile(r"</(script)", re.IGNORECASE)


def render(code: str) -> str:
    """Embed a p5.js sketch into the fixed canvas HTML shell."""
    safe = _END_SCRIPT.sub(r"<\\/\1", code)
    return _TEMPLATE.replace("/*__CODE__*/", safe)


async def create_session(session_id: str) -> str:
    """Create the ADK session backing a Weaver session.

    Returns the initial canvas code.
    """
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=session_id,
        state={CODE_STATE_KEY: PLACEHOLDER},
    )
    return PLACEHOLDER


async def get_code(session_id: str) -> str | None:
    """Return the current canvas code for a session, or ``None`` if missing."""
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if session is None:
        return None
    return session.state.get(CODE_STATE_KEY, "")


async def get_canvas(session_id: str) -> str | None:
    """Return the canvas as a self-contained HTML page, or ``None`` if missing."""
    code = await get_code(session_id)
    if code is None:
        return None
    return render(code)


def _text_of(content: types.Content | None) -> str:
    """Concatenate the visible text of a content, ignoring thoughts/tools."""
    if content is None or not content.parts:
        return ""
    return "".join(
        part.text for part in content.parts if part.text and not part.thought
    ).strip()


async def get_conversation(
    session_id: str, *, limit: int = 40
) -> list[dict[str, str]]:
    """Return the recent text turns of a session's conversation.

    Includes both the user's direct messages and the turns the converser drove
    through the ``use_visualizer`` tool, since both live in the same session.
    Returns an empty list when the session is missing.
    """
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if session is None:
        return []

    turns: list[dict[str, str]] = []
    for event in session.events:
        text = _text_of(event.content)
        if not text:
            continue
        role = "user" if event.content.role == "user" else "assistant"
        turns.append({"role": role, "text": text})
    return turns[-limit:]
