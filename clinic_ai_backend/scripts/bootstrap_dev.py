"""Local development: run FastAPI with auto-reload."""
from __future__ import annotations

import uvicorn

from src.core.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "src.app:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
