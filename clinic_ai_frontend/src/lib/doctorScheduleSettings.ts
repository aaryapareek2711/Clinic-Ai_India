export type DoctorScheduleSettings = {
  opdStart: string
  opdEnd: string
  addEveningShift: boolean
  eveningStart: string
  eveningEnd: string
  defaultSlotMinutes: number
}

/** Fired after `saveDoctorScheduleSettings` so booking pages refresh slot grids without a full reload. */
export const DOCTOR_SCHEDULE_UPDATED_EVENT = 'clinic-doctor-schedule-updated'

const KEY = 'doctor_schedule_settings'

/** Parse signup/API time: `HH:MM` (24h) or `h:mm AM` / `hh:mm PM` → `HH:MM` 24h; invalid → null. */
export type ServerOpdFields = {
  opd_morning_start?: string | null
  opd_morning_end?: string | null
  opd_evening_enabled?: boolean
  opd_evening_start?: string | null
  opd_evening_end?: string | null
}

/** Persist signup / GET `/api/auth/me` OPD fields into local booking schedule + notify listeners. */
export function syncDoctorScheduleFromServer(opd: ServerOpdFields): void {
  const base = getDoctorScheduleSettings()
  const ms = parseOpdTimeTo24h(opd.opd_morning_start)
  const mend = parseOpdTimeTo24h(opd.opd_morning_end)
  const es = parseOpdTimeTo24h(opd.opd_evening_start)
  const en = parseOpdTimeTo24h(opd.opd_evening_end)
  if (!ms || !mend) return
  const eveningOn = Boolean(opd.opd_evening_enabled) && Boolean(es && en)
  saveDoctorScheduleSettings({
    ...base,
    opdStart: ms,
    opdEnd: mend,
    addEveningShift: eveningOn,
    eveningStart: es || base.eveningStart,
    eveningEnd: en || base.eveningEnd,
    defaultSlotMinutes: base.defaultSlotMinutes,
  })
}

export function parseOpdTimeTo24h(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return s
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let h = Number.parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3].toUpperCase()
  if (!Number.isFinite(h) || h < 1 || h > 12) return null
  if (ap === 'AM') {
    if (h === 12) h = 0
  } else if (h !== 12) {
    h += 12
  }
  return `${String(h).padStart(2, '0')}:${min}`
}

export const DEFAULT_DOCTOR_SCHEDULE: DoctorScheduleSettings = {
  opdStart: '09:00',
  opdEnd: '18:00',
  addEveningShift: false,
  eveningStart: '17:00',
  eveningEnd: '21:00',
  defaultSlotMinutes: 15,
}

function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function getDoctorScheduleSettings(): DoctorScheduleSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_DOCTOR_SCHEDULE
    const parsed = JSON.parse(raw) as Partial<DoctorScheduleSettings>
    const candidate: DoctorScheduleSettings = {
      opdStart: typeof parsed.opdStart === 'string' && validTime(parsed.opdStart) ? parsed.opdStart : DEFAULT_DOCTOR_SCHEDULE.opdStart,
      opdEnd: typeof parsed.opdEnd === 'string' && validTime(parsed.opdEnd) ? parsed.opdEnd : DEFAULT_DOCTOR_SCHEDULE.opdEnd,
      addEveningShift: !!parsed.addEveningShift,
      eveningStart:
        typeof parsed.eveningStart === 'string' && validTime(parsed.eveningStart)
          ? parsed.eveningStart
          : DEFAULT_DOCTOR_SCHEDULE.eveningStart,
      eveningEnd:
        typeof parsed.eveningEnd === 'string' && validTime(parsed.eveningEnd)
          ? parsed.eveningEnd
          : DEFAULT_DOCTOR_SCHEDULE.eveningEnd,
      defaultSlotMinutes:
        typeof parsed.defaultSlotMinutes === 'number' && parsed.defaultSlotMinutes >= 5 && parsed.defaultSlotMinutes <= 120
          ? Math.round(parsed.defaultSlotMinutes)
          : DEFAULT_DOCTOR_SCHEDULE.defaultSlotMinutes,
    }
    return candidate
  } catch {
    return DEFAULT_DOCTOR_SCHEDULE
  }
}

export function saveDoctorScheduleSettings(next: DoctorScheduleSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DOCTOR_SCHEDULE_UPDATED_EVENT))
  }
}

