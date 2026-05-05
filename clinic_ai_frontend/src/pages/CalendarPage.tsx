import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import { fetchPatients, type PatientSummary } from '../services/patientsApi'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderUpcoming,
  type ProviderUpcomingAppointment,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

type CalendarViewMode = 'month' | 'week' | 'day'

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadAppointmentsTemplateCsv(patients: PatientSummary[]): void {
  const header = ['patient_name', 'age', 'mobile_number', 'gender', 'appointment_date', 'appointment_time']
  const dataRows = patients.length
    ? patients.map((p) => [
        (p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient').trim(),
        p.age != null ? String(p.age) : '',
        (p.phone_number || '').trim(),
        (p.gender || '').trim(),
        '',
        '',
      ])
    : [['Jane Doe', '35', '9876543210', 'female', '2026-05-15', '10:30']]
  const csvLines = [header.map(escapeCsvCell).join(','), ...dataRows.map((r) => r.map(escapeCsvCell).join(','))]
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'medgenie-appointments-import-template.csv'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

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

function CalendarPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false)
  const importCsvRef = useRef<HTMLDivElement>(null)
  const [viewMonth, setViewMonth] = useState(() => cloneMonth(new Date()))
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [focusDate, setFocusDate] = useState(() => new Date())
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [appointments, setAppointments] = useState<ProviderUpcomingAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isImportCsvOpen) return
    function handlePointerDown(ev: MouseEvent) {
      if (importCsvRef.current && !importCsvRef.current.contains(ev.target as Node)) {
        setIsImportCsvOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isImportCsvOpen])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!cancelled) {
        setLoading(true)
        setLoadError(null)
      }
      const [appointmentsRes, patientsRes] = await Promise.allSettled([
        fetchProviderUpcoming(DEFAULT_PROVIDER_ID),
        fetchPatients(),
      ])
      if (!cancelled && appointmentsRes.status === 'fulfilled') {
        setAppointments(appointmentsRes.value)
      }
      if (!cancelled && patientsRes.status === 'fulfilled') {
        setPatients(patientsRes.value)
      }
      if (!cancelled) {
        const errs: string[] = []
        if (appointmentsRes.status === 'rejected') errs.push(getApiErrorMessage(appointmentsRes.reason))
        if (patientsRes.status === 'rejected') errs.push(`Patient list failed: ${getApiErrorMessage(patientsRes.reason)}`)
        setLoadError(errs.length ? errs.join(' · ') : null)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
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

  const totalCells = Math.ceil((blanks + daysInMonth) / 7) * 7

  const sidebarItems = useMemo(() => {
    return [...appointments]
      .filter((a) => a.scheduled_start)
      .sort((x, y) => new Date(x.scheduled_start).getTime() - new Date(y.scheduled_start).getTime())
      .slice(0, 12)
  }, [appointments])

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

  return (
    <div className="min-h-screen font-inter text-[#171d16]">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-6">
          <button className="text-gray-500 transition-opacity hover:opacity-80" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="ml-2 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{provider.displayName}</p>
              <p className="text-[10px] uppercase text-[#3e4a3d]">{provider.title}</p>
            </div>
            <img alt="Dr. Profile" className="h-10 w-10 rounded-full border border-gray-200 object-cover" src={provider.avatarUrl} />
          </div>
        </div>
      </header>

      <main className="min-h-screen p-8 pt-16">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-[28px] font-bold">Calendar</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative" ref={importCsvRef}>
              <button
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-white ${isImportCsvOpen ? 'bg-[#1e293b]' : 'bg-[#111827] hover:bg-[#1e293b]'}`}
                onClick={() => setIsImportCsvOpen((o) => !o)}
                type="button"
              >
                <span className="material-symbols-outlined text-[1.125rem]">upload_file</span>
                Import CSV
                <span className="material-symbols-outlined text-[1.125rem]">{isImportCsvOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isImportCsvOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:right-0 sm:left-auto"
                  role="dialog"
                  aria-label="Import CSV options"
                >
                  <p className="mb-2 text-sm text-[#3e4a3d]">CSV columns: patient_name, age, mobile_number, gender, appointment_date, appointment_time</p>
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                    onClick={() => {
                      downloadAppointmentsTemplateCsv(patients)
                      setIsImportCsvOpen(false)
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[1.125rem]">download</span>
                    Download CSV template
                  </button>
                </div>
              ) : null}
            </div>
            <button
              className="flex items-center gap-2 rounded-lg bg-[#16a34a] px-5 py-2.5 font-medium text-white"
              onClick={() => navigate('/new-appointment')}
              type="button"
            >
              New visit
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
              <div className="grid grid-cols-7 border-b border-gray-100">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                  <div key={d} className="border-r border-gray-100 py-3 text-center text-[13px] font-medium text-[#3e4a3d] last:border-r-0">
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
                  const dayAppts = isBlank ? [] : appointmentsOnDay(appointments, year, month, dayNum)

                  const isToday = (() => {
                    if (isBlank) return false
                    const now = new Date()
                    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === dayNum
                  })()

                  return (
                    <div key={i} className={`border-b border-r border-gray-100 p-2 transition-colors hover:bg-[#eff6ea] last:border-r-0`}>
                      {!isBlank && (
                        <>
                          <button
                            className={`text-sm font-medium ${isToday ? 'rounded-md bg-[#2563eb] px-1.5 py-0.5 text-white' : ''}`}
                            onClick={() => setFocusDate(new Date(year, month, dayNum))}
                            type="button"
                          >
                            {dayNum}
                          </button>
                          <div className="mt-1 space-y-1">
                            {dayAppts.slice(0, 3).map((a) => (
                              <button
                                key={a.visit_id}
                                className="block w-full truncate rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-left text-[10px] text-blue-700"
                                onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                                title={a.chief_complaint}
                                type="button"
                              >
                                {formatShortTime(a.scheduled_start)} · {a.patient_name}
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
                  const dayAppts = appointmentsOnDay(appointments, d.getFullYear(), d.getMonth(), d.getDate())
                  const isToday =
                    new Date().getFullYear() === d.getFullYear() && new Date().getMonth() === d.getMonth() && new Date().getDate() === d.getDate()
                  return (
                    <div key={d.toISOString()} className="border-b border-r border-gray-100 p-2 transition-colors hover:bg-[#eff6ea] last:border-r-0">
                      <button
                        className={`text-sm font-medium ${isToday ? 'rounded-md bg-[#2563eb] px-1.5 py-0.5 text-white' : ''}`}
                        onClick={() => setFocusDate(new Date(d))}
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
                            {formatShortTime(a.scheduled_start)} · {a.patient_name}
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
                {appointmentsOnDay(appointments, focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate()).length === 0 ? (
                  <p className="px-6 py-10 text-sm text-[#575e70]">No appointments for this day.</p>
                ) : (
                  appointmentsOnDay(appointments, focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate()).map((a) => (
                    <button
                      key={a.visit_id}
                      className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#eff6ea]"
                      onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                      type="button"
                    >
                      <div>
                        <p className="font-semibold">{a.patient_name}</p>
                        <p className="text-sm text-[#3e4a3d]">{a.chief_complaint || a.appointment_type || 'Visit'}</p>
                      </div>
                      <p className="rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{formatShortTime(a.scheduled_start)}</p>
                    </button>
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
                  <div className="p-6 text-sm text-[#575e70]">No upcoming appointments in the backend response.</div>
                )}
                {sidebarItems.map((a) => {
                  const dt = new Date(a.scheduled_start)
                  const mon = Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString(undefined, { month: 'short' })
                  const day = Number.isNaN(dt.getTime()) ? '—' : String(dt.getDate())
                  return (
                    <button
                      key={a.visit_id}
                      className="w-full p-5 text-left transition-colors hover:bg-[#eff6ea]"
                      onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                      type="button"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600">
                          <span className="text-[10px] uppercase">{mon}</span>
                          <span className="text-lg leading-none">{day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{a.patient_name}</p>
                          <p className="truncate text-sm text-[#3e4a3d]">{formatShortTime(a.scheduled_start)} · {a.appointment_type || 'Visit'}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-green-700">
                          {(a.status || '').replace(/_/g, ' ') || 'Scheduled'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default CalendarPage
