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

export function getStoredAuthProfile(): {
  fullName: string
  username: string
  jobTitle: string
  role: string
} {
  if (typeof localStorage === 'undefined') {
    return { fullName: '', username: '', jobTitle: '', role: '' }
  }
  return {
    fullName: (localStorage.getItem('auth_user_full_name') || '').trim(),
    username: (localStorage.getItem('auth_user_username') || '').trim(),
    jobTitle: (localStorage.getItem('auth_user_job_title') || '').trim(),
    role: (localStorage.getItem('auth_user_role') || '').trim(),
  }
}
