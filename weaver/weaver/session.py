import uuid
from pathlib import Path

from pydantic import BaseModel, Field

_PLACEHOLDER_PATH = Path(__file__).parent / "placeholder.html"


def _load_placeholder() -> str:
    return _PLACEHOLDER_PATH.read_text(encoding="utf-8")


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    canvas: str = Field(default_factory=_load_placeholder)


_sessions: dict[str, Session] = {}


def create_session() -> Session:
    session = Session()
    _sessions[session.id] = session
    return session


def get_session(session_id: str) -> Session | None:
    return _sessions.get(session_id)
