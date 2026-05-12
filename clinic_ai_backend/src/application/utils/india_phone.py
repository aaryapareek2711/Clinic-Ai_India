"""Normalize Indian mobile numbers for persistence and WhatsApp (digits only, ``91`` + 10-digit local)."""

from __future__ import annotations

import unicodedata


def _digits_only(raw: str) -> str:
    s = unicodedata.normalize("NFKC", str(raw or ""))
    return "".join(c for c in s if c.isdigit())


def normalize_india_mobile_storage(raw: str | None) -> str:
    """Return canonical ``91xxxxxxxxxx`` for a valid Indian mobile.

    Accepts ``+91…``, ``0091…``, ``0`` + 10-digit local, spaces, dashes, parentheses,
    and embedded numbers (uses the last valid ``91`` + 10-digit mobile span when ambiguous).

    Raises ``ValueError`` when empty or when no valid Indian mobile (first digit 6–9) can be derived.
    """
    s = str(raw or "").strip()
    if not s:
        raise ValueError("phone_number cannot be empty")
    d = _digits_only(s)
    if not d:
        raise ValueError("phone_number must contain digits")
    while len(d) > 1 and d[0] == "0":
        d = d[1:]

    if len(d) == 10 and d[0] in "6789":
        return "91" + d
    if len(d) == 11 and d[0] == "0" and d[1] in "6789":
        return "91" + d[1:11]

    for i in range(len(d) - 11, -1, -1):
        chunk = d[i : i + 12]
        if len(chunk) == 12 and chunk.startswith("91") and chunk[2] in "6789":
            return chunk

    for i in range(len(d) - 9, -1, -1):
        local = d[i : i + 10]
        if len(local) == 10 and local[0] in "6789":
            return "91" + local

    raise ValueError(
        "phone_number must be a valid Indian mobile (10 digits starting with 6–9), "
        "optionally with country code 91 or a leading 0."
    )
