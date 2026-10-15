"""Tools exposed to the converser agent.

The converser has a single tool, ``use_visualizer``. It is a non-blocking tool:
ADK runs it in the background and hands the live model its result once the
session is idle, so the conversation keeps flowing while the visualizer works.
"""

from __future__ import annotations

from google.adk.tools import ToolContext

import weaver.visualizer as visualizer
from weaver.converser import bus
from weaver.shared.events import ControlEvent

_BUSY = "Visualizer agent is busy, please don't call the tool till it finishes."


async def use_visualizer(request: str, tool_context: ToolContext) -> str:
    """Ask the Weaver visualizer to build, edit, or look at the canvas.

    Call this for any request about the visualization: creating something new,
    changing what is on screen, or answering a question about it. The
    visualizer can see the canvas it renders, so it can also describe what is
    currently showing or check whether it looks right. It runs in the
    background and reports back when it finishes.

    Args:
        request: A clear, self-contained description of what to build, change,
            or check, including any relevant context from the conversation.

    Returns:
        A summary of what the visualizer did.
    """
    session_id = tool_context.session.id

    busy = bus.lock(session_id)
    if busy.locked():
        return _BUSY

    async with busy:
        updates: list[str] = []
        async for event in visualizer.stream(session_id, request):
            if event.type == "text":
                updates.append(event.text)
            elif event.type == "error":
                updates.append(f"The visualizer reported an error: {event.message}")
            elif event.type == "control" and event.action == "refresh_canvas":
                # Tell the live session the canvas actually changed, so the UI
                # reloads it once, when the visualizer is done, not on every
                # turn.
                bus.publish(session_id, ControlEvent(action="refresh_canvas"))
            elif event.type == "control" and event.action == "capture_canvas":
                # The visualizer wants to see the canvas; forward the request so
                # the UI captures and returns a screenshot.
                bus.publish(session_id, ControlEvent(action="capture_canvas"))

        return "\n".join(updates) or "The visualizer has finished."
