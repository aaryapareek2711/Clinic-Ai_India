# Clinic AI India

Monorepo for the Clinic AI India provider portal and API: a React (Vite) frontend that talks to a Python (FastAPI) backend with MongoDB, OpenAI, Azure Speech, and Meta WhatsApp integrations.

## Tech stack

| Area | Technology |
|------|------------|
| Frontend | React 19, TypeScript, Vite 8, TanStack Query, React Router, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic, PyMongo |
| Data | MongoDB (documents + GridFS for audio), optional Fernet/JWT auth settings |
| Integrations | OpenAI, Azure Cognitive Services (Speech), Meta WhatsApp Cloud API |

## Repository layout

| Path | Purpose |
|------|---------|
| `clinic_ai_frontend/` | Provider SPA (login, dashboard, visits, patients, templates, settings, care prep). |
| `clinic_ai_backend/` | REST API, domain/application layers, workers (transcription, AI jobs), deployment assets. |
| `stitch_exports/` | Optional UI design reference exports (Stitch). Not required to run the app. |
| Root `package.json` | Legacy/minimal dependencies; **run installs inside `clinic_ai_frontend/`** for the app. |

## Prerequisites

- **Node.js** 20+ (for the frontend)
- **Python** 3.11+ (for the backend)
- **MongoDB** reachable from the backend (local or Atlas)
- **ffmpeg** / **ffprobe** on `PATH` for long-audio transcription normalization (see backend README)

## Quick start

### Backend

```bash
cd clinic_ai_backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
copy .env.example .env      # Windows: copy .env.example .env
# Edit .env with your MongoDB URI and API keys (never commit .env)
make dev
# API: http://localhost:8000  — health: GET /health
```

Alternatively: `python startup.py` after activating the venv and configuring `.env`.

Background workers (transcription queue, AI jobs) start with the API process via `lifespan` in `src/app.py`. For dedicated worker processes in production, see `Makefile` (`worker`, `sweeper`) and deployment Dockerfiles under `deployments/docker/`.

### Frontend

```bash
cd clinic_ai_frontend
npm ci
copy .env.example .env.local   # optional; see comments inside for API URL / proxy
npm run dev
# App: http://localhost:5173 (default)
```

Set `VITE_API_BASE_URL` for production builds pointing at your hosted API, or use the Vite dev proxy (`VITE_API_PROXY_TARGET`) for local development against a remote backend (see `clinic_ai_frontend/.env.example`).

## Environment variables

- **Backend:** Copy `clinic_ai_backend/.env.example` to `clinic_ai_backend/.env`. Full variable reference and operational notes are in `clinic_ai_backend/README.md`.
- **Frontend:** See `clinic_ai_frontend/.env.example` (`VITE_API_BASE_URL`, `VITE_API_PROXY_TARGET`, optional `VITE_PROVIDER_ID`).

## Commands

| Location | Command | Purpose |
|----------|---------|---------|
| `clinic_ai_frontend/` | `npm run dev` | Vite dev server |
| `clinic_ai_frontend/` | `npm run build` | Production build (`tsc` + Vite) |
| `clinic_ai_frontend/` | `npm run lint` | ESLint |
| `clinic_ai_backend/` | `make dev` | Bootstrap dev (see Makefile) |
| `clinic_ai_backend/` | `make test` | Pytest |
| `clinic_ai_backend/` | `make lint` | Ruff check |

## Documentation

- **Backend details:** `clinic_ai_backend/README.md` (CORS, transcription, WhatsApp, env table).
- **Architecture overview:** `TECHNICAL_OVERVIEW.md`.

## Deployment notes

- **CORS:** Backend reads `CORS_ORIGINS` (comma-separated, no spaces). Set your production frontend origin(s) on the API host.
- **Docker / Kubernetes / Render:** Files under `clinic_ai_backend/deployments/` and `docker-compose.yml` illustrate patterns; adjust secrets via environment variables or your platform’s secret manager—never bake secrets into images.

## Security

- Do **not** commit `.env` files or real credentials. Example files use placeholders only.
- If credentials were ever committed, rotate them in the respective providers (MongoDB Atlas, OpenAI, Meta, Azure) even after sanitizing the repo.

## License / ownership

Configure license and copyright as required by your organization before external distribution.
