"""The ADK agent, app and runner backing the visualizer.

Also provides the session helpers used by the API layer to create a session and
read back its canvas and conversation.
"""

from __future__ import annotations

from google.adk import Runner
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.apps._configs import EventsCompactionConfig
from google.adk.apps.llm_event_summarizer import LlmEventSummarizer
from google.adk.sessions import InMemorySessionService
from google.genai import types

from weaver.visualizer.config import CONFIG
from weaver.visualizer.context import context_editing
from weaver.visualizer.llm import model
from weaver.visualizer.prompts import BASE_INSTRUCTION
from weaver.visualizer.tools import CODE_STATE_KEY, apply_patch, read_code, write_code

APP_NAME = "weaver"
USER_ID = "default-user"

agent = LlmAgent(
    name="visualizer",
    model=model,
    description="Writes and edits the interactive canvas for a Weaver session.",
    instruction=BASE_INSTRUCTION,
    tools=[read_code, write_code, apply_patch],
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=CONFIG.max_output_tokens,
    ),
)

app = App(
    name=APP_NAME,
    root_agent=agent,
    plugins=[context_editing],
    events_compaction_config=EventsCompactionConfig(
        summarizer=LlmEventSummarizer(llm=model),
        compaction_interval=CONFIG.compaction_interval,
        overlap_size=1,
    ),
)

session_service = InMemorySessionService()
runner = Runner(app=app, session_service=session_service)


async def create_session(session_id: str, initial_code: str) -> None:
    """Create the ADK session backing a Weaver session."""
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=session_id,
        state={CODE_STATE_KEY: initial_code},
    )


async def get_code(session_id: str) -> str | None:
    """Return the current canvas code for a session, or ``None`` if missing."""
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if session is None:
        return None
    return session.state.get(CODE_STATE_KEY, "")


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
