"""Validation for agent-authored canvas sketches.

The visualizer agent authors only the p5.js sketch (JavaScript); the fixed HTML
shell lives in ``visualizer/assets``. Breakout from the host ``<script>``
element is handled where the sketch is embedded (``visualizer.service.render``
escapes ``</script``), so this module only enforces resource limits.

This is a resource guard, not a security boundary.
"""

from __future__ import annotations

# A sketch is spliced inline into the fixed shell's <script> element.
MAX_SKETCH_BYTES = 100_000


class SketchValidationError(ValueError):
    """Raised when an agent-authored sketch fails validation."""


def validate_sketch(code: str) -> None:
    """Validate ``code`` as a canvas sketch.

    Args:
        code: The JavaScript sketch the agent wants to store.

    Raises:
        SketchValidationError: If the sketch is empty or over the size limit.
    """
    size = len(code.encode("utf-8"))
    if size == 0:
        raise SketchValidationError("the sketch is empty")
    if size > MAX_SKETCH_BYTES:
        raise SketchValidationError(
            f"the sketch is {size} bytes, over the {MAX_SKETCH_BYTES}-byte limit"
        )
