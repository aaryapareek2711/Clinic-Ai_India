import {
  DEFAULT_CLOSED_DAYS,
  type DoctorScheduleSettings,
  type OpdDayKey,
  type OpdDayScheduleRow,
} from './doctorScheduleSettings'

export type EffectiveDayRow = {
  closed: boolean
  morningStart: string
  morningEnd: string
  eveningEnabled: boolean
  eveningStart: string
  eveningEnd: string
}

const JS_TO_KEY: OpdDayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export function weekdayKeyFromDateStr(dateStr: string): OpdDayKey {
  const d = new Date(`${dateStr}T12:00:00`)
  return JS_TO_KEY[d.getDay()]
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Parse HH:mm 24h → 12h clock pieces for dropdowns. */
export function clockPartsFrom24h(hhmm: string): { h12: number; mm: string; mer: 'AM' | 'PM' } {
  const [hRaw, mRaw] = hhmm.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return { h12: 9, mm: '00', mer: 'AM' }
  }
  const mer: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { h12, mm: pad2(m), mer }
}

export function to24h(h12: number, mm: string, mer: 'AM' | 'PM'): string {
  const minute = Number(mm)
  const m = Number.isFinite(minute) && minute >= 0 && minute <= 59 ? minute : 0
  let h24: number
  if (mer === 'AM') {
    h24 = h12 === 12 ? 0 : h12
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12
  }
  return `${pad2(h24)}:${pad2(m)}`
}

export function minutesFromHHmm(v: string): number {
  const [h, m] = v.split(':').map((n) => Number(n))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * Row from saved weekly schedule, or synthesized from signup globals (`DoctorScheduleSettings` opd fields).
 */
export function effectiveDayRow(schedule: DoctorScheduleSettings, dayKey: OpdDayKey): EffectiveDayRow {
  const custom = schedule.weeklySchedule?.find((r: OpdDayScheduleRow) => r.day === dayKey)
  if (custom) {
    return {
      closed: custom.closed,
      morningStart: custom.morningStart,
      morningEnd: custom.morningEnd,
      eveningEnabled: custom.eveningEnabled,
      eveningStart: custom.eveningStart,
      eveningEnd: custom.eveningEnd,
    }
  }
  const closed = DEFAULT_CLOSED_DAYS.has(dayKey)
  return {
    closed,
    morningStart: schedule.opdStart,
    morningEnd: schedule.opdEnd,
    eveningEnabled: closed ? false : schedule.addEveningShift,
    eveningStart: schedule.eveningStart,
    eveningEnd: schedule.eveningEnd,
  }
}

export function getSlotWindowsForDate(schedule: DoctorScheduleSettings, dateStr: string): Array<{ startMin: number; endMin: number }> {
  const dayKey = weekdayKeyFromDateStr(dateStr)
  const row = effectiveDayRow(schedule, dayKey)
  if (row.closed) return []
  const out: Array<{ startMin: number; endMin: number }> = []
  const ms = minutesFromHHmm(row.morningStart)
  const me = minutesFromHHmm(row.morningEnd)
  if (me > ms) out.push({ startMin: ms, endMin: me })
  if (row.eveningEnabled) {
    const es = minutesFromHHmm(row.eveningStart)
    const ee = minutesFromHHmm(row.eveningEnd)
    if (ee > es) out.push({ startMin: es, endMin: ee })
  }
  return out
}
