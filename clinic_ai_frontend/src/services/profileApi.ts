import { apiClient, getApiErrorMessage } from '../lib/apiClient'

export type ProviderProfile = {
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

export type ProviderProfilePatch = Partial<{
  full_name: string
  phone: string
  job_title: string
  medical_license_number: string
  avatar_url: string
}>

const PROFILE_CACHE_TTL_MS = 60_000
let profileCache: ProviderProfile | null = null
let profileCacheAt = 0
let profileInFlight: Promise<ProviderProfile> | null = null

/** Clears in-memory profile cache so the next `fetchMyProfile` hits the network. */
export function invalidateMyProfileCache(): void {
  profileCache = null
  profileCacheAt = 0
}

/** Dispatched after a successful profile PATCH so mounted UI (e.g. sidebar) can refresh. */
export const PROVIDER_PROFILE_UPDATED_EVENT = 'clinic-provider-profile-updated'

function persistProfileToLocalStorage(data: ProviderProfile): void {
  try {
    localStorage.setItem('auth_user_full_name', (data.full_name || '').trim())
    localStorage.setItem('auth_user_username', (data.username || '').trim())
    localStorage.setItem('auth_user_job_title', (data.job_title || '').trim())
    localStorage.setItem('auth_user_role', (data.role || '').trim())
  } catch {
    /* ignore */
  }
}

function authHeaders(): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('access_token') ?? localStorage.getItem('token')
      : null
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function fetchMyProfile(): Promise<ProviderProfile> {
  const now = Date.now()
  if (profileCache && now - profileCacheAt < PROFILE_CACHE_TTL_MS) {
    return profileCache
  }
  if (profileInFlight) return profileInFlight
  profileInFlight = (async () => {
    const { data } = await apiClient.get<ProviderProfile>('/api/auth/me', {
      headers: authHeaders(),
    })
    profileCache = data
    profileCacheAt = Date.now()
    persistProfileToLocalStorage(data)
    return data
  })()
  try {
    return await profileInFlight
  } finally {
    profileInFlight = null
  }
}

export async function patchMyProfile(body: ProviderProfilePatch): Promise<ProviderProfile> {
  const { data } = await apiClient.patch<ProviderProfile>('/api/auth/me', body, {
    headers: authHeaders(),
  })
  persistProfileToLocalStorage(data)
  invalidateMyProfileCache()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROVIDER_PROFILE_UPDATED_EVENT))
  }
  return data
}

export { getApiErrorMessage }
