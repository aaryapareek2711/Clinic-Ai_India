# Clinic AI India — Frontend

React + TypeScript + **Vite** single-page app for clinicians: authentication, calendar, visits, patients, templates, care prep, transcription review, and related workflows. It expects the **[Clinic AI India FastAPI backend](../clinic_ai_backend/)** for `/api` routes.

For **MongoDB, API keys, and deployment order**, read the **[root `README.md`](../README.md)** first.

---

## Prerequisites

- **Node.js 20+**
- **npm** (ships with Node)

---

## Install

```bash
npm ci
```

Use **`npm install`** only when you intentionally change dependencies (`package.json` / lockfile).

---

## Environment variables

Copy **[`.env.example`](.env.example)** to **`.env`** or **`.env.local`** in this directory. Vite reads env files from the project root; restart **`npm run dev`** after edits.

| Variable | Purpose |
|----------|---------|
| **`VITE_API_BASE_URL`** | **Production / static hosting:** absolute API origin (e.g. `https://api.example.com`). The built SPA calls this directly — browser CORS must allow your site origin (configure **`CORS_ORIGINS`** on the API). |
| **`VITE_API_PROXY_TARGET`** | **Local dev:** backend URL the **Vite dev server** proxies to. Default if unset: `http://localhost:8000`. Use this when the API runs on another host/port or you want to hit a **remote** API without browser CORS issues (requests stay same-origin to Vite; Node forwards to the API). |
| **`VITE_PROVIDER_ID`** | Optional fallback for provider-scoped URLs before login; after login the app uses **`doctor_id`** from auth (stored as `auth_doctor_id`). |

### Typical setups

**A — Local backend on port 8000 (default)**  

- Leave **`VITE_API_BASE_URL`** unset.  
- Omit **`VITE_API_PROXY_TARGET`** or set `http://localhost:8000`.  
- Run backend on `8000`, run `npm run dev`, open `http://localhost:5173`.

**B — Remote API during dev (e.g. Render)**  

- Leave **`VITE_API_BASE_URL`** unset.  
- Set **`VITE_API_PROXY_TARGET=https://your-api.example.com`**.  
- Browser talks only to Vite; no extra CORS configuration in the browser.

**C — Production build (Netlify, Vercel static, S3, etc.)**  

- Set **`VITE_API_BASE_URL`** at build time to your public API base URL.  
- Rebuild when the API URL changes.

---

## Dev server & proxy

```bash
npm run dev
```

Default app URL: **`http://localhost:5173`**.

The Vite config (**[`vite.config.ts`](vite.config.ts)**) proxies:

- **`/api`** → `VITE_API_PROXY_TARGET` (default `http://localhost:8000`)
- **`/health`**
- **`/webhooks`**

`secure: false` and extended timeouts help hosted HTTPS backends and cold starts.

---

## Scripts

| Script | Description |
|--------|-------------|
| **`npm run dev`** | Start Vite dev server. |
| **`npm run build`** | Typecheck (`tsc -b`) + production bundle to **`dist/`**. |
| **`npm run preview`** | Serve **`dist/`** locally (verify production build). |
| **`npm run lint`** | ESLint. |

---

## Production build

1. Set **`VITE_API_BASE_URL`** (and any other `VITE_*` vars) for your environment.  
2. Run:

```bash
npm run build
```

3. Deploy the **`dist/`** folder to your static host or CDN.  
4. Ensure the API **`CORS_ORIGINS`** includes your frontend origin.

---

## Troubleshooting

| Issue | Things to check |
|-------|------------------|
| API 401 / CORS errors in browser | **`CORS_ORIGINS`** on backend; for dev proxy, confirm **`VITE_API_PROXY_TARGET`** and that you did not set **`VITE_API_BASE_URL`** incorrectly. |
| Calls go to wrong host | **`VITE_API_BASE_URL`** overrides relative `/api` behavior in production builds — verify build-time env on your host. |
| Stale env | Restart **`npm run dev`** after changing `.env.local`. |

---

## Repository layout

This package is **`clinic_ai_frontend/`** in the monorepo. The Python API lives in **`../clinic_ai_backend/`**.
