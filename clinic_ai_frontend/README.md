# Clinic AI India — Frontend

React + TypeScript + Vite SPA for healthcare providers: appointments, visits, clinical notes, patients, templates, and care-prep intake flows. It calls the **Clinic AI India** FastAPI backend (`clinic_ai_backend`).

## Requirements

- Node.js 20+
- npm (or compatible client)

## Setup

```bash
npm ci
```

Copy `.env.example` to `.env` or `.env.local` and adjust values (see file comments).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with API proxy (`vite.config.ts`). |
| `npm run build` | Typecheck (`tsc -b`) and production bundle. |
| `npm run lint` | ESLint on the project. |
| `npm run preview` | Preview the production build locally. |

## Environment variables

See `.env.example`. The app typically uses:

- **`VITE_API_BASE_URL`** — Absolute API root for production builds.
- **`VITE_API_PROXY_TARGET`** — Backend URL for the Vite dev proxy (`/api`, `/health`, `/webhooks`).
- **`VITE_PROVIDER_ID`** — Optional; used for provider-scoped visit listing.

## Repository root

The Git repository also contains the Python backend under `../clinic_ai_backend/`. See the root `README.md` for full-stack setup.
