/** Preset ids for visit list / Kanban date filter (local calendar semantics). */

export type VisitDatePresetId =
  | 'today'
  | 'last_7'
  | 'last_30'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_month'
  | 'last_quarter'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'custom'

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function addCalendarMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, d.getDate(), 0, 0, 0, 0)
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0)
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function ymdFromLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ymdToLocalStart(ymd: string, fallback: Date): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return startOfLocalDay(fallback)
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return new Date(y, mo, d, 0, 0, 0, 0)
}

const shortMd: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
const shortMdy: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
const monthYear: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }

function fmt(d: Date, o: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString(undefined, o)
}

function endExclusiveFromStartDay(startDay: Date): Date {
  const x = new Date(startDay)
  x.setDate(x.getDate() + 1)
  return x
}

/** Inclusive calendar-day end for display (endExclusive - 1ms day). */
function lastInclusiveDay(startDay: Date, endExclusive: Date): Date {
  const x = new Date(endExclusive)
  x.setMilliseconds(x.getMilliseconds() - 1)
  return startOfLocalDay(x)
}

export function formatRangeHint(preset: VisitDatePresetId, now: Date, customFromYmd: string, customToYmd: string): string {
  const { rangeStartIso, rangeEndExclusiveIso } = computeVisitDateRange(preset, now, customFromYmd, customToYmd)
  const start = new Date(rangeStartIso)
  const endEx = new Date(rangeEndExclusiveIso)
  const last = lastInclusiveDay(start, endEx)

  if (preset === 'today') return fmt(start, shortMdy)
  if (preset === 'this_month' || preset === 'last_month') return fmt(start, monthYear)
  if (preset === 'this_year') return String(start.getFullYear())
  if (preset === 'this_quarter' || preset === 'last_quarter') {
    return `${fmt(start, monthYear)}–${fmt(last, monthYear)}`
  }
  if (preset === 'last_3_months' || preset === 'last_6_months' || preset === 'last_12_months') {
    return `${fmt(start, monthYear)}–${fmt(last, monthYear)}`
  }
  if (preset === 'custom') {
    if (start.toDateString() === last.toDateString()) return fmt(start, shortMdy)
    return `${fmt(start, shortMd)}–${fmt(last, shortMdy)}`
  }
  return `${fmt(start, shortMd)}–${fmt(last, shortMdy)}`
}

export function computeVisitDateRange(
  preset: VisitDatePresetId,
  now: Date,
  customFromYmd: string,
  customToYmd: string,
): { rangeStartIso: string; rangeEndExclusiveIso: string } {
  const todayStart = startOfLocalDay(now)
  const tomorrowStart = endExclusiveFromStartDay(todayStart)

  switch (preset) {
    case 'today':
      return { rangeStartIso: todayStart.toISOString(), rangeEndExclusiveIso: tomorrowStart.toISOString() }
    case 'last_7': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 6)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: tomorrowStart.toISOString() }
    }
    case 'last_30': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 29)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: tomorrowStart.toISOString() }
    }
    case 'this_month': {
      const start = startOfMonth(now)
      const end = addCalendarMonths(start, 1)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: end.toISOString() }
    }
    case 'this_quarter': {
      const start = startOfQuarter(now)
      const end = addCalendarMonths(start, 3)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: end.toISOString() }
    }
    case 'this_year': {
      const start = startOfYear(now)
      const end = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: end.toISOString() }
    }
    case 'last_month': {
      const thisMonth = startOfMonth(now)
      const start = addCalendarMonths(thisMonth, -1)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: thisMonth.toISOString() }
    }
    case 'last_quarter': {
      const thisQ = startOfQuarter(now)
      const start = addCalendarMonths(thisQ, -3)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: thisQ.toISOString() }
    }
    case 'last_3_months': {
      const thisMonthStart = startOfMonth(now)
      const start = addCalendarMonths(thisMonthStart, -3)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: thisMonthStart.toISOString() }
    }
    case 'last_6_months': {
      const thisMonthStart = startOfMonth(now)
      const start = addCalendarMonths(thisMonthStart, -6)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: thisMonthStart.toISOString() }
    }
    case 'last_12_months': {
      const thisMonthStart = startOfMonth(now)
      const start = addCalendarMonths(thisMonthStart, -12)
      return { rangeStartIso: start.toISOString(), rangeEndExclusiveIso: thisMonthStart.toISOString() }
    }
    case 'custom': {
      const from = ymdToLocalStart(customFromYmd || ymdFromLocalDate(todayStart), todayStart)
      const toDay = ymdToLocalStart(customToYmd || ymdFromLocalDate(todayStart), todayStart)
      const lo = from.getTime() <= toDay.getTime() ? from : toDay
      const hi = from.getTime() <= toDay.getTime() ? toDay : from
      return {
        rangeStartIso: lo.toISOString(),
        rangeEndExclusiveIso: endExclusiveFromStartDay(hi).toISOString(),
      }
    }
    default:
      return { rangeStartIso: todayStart.toISOString(), rangeEndExclusiveIso: tomorrowStart.toISOString() }
  }
}

export function presetTriggerTitle(preset: VisitDatePresetId): string {
  switch (preset) {
    case 'today':
      return 'Today'
    case 'last_7':
      return 'Last 7 days'
    case 'last_30':
      return 'Last 30 days'
    case 'this_month':
      return 'This month'
    case 'this_quarter':
      return 'This quarter'
    case 'this_year':
      return 'This year'
    case 'last_month':
      return 'Last month'
    case 'last_quarter':
      return 'Last quarter'
    case 'last_3_months':
      return 'Last 3 months'
    case 'last_6_months':
      return 'Last 6 months'
    case 'last_12_months':
      return 'Last 12 months'
    case 'custom':
      return 'Custom range'
    default:
      return 'Date range'
  }
}
