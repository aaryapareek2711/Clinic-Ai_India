"""FastAPI application factory module."""
from fastapi import FastAPI

from src.api.routers import health, patients, whatsapp, workflow


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(title="Clinic AI India Backend", version="0.1.0")
    app.include_router(health.router)
    app.include_router(patients.router)
    app.include_router(whatsapp.router)
    app.include_router(workflow.router)
    return app


app = create_app()
