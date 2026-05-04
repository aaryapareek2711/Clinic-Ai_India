import { apiClient } from '../lib/apiClient'

export type AuthUser = {
  id: string
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
}

export type AuthResponse = {
  user: AuthUser
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export function persistAuthSession(res: AuthResponse): void {
  try {
    localStorage.setItem('access_token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
  } catch {
    /* ignore */
  }
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
  })
  return data
}
