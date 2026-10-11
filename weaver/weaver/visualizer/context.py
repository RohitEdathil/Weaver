"""Context editing for the visualizer agent.

Model reasoning ("thought") parts and the selected tools' inputs and outputs
from every turn before the current one are dropped or replaced with a
placeholder, so stale chain-of-thought, canvas reads and diffs do not pile up.
The current turn is left intact, otherwise the model starts reasoning again.

ADK rebuilds the contents before each model call, so the edits are re-applied
every call.
"""

from __future__ import annotations

import logging
from typing import Optional

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.base_plugin import BasePlugin
from google.genai import types

logger = logging.getLogger(__name__)

# Tools whose inputs and outputs are stripped from every past turn.
DEFAULT_REDACT_TOOLS: frozenset[str] = frozenset(
    {"read_code", "write_code", "apply_patch"}
)

# Text substituted for a redacted tool input or output.
REDACTED = "[redacted by the context editor]"


def _is_human_user(content: types.Content) -> bool:
    """Whether a content is a real user message rather than a tool response."""
    parts = content.parts or []
    return content.role == "user" and not any(p.function_response for p in parts)


def _current_turn_start(contents: list[types.Content]) -> int:
    """Index of the current turn's human message, or ``0`` if there is none."""
    for index in range(len(contents) - 1, -1, -1):
        if _is_human_user(contents[index]):
            return index
    return 0


def _redact_part(part: types.Part, tools: frozenset[str]) -> types.Part:
    """Copy ``part`` with a selected tool's payload redacted.

    The nested call/response objects are shared with session events, so they
    are replaced rather than mutated in place.
    """
    call = part.function_call
    if call is not None and call.name in tools:
        call = call.model_copy(update={"args": {"redacted": True}})
        part = part.model_copy(update={"function_call": call})

    response = part.function_response
    if response is not None and response.name in tools:
        response = response.model_copy(update={"response": {"result": REDACTED}})
        part = part.model_copy(update={"function_response": response})

    return part


def _edit_history(
    contents: list[types.Content], tools: frozenset[str]
) -> list[types.Content]:
    """Drop reasoning and redact tool I/O for every turn before the current one.

    The current turn is left intact so the model keeps its recent reasoning.
    Contents left with no parts are dropped. Returns a new list.
    """
    start = _current_turn_start(contents)
    edited: list[types.Content] = []
    for index, content in enumerate(contents):

        # Leave the current turn alone
        if index >= start:
            edited.append(content)
            continue

        parts = content.parts or []

        # Throw away reasoning
        kept = [part for part in parts if not part.thought]
        if parts and not kept:
            continue

        # Redact tool input and output
        edited.append(
            content.model_copy(
                update={"parts": [_redact_part(part, tools) for part in kept]}
            )
        )
    return edited


class ContextEditingPlugin(BasePlugin):
    """Strips reasoning parts and redacts past tool I/O from the request."""

    def __init__(
        self,
        *,
        redact_tools: frozenset[str] = DEFAULT_REDACT_TOOLS,
        name: str = "context_editing",
    ) -> None:
        """Initialise the plugin.

        Args:
            redact_tools: Tools whose past inputs and outputs are redacted.
            name: The plugin instance name.
        """
        super().__init__(name)
        self._redact_tools = frozenset(redact_tools)

    async def before_model_callback(
        self,
        *,
        callback_context: CallbackContext,
        llm_request: LlmRequest,
    ) -> Optional[LlmResponse]:
        """Edit the context just before the request reaches the model."""
        try:
            llm_request.contents = _edit_history(
                llm_request.contents, self._redact_tools
            )
        except Exception:  # noqa: BLE001 - never block a model call
            logger.exception("Context editing failed; sending context as is")

        return None


context_editing = ContextEditingPlugin()
