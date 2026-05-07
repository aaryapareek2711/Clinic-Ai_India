"""FastAPI application factory module."""
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.api.routers import (
    auth,
    ai_jobs,
    contextai,
    followthrough,
    health,
    intake,
    notes,
    patient_chat,
    patients,
    templates,
    transcription,
    visits,
    vitals,
    whatsapp,
    workflow,
)
from src.workers.transcription_worker import start_background_workers, stop_background_workers
from src.workers.ai_job_worker import start_ai_job_workers, stop_ai_job_workers
from src.core.ai_factory import prompt_registry
from src.middleware.performance_middleware import PerformanceMiddleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start/stop background transcription workers with app lifecycle."""
    prompt_registry.initialize()
    start_background_workers()
    start_ai_job_workers(concurrency=1, poll_interval_sec=0.5)
    try:
        yield
    finally:
        await stop_ai_job_workers()
        await stop_background_workers()


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(title="Clinic AI India Backend", version="0.1.0", lifespan=lifespan)
    cors_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Compress large JSON payloads (notes/transcripts/summaries).
    app.add_middleware(GZipMiddleware, minimum_size=800)
    app.add_middleware(PerformanceMiddleware)
    app.include_router(auth.router)
    app.include_router(health.router)
    app.include_router(patients.router)
    app.include_router(vitals.router)
    app.include_router(whatsapp.router)
    app.include_router(workflow.router)
    app.include_router(transcription.router)
    app.include_router(visits.router)
    app.include_router(patient_chat.router)
    app.include_router(contextai.router)
    app.include_router(templates.router)
    app.include_router(notes.router)
    app.include_router(followthrough.router)
    app.include_router(intake.router)
    app.include_router(ai_jobs.router)
    return app


app = create_app()
