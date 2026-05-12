import { getDoctorScheduleSettings } from './doctorScheduleSettings'
import { getSlotWindowsForDate } from './opdWeeklySchedule'
import type { ProviderUpcomingAppointment } from '../services/visitWorkflowApi'

/** `YYYY-MM-DD` from a scheduled_start ISO in local timezone. */
export function dateKeyLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function hhmmFromMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function localSlotTimestamp(dateStr: string, hhmm: string): number {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const [hourStr, minuteStr] = hhmm.split(':')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (
    [year, month, day, hour, minute].some(Number.isNaN) ||
    year < 1970 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return Number.NaN
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime()
}

export function localSlotKeyFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export function addMinutesToIsoLocal(isoLocal: string, mins: number): string {
  const d = new Date(isoLocal)
  if (Number.isNaN(d.getTime())) return isoLocal
  d.setMinutes(d.getMinutes() + mins)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:00`
}

export type SlotBlock = {
  startIso: string
  endIso: string
  booked: boolean
}

/** Min date string for `<input type="date" min="…">` in local TZ. */
export function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatChipTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** HH:mm for a slot start ISO in local time (matches schedule-intake format). */
export function hhmmFromSlotStartIso(startIso: string): string {
  const d = new Date(startIso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function computeSlotsForDate(params: {
  dateStr: string
  appointmentDuration: number
  schedule: ReturnType<typeof getDoctorScheduleSettings>
  upcoming: ProviderUpcomingAppointment[]
  durationMap: Record<string, number>
  /** When editing an appointment, omit this visit from “booked” so its slot stays selectable. */
  excludeVisitId?: string
}): SlotBlock[] {
  const { dateStr, appointmentDuration, schedule, upcoming, durationMap, excludeVisitId } = params
  if (!dateStr) return []

  const selectedDateBooked = upcoming.filter((a) => {
    if (dateKeyLocal(a.scheduled_start) !== dateStr) return false
    if (excludeVisitId && a.visit_id === excludeVisitId) return false
    return true
  })

  const windows = getSlotWindowsForDate(schedule, dateStr)

  const bookedIntervals = selectedDateBooked
    .map((a) => {
      const startIso = a.scheduled_start
      const bookedKey = localSlotKeyFromIso(startIso)
      if (!bookedKey) return null
      const [bookedDate, bookedHm] = bookedKey.split('T')
      if (!bookedDate || !bookedHm) return null
      const startTime = localSlotTimestamp(bookedDate, bookedHm)
      if (Number.isNaN(startTime)) return null
      const d = new Date(startIso)
      if (Number.isNaN(d.getTime())) return null
      const startMin = d.getHours() * 60 + d.getMinutes()
      const duration = durationMap[startIso] ?? schedule.defaultSlotMinutes ?? 15
      const endMin = startMin + duration
      const endIso = addMinutesToIsoLocal(`${bookedDate}T${bookedHm}:00`, duration)
      return { startMin, endMin, startIso: `${bookedDate}T${bookedHm}:00`, endIso, startTime }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.startMin - b.startMin)

  const blocks: SlotBlock[] = []
  const now = Date.now()
  for (const w of windows) {
    let pointer = w.startMin
    while (pointer + appointmentDuration <= w.endMin) {
      const overlap = bookedIntervals.find((iv) => pointer < iv.endMin && pointer + appointmentDuration > iv.startMin)
      if (overlap) {
        if (overlap.startTime >= now - 60_000 && !blocks.some((b) => b.startIso === overlap.startIso)) {
          blocks.push({ startIso: overlap.startIso, endIso: overlap.endIso, booked: true })
        }
        pointer = Math.max(pointer + (schedule.defaultSlotMinutes || 15), overlap.endMin)
        continue
      }
      const slotHhmm = hhmmFromMinutes(pointer)
      const startTime = localSlotTimestamp(dateStr, slotHhmm)
      if (Number.isNaN(startTime) || startTime < now - 60_000) {
        pointer += schedule.defaultSlotMinutes || 15
        continue
      }
      const startIso = `${dateStr}T${slotHhmm}:00`
      const endIso = addMinutesToIsoLocal(startIso, appointmentDuration)
      blocks.push({ startIso, endIso, booked: false })
      pointer += schedule.defaultSlotMinutes || 15
    }
  }
  return blocks
    .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime())
    .filter((slot, idx, arr) => arr.findIndex((x) => x.startIso === slot.startIso) === idx)
}
