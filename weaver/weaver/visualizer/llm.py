"""Model construction for the visualizer."""

from __future__ import annotations

from typing import Any

from google.adk.models import Gemini
from google.adk.models.base_llm import BaseLlm
from google.adk.models.lite_llm import LiteLlm

from weaver.settings import settings
from weaver.visualizer.config import CONFIG, ModeConfig


def make_model(config: ModeConfig) -> BaseLlm:
    """Build the ADK model adapter for the configured provider.

    Google models are called directly through the Gemini API using the Google
    API key. Every other provider is served over the OpenAI-compatible Zen
    gateway, so the adapter (and endpoint shape) differs.
    """
    if config.provider == "google":
        client_kwargs = (
            {"api_key": settings.google_api_key} if settings.google_api_key else {}
        )
        return Gemini(model=config.model, client_kwargs=client_kwargs)
    kwargs: dict[str, Any] = {"api_base": settings.base_url}
    if settings.api_key:
        kwargs["api_key"] = settings.api_key
    return LiteLlm(model=f"openai/{config.model}", **kwargs)


model = make_model(CONFIG)
