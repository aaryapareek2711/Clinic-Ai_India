# Clinic AI India — Backend

FastAPI service for the Clinic AI India provider product: patient/visit APIs, clinical notes (OpenAI), **Azure Speech** transcription with a MongoDB-backed job queue, optional **WhatsApp** webhooks, and JWT authentication.

For **full-stack** setup order and deployment checklist, start at the repository **[root `README.md`](../README.md)**.

---

## Prerequisites

| Requirement | Purpose |
|-------------|---------|
| **Python 3.11+** | Runtime |
| **MongoDB** | Application data + `transcription_queue`; production uses **GridFS** for uploaded audio |
| **ffmpeg** & **ffprobe** on `PATH` | Worker normalizes many MP3/M4A uploads before Azure Speech (see below). Dockerfiles install these. |
| Provider keys | **OpenAI**, **Azure Speech**; **Meta WhatsApp** if you use intake/follow-up messaging |

---

## Quick setup (local)

From this directory (`clinic_ai_backend/`):

```bash
python -m venv .venv
```

Activate:

- **Windows:** `.venv\Scripts\activate`
- **macOS/Linux:** `source .venv/bin/activate`

```bash
pip install -r requirements.txt
copy .env.example .env
```

Edit **`.env`** — required keys depend on features you enable; see **[Environment variables](#environment-variables)** and the annotated **[`.env.example`](.env.example)**.

### MongoDB only via Docker

```bash
docker compose up -d mongo
```

Use `MONGODB_URL=mongodb://localhost:27017/clinic_ai` (and matching `MONGODB_DB_NAME`) unless you override the compose file.

### Run the API

| Command | When to use |
|---------|-------------|
| **`make dev`** | Local development — **auto-reload** on code changes (`scripts/bootstrap_dev.py`). |
| **`python startup.py`** | Same app **without** reload — closer to production behavior. |

Default bind: **`API_HOST`** / **`API_PORT`** (see `.env.example`), typically `http://0.0.0.0:8000`.

**Smoke test:** `GET /health`

Background **transcription workers** and scheduled tasks can run in-process (lifespan) or as separate processes — see **`Makefile`** targets `worker` and `sweeper` and **`deployments/docker/`** for split containers.

---

## Environment variables

Authoritative template with comments: **[`.env.example`](.env.example)**.

### Minimum for core features

| Variable | Required when | Description |
|----------|----------------|-------------|
| `MONGODB_URL` | Always | MongoDB connection URI |
| `MONGODB_DB_NAME` | Always | Database name |
| `JWT_SECRET_KEY` | Always (auth) | Signing secret for JWT — **use a long random value in production** |
| `CORS_ORIGINS` | Browser clients | Comma-separated allowed SPA origins, **no spaces** |
| `OPENAI_API_KEY` | Notes / structured dialogue | OpenAI API key |
| `AZURE_SPEECH_KEY` | Transcription | Azure Cognitive Services Speech |
| `AZURE_SPEECH_REGION` | Transcription | e.g. `centralindia` (unless endpoint fully specifies region) |

Optional but common:

| Variable | Description |
|----------|-------------|
| `CORS_ORIGIN_REGEX` | Regex for dynamic preview hosts (e.g. Vercel previews) |
| `OPENAI_MODEL` | Model id (default in settings may apply if unset) |
| `ENCRYPTION_KEY` | Fernet key for sensitive fields — generate for production |
| `WHATSAPP_*` | Meta WhatsApp Cloud API — see `.env.example` |
| `USE_LOCAL_ADAPTERS` | `true` for in-process queue / local file audio when not using full PyMongo GridFS |
| `LOCAL_AUDIO_STORAGE_PATH` | Temp audio directory when using local file storage |
| `MONGO_AUDIO_BUCKET_NAME` | GridFS bucket name on real MongoDB |

### CORS on hosted APIs (e.g. Render)

Set **`CORS_ORIGINS`** to your real frontend origins, for example:

`https://your-app.example.com,http://localhost:5173,http://127.0.0.1:5173`

Redeploy or restart after changing environment variables.

---

## Production notes

### Azure Speech and ffmpeg

Transcription uses Azure **short-audio** REST with raw POST body bytes. **ffmpeg** normalizes many uploads to 16 kHz mono WAV first. If ffmpeg is missing, the worker may fall back to original bytes and some MP3 variants fail more often.

- **Docker:** use **`deployments/docker/Dockerfile.api`** / **`Dockerfile.worker`** (ffmpeg included).  
- **Bare metal / PaaS:** install ffmpeg in the image or buildpack.

### Transcription storage model

- **Queue:** MongoDB collection **`transcription_queue`** (not Azure Storage Queue).  
- **Audio:** **GridFS** when using a normal PyMongo database connection; otherwise **`LOCAL_AUDIO_STORAGE_PATH`** + `file://` refs for dev/tests.

### Speaker dialogue (manual structure endpoint)

When transcription **completes**, the visit stores the **raw transcript** only; **`transcription_session.structured_dialogue`** stays empty until a clinician runs **`POST /api/notes/{patient_id}/visits/{visit_id}/dialogue/structure`** (OpenAI, requires **`OPENAI_API_KEY`**). That avoids overwriting good LLM turns with segment-heuristic dialogue on first upload or **re-upload**.

Segment-level STT output (including speaker labels when Azure returns them) remains on the **`transcription_results`** document and in visit **`metadata["segments"]`** for auditing.

---

## Intake feature flags (WhatsApp / LLM)

Safe defaults (see root intake docs in older deployments):

- `INTAKE_USE_LLM_MESSAGE=false`
- `INTAKE_REQUIRE_ALL_AGENTS=true`
- `INTAKE_STRICT_VALIDATION=true`

Gradually enable LLM messaging in staging before production; monitor fallback rates. Extended rollout guidance remains available in internal runbooks — align with your observability stack.

---

## API layout (reference)

| Area | Router module |
|------|----------------|
| Health | `src/api/routers/health.py` |
| Auth | `src/api/routers/auth.py` |
| Patients | `src/api/routers/patients.py` |
| Visits / notes | `src/api/routers/visits.py`, `notes.py` |
| Transcription | `src/api/routers/transcription.py` |
| Vitals | `src/api/routers/vitals.py` |
| WhatsApp | `src/api/routers/whatsapp.py` |

---

## Architecture (short)

Clean-style layering: **`api`** → **`application`** (use cases, services) → **`domain`** → **`adapters`** (MongoDB, queues, Azure, OpenAI). Workers under **`src/workers/`**.

---

## Commands (`Makefile`)

| Target | Action |
|--------|--------|
| `make install` | `pip install -r requirements.txt` |
| `make dev` | Dev server with reload |
| `make run` | `python startup.py` |
| `make test` | `pytest -q` |
| `make lint` | `ruff check src tests` |
| `make format` | `ruff format src tests` |
| `make worker` | `python worker_startup.py` |
| `make sweeper` | `python sweeper_startup.py` |

---

## Tests

```bash
make test
```

Integration tests use an in-memory DB stub in **`tests/conftest.py`**; they do not require a live MongoDB.
