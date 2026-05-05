const KEY = 'appointment_duration_overrides'

export function getAppointmentDurationMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && v >= 5 && v <= 240) out[k] = Math.round(v)
    }
    return out
  } catch {
    return {}
  }
}

export function setAppointmentDuration(startIso: string, minutes: number): void {
  try {
    const map = getAppointmentDurationMap()
    map[startIso] = Math.round(minutes)
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

