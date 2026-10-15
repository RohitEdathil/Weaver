"""Canvas editing tools exposed to the visualizer agent."""

from __future__ import annotations

import asyncio
import base64
import binascii

from google.adk.tools import ToolContext
from google.genai import types
from pydantic import BaseModel, Field

from weaver.visualizer import snapshots

CODE_STATE_KEY = "canvas_code"

# How long the tool waits for the browser to return a screenshot.
SNAPSHOT_TIMEOUT_SECONDS = 20.0


def read_code(tool_context: ToolContext) -> str:
    """Read the current canvas source code.

    Call this before making changes so you edit against the latest canvas.

    Returns:
        The full JavaScript source of the canvas, or an empty string if the
        canvas has no code yet.
    """
    return tool_context.state.get(CODE_STATE_KEY, "")


def write_code(code: str, tool_context: ToolContext) -> str:
    """Replace the entire canvas source code with new code.

    Use this for full rewrites or the first version of the canvas.

    Args:
        code: The complete JavaScript for the p5.js sketch to render as the
            canvas.

    Returns:
        A short confirmation message.
    """
    tool_context.state[CODE_STATE_KEY] = code
    return f"Canvas replaced ({len(code)} characters)."


class Patch(BaseModel):
    """A single search-and-replace edit to the canvas."""

    target: str = Field(
        description=(
            "Exact text to find in the current canvas, copied verbatim, "
            "including whitespace and line breaks."
        )
    )
    content: str = Field(description="The text to replace it with.")
    count: int = Field(
        default=1, description="How many occurrences of `target` to replace."
    )


def apply_patch(patches: list[Patch], tool_context: ToolContext) -> str:
    """Apply search-and-replace edits to the current canvas source code.

    Prefer this for small, targeted edits. Each patch's ``target`` must match
    the canvas exactly, including whitespace and line breaks, so include enough
    surrounding context to make it unique.

    Args:
        patches: The edits to apply, in order. Each patch replaces ``count``
            occurrences of ``target`` with ``content``.

    Returns:
        A short confirmation message, or an error message describing why a
        patch could not be applied.
    """
    code: str = tool_context.state.get(CODE_STATE_KEY, "")
    for index, patch in enumerate(patches, start=1):
        if not patch.target:
            return f"Error: patch {index} has an empty target."
        if patch.count < 1:
            return f"Error: patch {index} count must be at least 1."

        found = code.count(patch.target)
        if found == 0:
            return (
                f"Error: patch {index} target not found. Re-run `read_code` and "
                "retry with `target` copied verbatim from the canvas."
            )
        if patch.count == 1 and found > 1:
            return (
                f"Error: patch {index} target is ambiguous ({found} matches). "
                "Add surrounding context to `target` or set `count` to the number "
                "of matches."
            )
        if found < patch.count:
            return (
                f"Error: patch {index} expected {patch.count} matches but found "
                f"{found}."
            )

        code = code.replace(patch.target, patch.content, patch.count)

    tool_context.state[CODE_STATE_KEY] = code
    return f"Applied {len(patches)} patch(es)."


def _decode_data_url(data_url: str) -> tuple[str, bytes | None]:
    """Split a ``data:<mime>;base64,<data>`` URL into its mime type and bytes."""
    header, separator, encoded = data_url.partition(",")
    if not separator or not encoded:
        return "image/png", None
    mime_type = header[5:].split(";", 1)[0] if header.startswith("data:") else ""
    try:
        return mime_type or "image/png", base64.b64decode(encoded)
    except (binascii.Error, ValueError):
        return mime_type or "image/png", None


async def view_canvas(tool_context: ToolContext) -> types.Part | str:
    """Look at the canvas exactly as the user sees it right now.

    Call this after changing the canvas to check that it rendered as intended,
    then fix anything that looks wrong and look again. Use it whenever you are
    unsure what is currently on screen. It asks the user's browser for a fresh
    screenshot of the canvas and returns that image to you.

    Returns:
        An image of the current canvas, or an error message describing why it
        could not be captured.
    """
    session_id = tool_context.session.id
    future = snapshots.open(session_id)
    try:
        data_url = await asyncio.wait_for(future, timeout=SNAPSHOT_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        snapshots.close(session_id)
        return "Error: the canvas snapshot timed out. Try again."
    except Exception as exc:  # noqa: BLE001 - surfaced to the model as an error
        snapshots.close(session_id)
        return f"Error: {exc}"

    mime_type, data = _decode_data_url(data_url)
    if data is None:
        return "Error: the canvas snapshot was not a valid image."
    return types.Part.from_bytes(data=data, mime_type=mime_type)
