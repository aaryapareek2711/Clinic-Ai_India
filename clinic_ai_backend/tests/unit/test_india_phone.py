"""Tests for Indian mobile normalization (Meta WhatsApp ``to`` format)."""

import pytest

from src.application.utils.india_phone import normalize_india_mobile_storage


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("9876543210", "919876543210"),
        ("09876543210", "919876543210"),
        ("+91 98765 43210", "919876543210"),
        ("+91-98765-43210", "919876543210"),
        ("00919876543210", "919876543210"),
        ("919876543210", "919876543210"),
        ("tel:+91-98765-43210", "919876543210"),
        ("  9876543210  ", "919876543210"),
        ("91919876543210", "919876543210"),
    ],
)
def test_normalize_india_mobile_storage_accepts_common_formats(raw: str, expected: str) -> None:
    assert normalize_india_mobile_storage(raw) == expected


def test_normalize_india_mobile_storage_rejects_invalid() -> None:
    with pytest.raises(ValueError, match="valid Indian mobile"):
        normalize_india_mobile_storage("12345")
    with pytest.raises(ValueError, match="valid Indian mobile"):
        normalize_india_mobile_storage("5876543210")
    with pytest.raises(ValueError):
        normalize_india_mobile_storage("")
    with pytest.raises(ValueError):
        normalize_india_mobile_storage("   ")
