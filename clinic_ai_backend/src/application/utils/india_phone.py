"""Normalize Indian mobile numbers for persistence and WhatsApp (digits only, ``91`` + 10-digit local)."""


def normalize_india_mobile_storage(raw: str | None) -> str:
    """Return canonical ``91xxxxxxxxxx`` when input looks like an Indian mobile; otherwise best-effort digits.

    Accepts ``+91…``, ``91…``, ``0…``, spaces, and plain 10-digit locals starting with 6–9.
    Raises ``ValueError`` only when there are no digits at all.
    """
    s = str(raw or "").strip()
    if not s:
        raise ValueError("phone_number cannot be empty")
    d = "".join(c for c in s if c.isdigit())
    if not d:
        raise ValueError("phone_number must contain digits")
    while len(d) > 10 and d.startswith("0"):
        d = d[1:]
    if len(d) == 12 and d.startswith("91") and d[2] in "6789":
        return d[:12]
    if len(d) == 11 and d[0] == "0" and d[1] in "6789":
        return "91" + d[1:11]
    if len(d) == 10 and d[0] in "6789":
        return "91" + d
    if len(d) > 12 and d.startswith("91") and d[2] in "6789":
        return d[:12]
    if len(d) > 10:
        tail = d[-10:]
        if tail[0] in "6789":
            return "91" + tail
    if len(d) <= 20:
        return d
    return d[:20]
