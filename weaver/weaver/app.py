from fastapi import HTTPException
from fastapi.applications import FastAPI
from fastapi.responses import HTMLResponse

import weaver.session as session

app = FastAPI()


@app.post("/session", response_model=session.Session)
def create_session() -> session.Session:
    return session.create_session()


@app.get("/session/{id}/canvas", response_class=HTMLResponse)
def get_canvas(id: str) -> HTMLResponse:
    sess = session.get_session(id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return HTMLResponse(content=sess.canvas)
