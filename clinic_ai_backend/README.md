# Clinic AI India Backend

## Architecture Overview
This project follows a Clean Architecture style with clear boundaries between presentation (`api`), application (`use_cases`, `ports`, `dto`), domain (`entities`, `value_objects`, `events`), and infrastructure (`adapters`). Shared cross-cutting concerns live in `core`, `middleware`, and `observability`. Background workflows are handled by `workers` for async processing and task sweeping.

## Local Setup
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
make dev
```

## Environment Variables
| Variable | Required | Description | Example |
|---|---|---|---|
| OPENAI_API_KEY | Yes | API key for LLM provider | sk-... |
| MONGODB_URL | Yes | MongoDB connection URI | mongodb://localhost:27017/clinic_ai |
| TRANSCRIPTION_SERVICE | Yes | Active speech-to-text provider | whisper |
| CORS_ORIGINS | Yes | Allowed frontend origins | http://localhost:3000 |
| LOG_LEVEL | No | Logging level | INFO |
| FFMPEG_PATH | No | ffmpeg binary path | ffmpeg |
| FFPROBE_PATH | No | ffprobe binary path | ffprobe |
| QUEUE_CONNECTION_STRING | No | Queue broker URL/connection string | redis://localhost:6379/0 |
| STORAGE_PROVIDER | Yes | Storage backend selector | local |

## Endpoint Module Map
- Health: `src/clinic_ai_india/api/routers/health.py`
- Patients: `src/clinic_ai_india/api/routers/patients.py`
- Intake: `src/clinic_ai_india/api/routers/intake.py`
- Notes: `src/clinic_ai_india/api/routers/notes.py`
- Audio: `src/clinic_ai_india/api/routers/audio.py`
- Prescriptions: `src/clinic_ai_india/api/routers/prescriptions.py`
- Doctor: `src/clinic_ai_india/api/routers/doctor.py`
- Transcription: `src/clinic_ai_india/api/routers/transcription.py`
- Workflow: `src/clinic_ai_india/api/routers/workflow.py`
