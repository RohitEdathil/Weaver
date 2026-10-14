import uuid
from pathlib import Path

from pydantic import BaseModel

import weaver.converser as converser
import weaver.visualizer as visualizer

_PLACEHOLDER_PATH = Path(__file__).parent / "placeholder.html"


def _load_placeholder() -> str:
    return _PLACEHOLDER_PATH.read_text(encoding="utf-8")


class Session(BaseModel):
    id: str
    canvas: str
    mode: str


async def create_session() -> Session:
    session_id = str(uuid.uuid4())
    canvas = _load_placeholder()
    await visualizer.create_session(session_id, canvas)
    await converser.create_session(session_id)
    return Session(id=session_id, canvas=canvas, mode=visualizer.MODE)


async def get_canvas(session_id: str) -> str | None:
    return await visualizer.get_code(session_id)


async def get_conversation(session_id: str) -> list[dict[str, str]] | None:
    if await visualizer.get_code(session_id) is None:
        return None
    return await visualizer.get_conversation(session_id)
