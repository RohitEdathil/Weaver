"""The live voice agent and runner backing the converser.

The converser streams bidirectional audio through the Gemini Live API and has a
single non-blocking tool, ``use_visualizer``, which drives the visualizer agent.
Its ADK session shares the Weaver session id with the visualizer so the two
agents see the same session.
"""

from __future__ import annotations

from google.adk import Runner
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.genai import types

import weaver.tracing as tracing
from weaver.converser.prompts import BASE_INSTRUCTION
from weaver.converser.tools import use_visualizer
from weaver.settings import settings

APP_NAME = "weaver-converser"
USER_ID = "default-user"

# The live model is always served directly by Google: the Zen gateway does not
# proxy the bidirectional Live API.
_model = Gemini(
    model=settings.converser_model,
    client_kwargs=(
        {"api_key": settings.google_api_key} if settings.google_api_key else {}
    ),
)

# Non-blocking: ADK runs the tool in the background and delivers its result to
# the model once the session is idle, so the conversation keeps flowing.
_use_visualizer = FunctionTool(use_visualizer)
_use_visualizer.response_scheduling = types.FunctionResponseScheduling.WHEN_IDLE

agent = LlmAgent(
    name="converser",
    model=_model,
    description="The user's real-time voice assistant and front-end to Weaver.",
    instruction=BASE_INSTRUCTION,
    tools=[_use_visualizer],
)

# Trace the live voice session when LangSmith is enabled; the shared plugin
# keys each conversation by ADK session id. ADK requires plugins on the App
# when the Runner is built from one, so it goes here rather than on the Runner.
_live_tracing = tracing.live_plugin()
app = App(
    name=APP_NAME,
    root_agent=agent,
    plugins=[_live_tracing] if _live_tracing else [],
)
session_service = InMemorySessionService()
runner = Runner(app=app, session_service=session_service)


async def create_session(session_id: str) -> None:
    """Create the ADK session backing a Weaver session's converser."""
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=session_id,
    )
