"""The ADK agent, app and runner backing the visualizer.

The session helpers the API layer uses live in ``service``.
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
from weaver.visualizer.tools import apply_patch, read_code, view_canvas, write_code

APP_NAME = "weaver"
USER_ID = "default-user"

agent = LlmAgent(
    name="visualizer",
    model=model,
    description="Writes and edits the interactive canvas for a Weaver session.",
    instruction=BASE_INSTRUCTION,
    tools=[read_code, write_code, apply_patch, view_canvas],
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
