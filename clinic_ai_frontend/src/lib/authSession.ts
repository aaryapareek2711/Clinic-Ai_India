/** Shared keys for provider session (login / signup / logout). */
export function clearAuthSession(): void {
  for (const k of ['access_token', 'token', 'refresh_token']) {
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
