import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import BackButton from '../components/BackButton'
import ProviderAvatar from '../components/ProviderAvatar'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderUpcoming,
  scheduleVisitIntake,
  type ProviderUpcomingAppointment,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

type CalendarViewMode = 'month' | 'week' | 'day'
const AUTO_REFRESH_MS = 20_000
const CALENDAR_APPOINTMENTS_CACHE_KEY_PREFIX = 'calendar:appointments'
const MIN_FOCUS_REFRESH_GAP_MS = 8_000

function cloneMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function padMonthGrid(year: number, month: number): { blanks: number; daysInMonth: number } {
  const first = new Date(year, month, 1).getDay()
  const dim = new Date(year, month + 1, 0).getDate()
  return { blanks: first, daysInMonth: dim }
}

function appointmentsOnDay(rows: ProviderUpcomingAppointment[], year: number, month: number, day: number): ProviderUpcomingAppointment[] {
  return rows.filter((a) => {
    const t = new Date(a.scheduled_start)
    if (Number.isNaN(t.getTime())) return false
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
  })
}

function formatShortTime(iso: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ''
  return t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function canEditAppointment(scheduledIso: string | null | undefined): boolean {
  if (!scheduledIso) return false
  const t = new Date(scheduledIso).getTime()
  if (Number.isNaN(t)) return false
  return t >= Date.now()
}

function toDisplayName(value: string | null | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return 'Patient'
  return raw
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ')
}

function hasRenderablePatientName(value: string | null | undefined): boolean {
  const normalized = (value || '').trim().toLowerCase()
  if (!normalized) return false
  if (normalized === 'unknown patient') return false
  if (normalized === 'patient') return false
  return true
}

function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localDayStartMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** True if this slot counts as "upcoming" for the sidebar: today only if start time not passed; any time on a future calendar day. */
function isUpcomingSidebarSlot(slot: Date, now: Date = new Date()): boolean {
  const slotMs = slot.getTime()
  if (Number.isNaN(slotMs)) return false
  const nowMs = now.getTime()
  const slotDayStart = localDayStartMs(slot)
  const todayStart = localDayStartMs(now)
  if (slotDayStart < todayStart) return false
  if (slotDayStart > todayStart) return true
  return slotMs >= nowMs
}

/** Hide finished/cancelled visits from the sidebar; keep active workflow states (including in_progress). */
function isSidebarActiveVisitStatus(raw: string | undefined): boolean {
  const status = (raw || '').trim().toLowerCase()
  if (!status) return true
  return !['completed', 'cancelled', 'canceled', 'closed', 'ended'].includes(status)
}

function CalendarPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => cloneMonth(new Date()))
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [focusDate, setFocusDate] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<ProviderUpcomingAppointment[]>([])
  const [rescheduleTarget, setRescheduleTarget] = useState<ProviderUpcomingAppointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const loadInFlightRef = useRef(false)
  const lastLoadAtRef = useRef(0)
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const activeRange = useMemo(() => {
    const from = new Date(year, month, 1, 0, 0, 0, 0)
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999)
    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      cacheKey: `${CALENDAR_APPOINTMENTS_CACHE_KEY_PREFIX}:${year}-${String(month + 1).padStart(2, '0')}`,
    }
  }, [month, year])

  const loadCalendarData = useCallback(async (showSpinner: boolean) => {
    if (!isMountedRef.current) return
    if (loadInFlightRef.current) return
    if (!showSpinner && document.visibilityState !== 'visible') return
    loadInFlightRef.current = true
    if (showSpinner) {
      setLoading(true)
      setLoadError(null)
    }
    try {
      const appointmentsRes = await fetchProviderUpcoming(DEFAULT_PROVIDER_ID, {
        fromDate: activeRange.fromDate,
        toDate: activeRange.toDate,
      })
      if (!isMountedRef.current) return
      setAppointments(appointmentsRes)
      try {
        sessionStorage.setItem(activeRange.cacheKey, JSON.stringify(appointmentsRes))
      } catch {
        // non-blocking cache write
      }
      setLoadError(null)
      setLoading(false)
    } catch (e) {
      if (!isMountedRef.current) return
      setLoadError(getApiErrorMessage(e))
      setLoading(false)
    } finally {
      lastLoadAtRef.current = Date.now()
      loadInFlightRef.current = false
    }
  }, [activeRange.cacheKey, activeRange.fromDate, activeRange.toDate])

  useEffect(() => {
    let cancelled = false
    isMountedRef.current = true
    try {
      const raw = sessionStorage.getItem(activeRange.cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as ProviderUpcomingAppointment[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAppointments(parsed)
          setLoading(false)
        }
      }
    } catch {
      // ignore cache parse issues
    }
    void (async () => {
      await loadCalendarData(true)
      if (cancelled) return
    })()
    const intervalId = window.setInterval(() => {
      if (!cancelled) void loadCalendarData(false)
    }, AUTO_REFRESH_MS)
    const onVisible = () => {
      const now = Date.now()
      if (!cancelled && document.visibilityState === 'visible' && now - lastLoadAtRef.current >= MIN_FOCUS_REFRESH_GAP_MS) {
        void loadCalendarData(false)
      }
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      isMountedRef.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activeRange.cacheKey, loadCalendarData])
  const { blanks, daysInMonth } = useMemo(() => padMonthGrid(year, month), [year, month])

  const monthTitle = viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const dayTitle = focusDate.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const weekStart = useMemo(() => {
    const start = new Date(focusDate)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay())
    return start
  }, [focusDate])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, idx) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + idx)),
    [weekStart],
  )
  const weekTitle = useMemo(() => {
    const end = weekDays[6]
    return `${weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }, [weekDays, weekStart])
  const visibleAppointments = useMemo(
    () => appointments.filter((item) => hasRenderablePatientName(item.patient_name)),
    [appointments],
  )

  const totalCells = Math.ceil((blanks + daysInMonth) / 7) * 7

  const sidebarItems = useMemo(() => {
    const base = [...visibleAppointments]
    if (viewMode === 'day') {
      const y = focusDate.getFullYear()
      const m = focusDate.getMonth()
      const d = focusDate.getDate()
      const focusDayStart = localDayStartMs(focusDate)
      const todayStart = localDayStartMs(new Date())
      const now = new Date()
      return appointmentsOnDay(base, y, m, d)
        .filter((a) => {
          if (!isSidebarActiveVisitStatus(a.status)) return false
          if (!a.scheduled_start) return false
          const slot = new Date(a.scheduled_start)
          if (Number.isNaN(slot.getTime())) return false
          if (focusDayStart === todayStart) return isUpcomingSidebarSlot(slot, now)
          return true
        })
        .sort((x, y) => new Date(x.scheduled_start).getTime() - new Date(y.scheduled_start).getTime())
        .slice(0, 12)
    }
    const now = new Date()
    return base
      .filter((a) => {
        if (!a.scheduled_start) return false
        const slot = new Date(a.scheduled_start)
        if (!isUpcomingSidebarSlot(slot, now)) return false
        return isSidebarActiveVisitStatus(a.status)
      })
      .sort((x, y) => new Date(x.scheduled_start).getTime() - new Date(y.scheduled_start).getTime())
      .slice(0, 12)
  }, [focusDate, viewMode, visibleAppointments])

  function prevMonth(): void {
    if (viewMode === 'month') {
      setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
      return
    }
    if (viewMode === 'week') {
      setFocusDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))
      return
    }
    setFocusDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))
  }

  function nextMonth(): void {
    if (viewMode === 'month') {
      setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
      return
    }
    if (viewMode === 'week') {
      setFocusDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
      return
    }
    setFocusDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
  }

  function openDayAppointments(date: Date): void {
    setFocusDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    setViewMode('day')
  }

  function openRescheduleModal(appt: ProviderUpcomingAppointment): void {
    setRescheduleTarget(appt)
    const dt = new Date(appt.scheduled_start)
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      setRescheduleDate(`${y}-${m}-${d}`)
      setRescheduleTime(`${hh}:${mm}`)
    } else {
      setRescheduleDate('')
      setRescheduleTime('')
    }
    setRescheduleError(null)
  }

  return (
    <div className="min-h-screen font-inter text-[#171d16]">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-2">
          <BackButton to="/dashboard" className="-ml-2" />
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">Calendar</h2>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-gray-500 transition-opacity hover:opacity-80" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="ml-2 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{provider.displayName}</p>
              <p className="text-[10px] uppercase text-[#3e4a3d]">{provider.title}</p>
            </div>
            <ProviderAvatar
              className="border border-gray-200"
              imageUrl={provider.avatarUrl}
              label={provider.displayName}
              size="md"
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen px-8 pb-8 pt-20">
        <div className="mb-8 flex justify-between items-end gap-4">
          <p className="text-slate-500">Manage and monitor all appointments.</p>
          <div className="flex items-center gap-3">
            <button
              className="shrink-0 rounded-lg bg-[#16a34a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d]"
              onClick={() => navigate('/start-visit')}
              type="button"
            >
              New Visit
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
        )}

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white xl:col-span-8">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <button aria-label="Previous month" className="rounded-md p-1 text-[#006b2c] hover:bg-gray-100" onClick={prevMonth} type="button">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-xl font-bold">{viewMode === 'month' ? monthTitle : viewMode === 'week' ? weekTitle : dayTitle}</h3>
                <button aria-label="Next month" className="rounded-md p-1 text-[#006b2c] hover:bg-gray-100" onClick={nextMonth} type="button">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="flex rounded-lg bg-[#eff6ea] p-1">
                <button
                  className={`rounded-md px-4 py-1.5 text-sm font-medium ${viewMode === 'month' ? 'bg-white text-[#006b2c] shadow-sm' : 'text-[#3e4a3d]'}`}
                  onClick={() => setViewMode('month')}
                  type="button"
                >
                  Month
                </button>
                <button
                  className={`rounded-md px-4 py-1.5 text-sm font-medium ${viewMode === 'week' ? 'bg-white text-[#006b2c] shadow-sm' : 'text-[#3e4a3d]'}`}
                  onClick={() => setViewMode('week')}
                  type="button"
                >
                  Week
                </button>
                <button
                  className={`rounded-md px-4 py-1.5 text-sm font-medium ${viewMode === 'day' ? 'bg-white text-[#006b2c] shadow-sm' : 'text-[#3e4a3d]'}`}
                  onClick={() => setViewMode('day')}
                  type="button"
                >
                  Day
                </button>
              </div>
            </div>
            {viewMode !== 'day' && (
              <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                  <div
                    key={d}
                    className="flex items-center justify-start border-r border-gray-100 px-4 py-4 text-left text-[13px] font-medium text-[#3e4a3d] last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'month' && (
              <div className="grid grid-cols-7 auto-rows-[minmax(7rem,auto)]">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - blanks + 1
                  const isBlank = dayNum < 1 || dayNum > daysInMonth
                  const dayAppts = isBlank ? [] : appointmentsOnDay(visibleAppointments, year, month, dayNum)
                  const dayKey = isBlank ? '' : `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const isSelectedDay = !isBlank && selectedDayKey === dayKey && selectedVisitId === null

                  const isToday = (() => {
                    if (isBlank) return false
                    const now = new Date()
                    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === dayNum
                  })()

                  return (
                    <div
                      key={i}
                      className={`border-b border-r border-gray-100 px-3 py-2 transition-colors [&:nth-child(7n)]:border-r-0 ${
                        isSelectedDay ? 'bg-[#eff6ea]' : 'hover:bg-transparent'
                      } ${!isBlank ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isBlank) return
                        setSelectedDayKey(dayKey)
                        setSelectedVisitId(null)
                        openDayAppointments(new Date(year, month, dayNum))
                      }}
                      role={!isBlank ? 'button' : undefined}
                      tabIndex={!isBlank ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (isBlank) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openDayAppointments(new Date(year, month, dayNum))
                        }
                      }}
                    >
                      {!isBlank && (
                        <>
                          <button
                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-medium transition-colors ${
                              isToday ? 'bg-[#16a34a] text-white hover:bg-[#15803d]' : 'text-[#171d16] hover:bg-[#eff6ea]'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDayKey(dayKey)
                              setSelectedVisitId(null)
                              openDayAppointments(new Date(year, month, dayNum))
                            }}
                            type="button"
                          >
                            {dayNum}
                          </button>
                          <div className="mt-1 space-y-1 hover:bg-[#eff6ea]">
                            {dayAppts.slice(0, 3).map((a) => (
                              <button
                                key={a.visit_id}
                                data-appointment-chip="true"
                                className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[10px] ${
                                  selectedVisitId === a.visit_id
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-blue-200 bg-blue-100 text-blue-700 hover:border-blue-300 hover:bg-blue-200'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedVisitId(a.visit_id)
                                  setSelectedDayKey(null)
                                  navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                title={a.chief_complaint}
                                type="button"
                              >
                                {formatShortTime(a.scheduled_start)} · {toDisplayName(a.patient_name)}
                              </button>
                            ))}
                            {dayAppts.length > 3 && (
                              <p className="text-[10px] text-[#575e70]">+{dayAppts.length - 3} more</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {viewMode === 'week' && (
              <div className="grid grid-cols-7 auto-rows-[minmax(10rem,auto)]">
                {weekDays.map((d) => {
                  const dayAppts = appointmentsOnDay(visibleAppointments, d.getFullYear(), d.getMonth(), d.getDate())
                  const isToday =
                    new Date().getFullYear() === d.getFullYear() && new Date().getMonth() === d.getMonth() && new Date().getDate() === d.getDate()
                  return (
                    <div key={d.toISOString()} className="border-b border-r border-gray-100 p-2 transition-colors last:border-r-0">
                      <button
                        className={`rounded-md px-1.5 py-0.5 text-sm font-medium transition-colors ${
                          isToday ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]' : 'text-[#171d16] hover:bg-[#eff6ea]'
                        }`}
                        onClick={() => openDayAppointments(new Date(d))}
                        type="button"
                      >
                        {d.getDate()}
                      </button>
                      <div className="mt-2 space-y-1">
                        {dayAppts.length === 0 && <p className="text-[10px] text-[#7a828f]">No appointments</p>}
                        {dayAppts.map((a) => (
                          <button
                            key={a.visit_id}
                            className="block w-full truncate rounded border border-blue-200 bg-blue-100 px-1.5 py-1 text-left text-[10px] text-blue-700"
                            onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                            title={a.chief_complaint}
                            type="button"
                          >
                            {formatShortTime(a.scheduled_start)} · {toDisplayName(a.patient_name)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {viewMode === 'day' && (
              <div className="divide-y divide-gray-100">
                {appointmentsOnDay(visibleAppointments, focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate()).length === 0 ? (
                  <p className="px-6 py-10 text-sm text-[#575e70]">No appointments for this day.</p>
                ) : (
                  appointmentsOnDay(visibleAppointments, focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate()).map((a) => (
                    <div
                      key={a.visit_id}
                      className="flex cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#eff6ea]"
                      onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <p className="font-semibold">{toDisplayName(a.patient_name)}</p>
                        <p className="text-sm text-[#3e4a3d]">{a.chief_complaint || a.appointment_type || 'Visit'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{formatShortTime(a.scheduled_start)}</p>
                        {canEditAppointment(a.scheduled_start) && (
                          <button
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-[#171d16] hover:bg-slate-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              openRescheduleModal(a)
                            }}
                            type="button"
                          >
                            Edit Appointment
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {loading && <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">Loading appointments…</p>}
          </div>

          <div className="flex flex-col gap-8 xl:col-span-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <h3 className="text-[18px] font-semibold">Upcoming Appointments</h3>
                <button className="text-sm font-semibold text-[#006b2c] hover:underline" onClick={() => navigate('/visits')} type="button">
                  View All
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {!loading && sidebarItems.length === 0 && (
                  <div className="p-6 text-sm text-[#575e70]">
                    {visibleAppointments.length === 0 ? (
                      <p>No visits scheduled for {monthTitle}.</p>
                    ) : (
                      <p>
                        No upcoming visits in this list: for today, only times that have not started yet are shown; past
                        times and completed visits are hidden. Future days show all slots in range. Use the calendar or View
                        All for the full schedule.
                      </p>
                    )}
                  </div>
                )}
                {sidebarItems.map((a) => {
                  const dt = new Date(a.scheduled_start)
                  const mon = Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString(undefined, { month: 'short' })
                  const day = Number.isNaN(dt.getTime()) ? '—' : String(dt.getDate())
                  const patientDisplay = toDisplayName(a.patient_name)
                  const goToVisit = () =>
                    navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)
                  return (
                    <div
                      key={a.visit_id}
                      className="w-full cursor-pointer p-5 text-left transition-colors hover:bg-slate-50"
                      onClick={goToVisit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          goToVisit()
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600 transition-colors hover:bg-blue-100">
                          <span className="text-[10px] uppercase">{mon}</span>
                          <span className="text-lg leading-none">{day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#171d16]">
                            {formatShortTime(a.scheduled_start) || '—'} · {(a.appointment_type || 'Visit').trim() || 'Visit'}
                          </p>
                          {(a.status || '').trim() && (
                            <p className="mt-0.5 truncate text-xs capitalize text-[#7a828f]">
                              {(a.status || '').replace(/_/g, ' ')}
                            </p>
                          )}
                        </div>
                        <span
                          className="max-w-[10rem] shrink-0 truncate rounded-full bg-green-100 px-3 py-1.5 text-center text-xs font-semibold normal-case tracking-normal text-green-800"
                          title={patientDisplay}
                        >
                          {patientDisplay}
                        </span>
                        {canEditAppointment(a.scheduled_start) && (
                          <button
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-[#171d16] hover:bg-slate-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              openRescheduleModal(a)
                            }}
                            type="button"
                          >
                            Edit Appointment
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#171d16]">Edit Appointment</h3>
            <p className="mt-1 text-sm text-[#3e4a3d]">{toDisplayName(rescheduleTarget.patient_name)}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                Date
                <input
                  className="mt-1 w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  min={localDateInputMin()}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  type="date"
                  value={rescheduleDate}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                Time
                <input
                  className="mt-1 w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  type="time"
                  value={rescheduleTime}
                />
              </label>
            </div>
            {rescheduleError && <p className="mt-3 text-xs text-red-700">{rescheduleError}</p>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-slate-50"
                onClick={() => setRescheduleTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={rescheduleSubmitting || !rescheduleDate || !rescheduleTime}
                onClick={() => {
                  void (async () => {
                    if (!rescheduleTarget) return
                    try {
                      setRescheduleSubmitting(true)
                      setRescheduleError(null)
                      await scheduleVisitIntake(rescheduleTarget.visit_id, {
                        appointment_date: rescheduleDate,
                        appointment_time: rescheduleTime,
                      })
                      await loadCalendarData(false)
                      setRescheduleTarget(null)
                    } catch (e) {
                      setRescheduleError(getApiErrorMessage(e))
                    } finally {
                      setRescheduleSubmitting(false)
                    }
                  })()
                }}
                type="button"
              >
                {rescheduleSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default CalendarPage
