import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

function backendReachabilityHint(): string {
  return `Cannot reach the API at ${API_BASE_URL}. Start clinic_ai_backend (e.g. port 8000), set VITE_API_BASE_URL in clinic_ai_frontend/.env if needed, and allow this origin in CORS (e.g. http://localhost:5173).`
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
