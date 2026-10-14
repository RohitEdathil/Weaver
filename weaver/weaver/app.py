from fastapi import HTTPException, WebSocket
from fastapi.applications import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel

import weaver.converser as converser
import weaver.session as session
import weaver.visualizer as visualizer
from weaver.tracing import configure_tracing

configure_tracing()

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


@app.get("/session/{id}/code", response_class=PlainTextResponse)
async def get_code(id: str) -> PlainTextResponse:
    code = await session.get_canvas(id)
    if code is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return PlainTextResponse(content=code)


@app.get("/session/{id}/visualizer/conversation")
async def get_visualizer_conversation(id: str) -> list[dict[str, str]]:
    conversation = await session.get_conversation(id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return conversation


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


@app.websocket("/session/{id}/converser")
async def converser_live(websocket: WebSocket, id: str) -> None:
    await converser.run(websocket, id)
