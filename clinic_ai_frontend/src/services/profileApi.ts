import { apiClient, getApiErrorMessage } from '../lib/apiClient'
import {
  DEFAULT_DOCTOR_SCHEDULE,
  getDoctorScheduleSettings,
  saveDoctorScheduleSettings,
  type DoctorScheduleSettings,
  type OpdDayKey,
  type OpdDayScheduleRow,
} from '../lib/doctorScheduleSettings'

export type OpdWeeklyDayPayload = {
  day: OpdDayKey
  closed: boolean
  morning_start: string | null
  morning_end: string | null
  evening_enabled: boolean
  evening_start: string | null
  evening_end: string | null
}

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
  opd_morning_start?: string | null
  opd_morning_end?: string | null
  opd_evening_enabled?: boolean
  opd_evening_start?: string | null
  opd_evening_end?: string | null
  opd_weekly_schedule?: OpdWeeklyDayPayload[] | null
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
  opd_morning_start: string
  opd_morning_end: string
  opd_evening_enabled: boolean
  opd_evening_start: string
  opd_evening_end: string
  opd_weekly_schedule: OpdWeeklyDayPayload[]
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

function validTime(v: string | null | undefined): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

function weeklyPayloadToRows(data: ProviderProfile): OpdDayScheduleRow[] | null {
  const w = data.opd_weekly_schedule
  if (!w || w.length !== 7) return null
  const rows: OpdDayScheduleRow[] = []
  for (const d of w) {
    const ms = d.morning_start && validTime(d.morning_start) ? d.morning_start : DEFAULT_DOCTOR_SCHEDULE.opdStart
    const me = d.morning_end && validTime(d.morning_end) ? d.morning_end : DEFAULT_DOCTOR_SCHEDULE.opdEnd
    const es =
      d.evening_start && validTime(d.evening_start) ? d.evening_start : DEFAULT_DOCTOR_SCHEDULE.eveningStart
    const ee = d.evening_end && validTime(d.evening_end) ? d.evening_end : DEFAULT_DOCTOR_SCHEDULE.eveningEnd
    rows.push({
      day: d.day,
      closed: d.closed,
      morningStart: ms,
      morningEnd: me,
      eveningEnabled: d.evening_enabled,
      eveningStart: es,
      eveningEnd: ee,
    })
  }
  const keys = new Set(rows.map((r) => r.day))
  if (keys.size !== 7) return null
  return rows
}

function profileToSchedule(data: ProviderProfile): DoctorScheduleSettings {
  const current = getDoctorScheduleSettings()
  const opdStart = validTime(data.opd_morning_start) ? data.opd_morning_start : DEFAULT_DOCTOR_SCHEDULE.opdStart
  const opdEnd = validTime(data.opd_morning_end) ? data.opd_morning_end : DEFAULT_DOCTOR_SCHEDULE.opdEnd
  const addEveningShift = Boolean(data.opd_evening_enabled)
  const eveningStart = validTime(data.opd_evening_start) ? data.opd_evening_start : DEFAULT_DOCTOR_SCHEDULE.eveningStart
  const eveningEnd = validTime(data.opd_evening_end) ? data.opd_evening_end : DEFAULT_DOCTOR_SCHEDULE.eveningEnd
  return {
    opdStart,
    opdEnd,
    addEveningShift,
    eveningStart,
    eveningEnd,
    defaultSlotMinutes: current.defaultSlotMinutes || DEFAULT_DOCTOR_SCHEDULE.defaultSlotMinutes,
    weeklySchedule: weeklyPayloadToRows(data),
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
    saveDoctorScheduleSettings(profileToSchedule(normalized))
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
  const normalized = coerceProviderProfile(data)
  persistProfileToLocalStorage(normalized)
  saveDoctorScheduleSettings(profileToSchedule(normalized))
  invalidateMyProfileCache()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROVIDER_PROFILE_UPDATED_EVENT))
  }
  return normalized
}

export { getApiErrorMessage }
