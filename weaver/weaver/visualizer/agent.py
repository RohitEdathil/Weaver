"""The ADK agent, app and runner backing the visualizer.

Also provides the session helpers used by the API layer to create a session and
read back its canvas.
"""

from __future__ import annotations

from google.adk import Runner
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.apps._configs import EventsCompactionConfig
from google.adk.apps.llm_event_summarizer import LlmEventSummarizer
from google.adk.sessions import InMemorySessionService

from weaver.visualizer.config import CONFIG
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
)

app = App(
    name=APP_NAME,
    root_agent=agent,
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
