import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

/**
 * Default to same-origin API paths.
 * In local `vite` dev, this is proxied to backend via `vite.config.ts`.
 */
const API_BASE_URL_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.NEXT_PUBLIC_API_BASE_URL,
  import.meta.env.NEXT_PUBLIC_API_URL,
  import.meta.env.API_URL,
] as const

export const API_BASE_URL =
  API_BASE_URL_CANDIDATES.map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => value.length > 0) || ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const path = (config.url ?? '').toString()
  if (
    path.includes('/api/auth/login') ||
    path.includes('/api/auth/register') ||
    path.includes('/api/auth/refresh')
  ) {
    return config
  }
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('access_token') ?? localStorage.getItem('token')
      : null
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? ({} as typeof config.headers)
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Single-flight refresh when access JWT expires (matches backend ``Token expired``). */
let refreshInFlight: Promise<void> | null = null

function fastApiDetail(err: AxiosError): string {
  const d = err.response?.data
  if (d && typeof d === 'object' && 'detail' in d) {
    const x = (d as { detail: unknown }).detail
    if (typeof x === 'string') return x
  }
  return ''
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!original || original._retry || status !== 401) {
      return Promise.reject(error)
    }
    const path = `${original.baseURL ?? ''}${original.url ?? ''}`
    if (
      path.includes('/api/auth/login') ||
      path.includes('/api/auth/register') ||
      path.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error)
    }
    const detail = fastApiDetail(error)
    if (detail !== 'Token expired') {
      return Promise.reject(error)
    }
    if (typeof localStorage === 'undefined' || !localStorage.getItem('refresh_token')?.trim()) {
      return Promise.reject(error)
    }
    try {
      if (!refreshInFlight) {
        refreshInFlight = (async () => {
          const { persistAuthSession, refreshAuthSession } = await import('../services/authApi')
          const data = await refreshAuthSession()
          persistAuthSession(data)
        })().finally(() => {
          refreshInFlight = null
        })
      }
      await refreshInFlight
      original._retry = true
      return apiClient(original)
    } catch {
      try {
        const { clearAuthSession } = await import('./authSession')
        clearAuthSession()
      } catch {
        /* ignore */
      }
      return Promise.reject(error)
    }
  },
)

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

function cleanServerMessage(raw: string): string {
  const text = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return 'Server returned an invalid response.'
  if (/service has been suspended/i.test(text)) {
    return 'API service is currently unavailable (service suspended by provider).'
  }
  return text
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
    if (typeof data === 'string') return cleanServerMessage(data)
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
