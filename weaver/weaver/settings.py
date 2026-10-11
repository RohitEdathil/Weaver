"""Environment-backed settings for Weaver.

All environment variables are read through a pydantic ``BaseSettings`` model,
which also loads the project ``.env`` file.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

Mode = Literal["fast", "accurate"]


class Settings(BaseSettings):
    """Environment-backed settings for Weaver."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenCode Zen gateway, shared across agents.
    base_url: str = Field(
        default="https://opencode.ai/zen/v1",
        validation_alias="OPENCODE_BASE_URL",
    )
    api_key: str | None = Field(default=None, validation_alias="OPENCODE_API_KEY")

    # Google Gemini API, used when an agent talks to Google directly.
    google_api_key: str | None = Field(
        default=None, validation_alias="GOOGLE_API_KEY"
    )

    # Visualizer agent.
    mode: Mode = Field(default="fast", validation_alias="VISUALIZER_MODE")

    @field_validator("mode", mode="before")
    @classmethod
    def _normalize_mode(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


settings = Settings()
