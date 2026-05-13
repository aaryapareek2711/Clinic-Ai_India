import axios from 'axios'

import { apiClient, API_BASE_URL } from '../lib/apiClient'
import { AUTH_DOCTOR_ID_STORAGE_KEY } from '../lib/authSession'

import { invalidateMyProfileCache } from './profileApi'

export type AuthUser = {
  id: string
  /** Matches Mongo tenant scope (`DOC001`, …); required for `/api/visits/provider/{id}`. */
  doctor_id?: string | null
  email: string
  username: string
  full_name: string
  phone?: string | null
  role: string
  job_title?: string | null
  medical_license_number?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_verified: boolean
  tenant_id?: string | null
  opd_morning_start?: string | null
  opd_morning_end?: string | null
  opd_evening_enabled?: boolean
  opd_evening_start?: string | null
  opd_evening_end?: string | null
}

export type AuthResponse = {
  user: AuthUser
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export function persistAuthSession(res: AuthResponse): void {
  invalidateMyProfileCache()
  try {
    localStorage.setItem('access_token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
    localStorage.setItem('auth_user_full_name', (res.user.full_name || '').trim())
    localStorage.setItem('auth_user_username', (res.user.username || '').trim())
    localStorage.setItem('auth_user_job_title', (res.user.job_title || '').trim())
    localStorage.setItem('auth_user_role', (res.user.role || '').trim())
    const did = (res.user.doctor_id || '').trim().toUpperCase()
    if (did) localStorage.setItem(AUTH_DOCTOR_ID_STORAGE_KEY, did)
    else localStorage.removeItem(AUTH_DOCTOR_ID_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** POST /api/auth/refresh — standalone axios so apiClient 401 interceptor does not recurse. */
export async function refreshAuthSession(): Promise<AuthResponse> {
  const rt =
    typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token')?.trim() : ''
  if (!rt) {
    throw new Error('No refresh token')
  }
  const base = API_BASE_URL.replace(/\/$/, '')
  const url = base ? `${base}/api/auth/refresh` : '/api/auth/refresh'
  const { data } = await axios.post<AuthResponse>(
    url,
    { refresh_token: rt },
    { headers: { 'Content-Type': 'application/json' } },
  )
  return data
}

/** POST /api/auth/login — `username` may be username or email (matches backend). */
export async function loginWithPassword(username: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', {
    username: username.trim(),
    password,
  })
  return data
}

export type RegisterPayload = {
  email: string
  username: string
  password: string
  full_name: string
  phone?: string | null
  role?: string
  job_title?: string | null
  medical_license_number?: string | null
  opd_morning_start?: string | null
  opd_morning_end?: string | null
  opd_evening_enabled?: boolean
  opd_evening_start?: string | null
  opd_evening_end?: string | null
}

/** POST /api/auth/register */
export async function registerAccount(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register', {
    email: payload.email.trim(),
    username: payload.username.trim(),
    password: payload.password,
    full_name: payload.full_name.trim(),
    phone: payload.phone?.trim() || null,
    role: (payload.role || 'doctor').trim() || 'doctor',
    job_title: payload.job_title?.trim() || null,
    medical_license_number: payload.medical_license_number?.trim() || null,
    opd_morning_start: payload.opd_morning_start?.trim() || null,
    opd_morning_end: payload.opd_morning_end?.trim() || null,
    opd_evening_enabled: Boolean(payload.opd_evening_enabled),
    opd_evening_start: payload.opd_evening_start?.trim() || null,
    opd_evening_end: payload.opd_evening_end?.trim() || null,
  })
  return data
}
