"""Optional LangSmith tracing for Weaver's agents.

The LangSmith SDK reads its configuration from the process environment, while
Weaver's configuration lives in the project ``.env`` file (loaded by
pydantic-settings). This module bridges the two: when tracing is enabled it
exports the LangSmith settings into the environment and installs the Google
ADK integration so that every agent's runs, tool calls and LLM interactions
are traced.

The converser's Gemini Live session is traced by a separate ADK plugin
(``LangSmithGoogleADKLivePlugin``), which must be registered on its ``Runner``
rather than installed globally. :func:`live_plugin` builds that shared plugin
and :func:`finalize_live_session` is the teardown backstop for cancelled runs.
"""

from __future__ import annotations

import logging
import os

from langsmith.integrations.google_adk_live import LangSmithGoogleADKLivePlugin

from weaver.settings import settings

logger = logging.getLogger(__name__)

_configured = False
_live_plugin: LangSmithGoogleADKLivePlugin | None = None


def configure_tracing() -> bool:
    """Enable LangSmith tracing when configured.

    Safe to call more than once; only the first call has an effect. Returns
    ``True`` when tracing was enabled.
    """
    global _configured
    if _configured:
        return True
    _configured = True

    if not settings.langsmith_tracing:
        return False
    if not settings.langsmith_api_key:
        logger.warning(
            "LANGSMITH_TRACING is enabled but LANGSMITH_API_KEY is unset; "
            "skipping LangSmith tracing"
        )
        return False

    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project

    from langsmith.integrations.google_adk import configure_google_adk

    enabled = configure_google_adk(project_name=settings.langsmith_project)
    if enabled:
        logger.info(
            "LangSmith tracing enabled for project %r",
            settings.langsmith_project,
        )
    else:
        logger.warning("Failed to enable LangSmith tracing for Google ADK")
    return enabled


def live_plugin() -> LangSmithGoogleADKLivePlugin | None:
    """Return the shared Gemini Live tracing plugin, or ``None`` if disabled.

    A single plugin instance is shared across every ``run_live`` call and keys
    each conversation's trace by ADK session id, so concurrent converser
    sessions stay separate. Built lazily and only when LangSmith tracing is
    configured; the caller attaches it to the converser's ``Runner``.
    """
    global _live_plugin
    if not settings.langsmith_tracing or not settings.langsmith_api_key:
        return None
    if _live_plugin is None:
        _live_plugin = LangSmithGoogleADKLivePlugin(
            project_name=settings.langsmith_project
        )
    return _live_plugin


def finalize_live_session(session_id: str) -> None:
    """Finalize a converser's live trace when its WebSocket closes.

    ADK finalizes the trace itself on a graceful end, so this is only a backstop
    for cancelled runs. No-op when tracing is disabled or already finalized.
    """
    if _live_plugin is not None:
        _live_plugin.finalize(session_id=session_id)
