import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderUpcoming,
  type ProviderUpcomingAppointment,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadAppointmentsTemplateCsv(): void {
  const header = ['patient_name', 'appointment_date', 'start_time', 'end_time', 'visit_type', 'status', 'notes']
  const row = ['Jane Doe', '2024-10-15', '09:00', '09:30', 'Follow-up', 'Confirmed', 'Example row — replace with real data']
  const csvLines = [header.map(escapeCsvCell).join(','), row.map(escapeCsvCell).join(',')]
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false)
  const importCsvRef = useRef<HTMLDivElement>(null)
  const [viewMonth, setViewMonth] = useState(() => cloneMonth(new Date()))
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
      try {
        if (!cancelled) {
          setLoading(true)
          setLoadError(null)
        }
        const data = await fetchProviderUpcoming(DEFAULT_PROVIDER_ID)
        if (!cancelled) setAppointments(data)
      } catch (e) {
        if (!cancelled) setLoadError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
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

  const totalCells = Math.ceil((blanks + daysInMonth) / 7) * 7

  const sidebarItems = useMemo(() => {
    return [...appointments]
      .filter((a) => a.scheduled_start)
      .sort((x, y) => new Date(x.scheduled_start).getTime() - new Date(y.scheduled_start).getTime())
      .slice(0, 12)
  }, [appointments])

  function prevMonth(): void {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function nextMonth(): void {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
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
              <p className="text-sm font-semibold">Schedule</p>
              <p className="text-[10px] uppercase text-[#3e4a3d]">Provider calendar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen p-8 pt-16">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-[28px] font-bold">Calendar</h2>
            <p className="text-[#3e4a3d]">
              Appointments from{' '}
              <code className="rounded bg-[#eff6ea] px-1.5 py-0.5 text-xs font-mono text-[#171d16]">
                /api/visits/provider/{DEFAULT_PROVIDER_ID}/upcoming
              </code>
            </p>
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
                  <p className="mb-3 text-sm text-[#3e4a3d]">Download a template CSV with expected columns.</p>
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                    onClick={() => {
                      downloadAppointmentsTemplateCsv()
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
              New Appointment
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
                <h3 className="text-xl font-bold">{monthTitle}</h3>
                <button aria-label="Next month" className="rounded-md p-1 text-[#006b2c] hover:bg-gray-100" onClick={nextMonth} type="button">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="flex rounded-lg bg-[#eff6ea] p-1">
                <button className="rounded-md bg-white px-4 py-1.5 text-sm font-medium text-[#006b2c] shadow-sm" type="button">
                  Month
                </button>
                <button className="px-4 py-1.5 text-sm font-medium text-[#3e4a3d]" disabled type="button">
                  Week
                </button>
                <button className="px-4 py-1.5 text-sm font-medium text-[#3e4a3d]" disabled type="button">
                  Day
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d} className="border-r border-gray-100 py-3 text-center text-[13px] font-medium text-[#3e4a3d] last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
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
                        <span className={`text-sm font-medium ${isToday ? 'rounded-md bg-[#2563eb] px-1.5 py-0.5 text-white' : ''}`}>{dayNum}</span>
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
