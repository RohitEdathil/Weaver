"""Model configuration for the visualizer.

The active mode comes from settings; each mode maps to a provider and model.
Google models are called directly through the Gemini API, while every other
provider is served over the OpenAI-compatible Zen gateway.
"""

from __future__ import annotations

from dataclasses import dataclass

from weaver.settings import settings

MODE = settings.mode


@dataclass(frozen=True)
class ModeConfig:
    """Model, provider and compaction settings for a single visualizer mode."""

    provider: str
    model: str
    compaction_interval: int
    max_output_tokens: int


MODE_CONFIGS: dict[str, ModeConfig] = {
    "fast": ModeConfig(
        provider="google",
        model="gemini-3.5-flash-lite",
        compaction_interval=4,
        max_output_tokens=65536,
    ),
    "accurate": ModeConfig(
        provider="openai",
        model="deepseek-v4.1-flash",
        compaction_interval=8,
        max_output_tokens=65536,
    ),
}

CONFIG = MODE_CONFIGS[MODE]
