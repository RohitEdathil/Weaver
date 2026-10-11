"""Optional LangSmith tracing for Weaver's agents.

The LangSmith SDK reads its configuration from the process environment, while
Weaver's configuration lives in the project ``.env`` file (loaded by
pydantic-settings). This module bridges the two: when tracing is enabled it
exports the LangSmith settings into the environment and installs the Google
ADK integration so that every agent's runs, tool calls and LLM interactions
are traced.
"""

from __future__ import annotations

import logging
import os

from weaver.settings import settings

logger = logging.getLogger(__name__)

_configured = False


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
