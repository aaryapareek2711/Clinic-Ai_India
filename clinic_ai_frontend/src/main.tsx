import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

/** Match Vite `base` so `navigate('/visits')` stays under the same app URL (e.g. `/app/...`), not the site root. */
const routerBasename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
