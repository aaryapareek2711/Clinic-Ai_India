import axios from 'axios'

/**
 * Default to same-origin API paths.
 * In local `vite` dev, this is proxied to backend via `vite.config.ts`.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

function backendReachabilityHint(): string {
  if (API_BASE_URL) {
    return `Cannot reach the API at ${API_BASE_URL}. Check the URL, your network, and that the backend allows CORS from this origin.`
  }
  const proxyTarget =
    typeof import.meta.env.VITE_API_PROXY_TARGET === 'string' ? import.meta.env.VITE_API_PROXY_TARGET.trim() : ''
  const proxyLine = proxyTarget
    ? ` Current Vite proxy target: ${proxyTarget}.`
    : ''
  return `Cannot reach the API through the Vite dev proxy (default target http://localhost:8000).${proxyLine} Start clinic_ai_backend on port 8000, or set VITE_API_BASE_URL (or VITE_API_PROXY_TARGET) in clinic_ai_frontend/.env.local and restart npm run dev.`
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      const code = err.code
      if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || err.message === 'Network Error') {
        return backendReachabilityHint()
      }
      return err.message ? `${err.message}. ${backendReachabilityHint()}` : backendReachabilityHint()
    }
    const data = err.response.data
    if (typeof data === 'string') return data
    if (data && typeof data === 'object' && 'detail' in data) {
      const d = (data as { detail: unknown }).detail
      if (typeof d === 'string') return d
      if (d != null) return JSON.stringify(d)
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
