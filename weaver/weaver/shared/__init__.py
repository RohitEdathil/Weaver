"""The UI event contract shared by Weaver's agents.

The visualizer (text) and converser (live voice) agents emit the same text,
tool, control, error and done events, so clients share a single typed contract.
Those events live here.
"""

from __future__ import annotations

__all__: list[str] = []
