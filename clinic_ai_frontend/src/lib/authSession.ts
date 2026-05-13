/** Persisted from `/api/auth/login`, `/api/auth/register`, and `/api/auth/me` — must match visit URLs. */
export const AUTH_DOCTOR_ID_STORAGE_KEY = 'auth_doctor_id'

/** Shared keys for provider session (login / signup / logout). */
export function clearAuthSession(): void {
  for (const k of [
    'access_token',
    'token',
    'refresh_token',
    'auth_user_full_name',
    'auth_user_username',
    'auth_user_job_title',
    'auth_user_role',
    AUTH_DOCTOR_ID_STORAGE_KEY,
  ]) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

export function hasAuthToken(): boolean {
  if (typeof localStorage === 'undefined') return false
  return !!(localStorage.getItem('access_token') ?? localStorage.getItem('token'))
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const t = token.trim()
  if (!t) return null
  const parts = t.split('.')
  if (parts.length < 2) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = atob(`${b64}${pad}`)
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function getStoredAuthProfile(): {
  fullName: string
  username: string
  jobTitle: string
  role: string
} {
  if (typeof localStorage === 'undefined') {
    return { fullName: '', username: '', jobTitle: '', role: '' }
  }
  const fullName = (localStorage.getItem('auth_user_full_name') || '').trim()
  let username = (localStorage.getItem('auth_user_username') || '').trim()
  const jobTitle = (localStorage.getItem('auth_user_job_title') || '').trim()
  const role = (localStorage.getItem('auth_user_role') || '').trim()

  if (!username) {
    const token = localStorage.getItem('access_token') ?? localStorage.getItem('token') ?? ''
    const payload = decodeJwtPayload(token)
    const email = typeof payload?.email === 'string' ? payload.email.trim() : ''
    const emailUser = email.includes('@') ? email.split('@')[0].trim() : ''
    const claimUser = typeof payload?.username === 'string' ? payload.username.trim() : ''
    username = claimUser || emailUser
  }

  return { fullName, username, jobTitle, role }
}
