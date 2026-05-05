export type DoctorScheduleSettings = {
  opdStart: string
  opdEnd: string
  addEveningShift: boolean
  eveningStart: string
  eveningEnd: string
  defaultSlotMinutes: number
}

const KEY = 'doctor_schedule_settings'

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
}

