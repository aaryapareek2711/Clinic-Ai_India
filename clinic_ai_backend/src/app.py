"""FastAPI application factory module."""
from fastapi import FastAPI

from src.api.routers import health, patients, transcription, vitals, whatsapp, workflow
from src.workers.transcription_worker import start_background_workers, stop_background_workers


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(title="Clinic AI India Backend", version="0.1.0")
    app.include_router(health.router)
    app.include_router(patients.router)
    app.include_router(vitals.router)
    app.include_router(whatsapp.router)
    app.include_router(workflow.router)
    app.include_router(transcription.router)

    @app.on_event("startup")
    async def _startup() -> None:
        start_background_workers()

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await stop_background_workers()

    return app


app = create_app()
