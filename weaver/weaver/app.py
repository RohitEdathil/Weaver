from fastapi import HTTPException
from fastapi.applications import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

import weaver.session as session
import weaver.visualizer as visualizer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class VisualizerMessage(BaseModel):
    message: str


@app.post("/session", response_model=session.Session)
async def create_session() -> session.Session:
    return await session.create_session()


@app.get("/session/{id}/canvas", response_class=HTMLResponse)
async def get_canvas(id: str) -> HTMLResponse:
    canvas = await session.get_canvas(id)
    if canvas is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return HTMLResponse(content=canvas)


@app.post("/session/{id}/visualizer")
async def visualizer_stream(id: str, body: VisualizerMessage) -> StreamingResponse:
    if await session.get_canvas(id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_stream():
        async for event in visualizer.stream(id, body.message):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
