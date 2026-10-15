"""Canvas editing tools exposed to the visualizer agent."""

from __future__ import annotations

from google.adk.tools import ToolContext
from pydantic import BaseModel, Field

CODE_STATE_KEY = "canvas_code"


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
