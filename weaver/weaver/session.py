import uuid

from pydantic import BaseModel, Field


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    canvas: str = ""


_sessions: dict[str, Session] = {}


def create_session() -> Session:
    session = Session()
    _sessions[session.id] = session
    return session


def get_session(session_id: str) -> Session | None:
    return _sessions.get(session_id)
