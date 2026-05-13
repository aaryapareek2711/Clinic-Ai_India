# Clinic AI India

Monorepo for the **Clinic AI India** provider portal: a **React (Vite)** frontend and a **Python (FastAPI)** backend backed by **MongoDB**, with optional **OpenAI**, **Azure Speech** (transcription), and **Meta WhatsApp Cloud API** integrations.

Use this document for **full-stack orientation**. Detailed setup lives in:

1. **This file** — prerequisites, high-level flow, production checklist  
2. [`clinic_ai_backend/README.md`](clinic_ai_backend/README.md) — API, env vars, workers, transcription  
3. [`clinic_ai_frontend/README.md`](clinic_ai_frontend/README.md) — SPA, Vite proxy, build/deploy  

---

## Tech stack

| Area | Technology |
|------|------------|
| Frontend | React 19, TypeScript, Vite 8, TanStack Query, React Router, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic, PyMongo |
| Data | MongoDB (documents + GridFS for transcription audio) |
| Auth | JWT access + refresh (see backend `.env.example`) |
| Integrations | OpenAI (notes / dialogue structuring), Azure Cognitive Services Speech, Meta WhatsApp |

---

## Repository layout

| Path | Purpose |
|------|---------|
| [`clinic_ai_frontend/`](clinic_ai_frontend/) | Provider SPA (login, calendar, visits, patients, templates, care prep). |
| [`clinic_ai_backend/`](clinic_ai_backend/) | REST API, domain/application layers, background workers (`workers/`, queue consumers). |
| Root [`package.json`](package.json) | Minimal tooling only — **install and run the app from `clinic_ai_frontend/`**. |

---

## Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | 20+ (frontend) |
| **Python** | 3.11+ (backend) |
| **MongoDB** | Local, Docker, or Atlas — URI in backend `MONGODB_URL` |
| **ffmpeg** / **ffprobe** | On `PATH` for reliable transcription of MP3/long audio (see backend README). Docker images under `clinic_ai_backend/deployments/docker/` include ffmpeg. |

---

## First-time setup (local development)

Do these **in order** the first time on a machine.

### 1. MongoDB

- **Atlas:** create a cluster, allow your IP, copy an SRV connection string.  
- **Docker (example):** from `clinic_ai_backend/`, run `docker compose up -d mongo` to start MongoDB on port **27017** (see `docker-compose.yml`).  
- Point backend `MONGODB_URL` / `MONGODB_DB_NAME` at that database.

### 2. Backend

```bash
cd clinic_ai_backend
python -m venv .venv
```

Activate the venv:

- **Windows:** `.venv\Scripts\activate`
- **macOS/Linux:** `source .venv/bin/activate`

```bash
pip install -r requirements.txt
copy .env.example .env    # Windows — use cp on Unix
```

Edit **`clinic_ai_backend/.env`**: at minimum set **`MONGODB_URL`**, **`MONGODB_DB_NAME`**, **`JWT_SECRET_KEY`**, **`OPENAI_API_KEY`**, **`AZURE_SPEECH_KEY`** / **`AZURE_SPEECH_REGION`**, and **`CORS_ORIGINS`** (include `http://localhost:5173`). Full variable reference: [`clinic_ai_backend/.env.example`](clinic_ai_backend/.env.example) and [`clinic_ai_backend/README.md`](clinic_ai_backend/README.md).

Start the API (dev, with reload):

```bash
make dev
# equivalent: python scripts/bootstrap_dev.py
```

Smoke-check:

- **GET** `http://localhost:8000/health` → OK  

API binds to **`API_HOST`/`API_PORT`** (defaults `0.0.0.0:8000`).

### 3. Frontend

```bash
cd clinic_ai_frontend
npm ci
copy .env.example .env.local   # optional — see file comments
npm run dev
```

Open **`http://localhost:5173`**. With default env, the Vite dev server **proxies** `/api`, `/health`, and `/webhooks` to **`http://localhost:8000`** (override with `VITE_API_PROXY_TARGET`).

Details: [`clinic_ai_frontend/README.md`](clinic_ai_frontend/README.md).

---

## Production deployment (checklist)

1. **Secrets:** Never commit `.env`. Inject secrets via your host (Render, Fly, Kubernetes secrets, etc.).  
2. **Backend URL:** HTTPS API reachable from the internet if the SPA is hosted separately.  
3. **CORS:** Set **`CORS_ORIGINS`** on the API to your **exact** frontend origin(s), comma-separated, **no spaces**. Optional **`CORS_ORIGIN_REGEX`** for preview deployments (e.g. Vercel).  
4. **Frontend build:** `npm run build` in `clinic_ai_frontend/` with **`VITE_API_BASE_URL`** set to the public API root (no trailing slash ambiguity — follow frontend README).  
5. **JWT:** Strong **`JWT_SECRET_KEY`**, sensible **`ACCESS_TOKEN_EXPIRE_MINUTES`** / **`REFRESH_TOKEN_EXPIRE_DAYS`**.  
6. **MongoDB:** TLS (`mongodb+srv://` on Atlas), IP allowlist / VPC as appropriate.  
7. **ffmpeg:** Present on worker/API hosts if you rely on MP3 normalization (Dockerfiles already install it).  
8. **WhatsApp:** Webhook URL must match Meta configuration; tokens and phone number ID from Meta Business.

Example patterns: `clinic_ai_backend/deployments/`, `clinic_ai_backend/docker-compose.yml` (adjust for your environment).

---

## Common commands

| Location | Command | Purpose |
|----------|---------|---------|
| `clinic_ai_frontend/` | `npm run dev` | Vite dev server |
| `clinic_ai_frontend/` | `npm run build` | Production build |
| `clinic_ai_frontend/` | `npm run lint` | ESLint |
| `clinic_ai_backend/` | `make dev` | API with reload |
| `clinic_ai_backend/` | `python startup.py` | API without reload (closer to prod) |
| `clinic_ai_backend/` | `make test` | Pytest |
| `clinic_ai_backend/` | `make lint` | Ruff check |

---

## Security

- Do **not** commit real credentials. Rotate keys if they were ever exposed.  
- Treat **`ENCRYPTION_KEY`** and **`JWT_SECRET_KEY`** as production-critical.  

---

## License / ownership

Configure license and copyright as required by your organization before external distribution.
