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

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  return String(v).trim()
}

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    const s = str(v)
    if (s) return s
  }
  return ''
}

/** Map Compass / legacy field names onto the shape the settings UI expects. */
export function coerceProviderProfile(raw: unknown): ProviderProfile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid profile response')
  }
  const r = raw as Record<string, unknown>
  return {
    id: str(r.id),
    email: firstNonEmpty(r.email, r.email_address, r.user_email) || str(r.email),
    username: str(r.username),
    full_name: firstNonEmpty(r.full_name, r.display_name, r.name, r.fullName, r.doctor_name, r.provider_name),
    phone: (() => {
      const p = firstNonEmpty(r.phone, r.phone_number, r.mobile, r.whatsapp_number, r.contact_phone)
      return p || null
    })(),
    role: str(r.role) || 'doctor',
    job_title: (() => {
      const j = firstNonEmpty(
        r.job_title,
        r.specialization,
        r.title,
        r.clinical_title,
        r.designation,
        r.speciality,
        r.specialty,
      )
      return j || null
    })(),
    medical_license_number: (() => {
      const m = firstNonEmpty(
        r.medical_license_number,
        r.medical_registration,
        r.license_number,
        r.registration_number,
        r.medical_license,
        r.nmc_number,
        r.registration_no,
        r.license_no,
      )
      return m || null
    })(),
    avatar_url: (() => {
      const a = firstNonEmpty(
        r.avatar_url,
        r.profile_image_url,
        r.photo_url,
        r.image_url,
        r.picture,
        r.profile_photo_url,
        r.portrait_url,
      )
      return a || null
    })(),
    is_active: Boolean(r.is_active ?? true),
    is_verified: Boolean(r.is_verified ?? true),
    tenant_id: r.tenant_id != null ? str(r.tenant_id) : null,
  }
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
    const normalized = coerceProviderProfile(data)
    profileCache = normalized
    profileCacheAt = Date.now()
    persistProfileToLocalStorage(normalized)
    return normalized
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
  return normalized
}

export { getApiErrorMessage }
