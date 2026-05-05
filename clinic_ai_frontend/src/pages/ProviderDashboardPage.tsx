import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderUpcoming,
  fetchProviderVisits,
  type ProviderUpcomingAppointment,
  type ProviderVisitListItem,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'
const PAGE_SIZE = 10

function isSameCalendarDay(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

function timeValue(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

function formatDateTimeShort(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function normalizeVisitStatus(raw: string | undefined): string {
  return (raw || '').toLowerCase()
}

/** True if visit is scheduled for later today (local calendar), with small clock slack. */
function isFutureSlotToday(scheduledIso: string, ref: Date): boolean {
  if (!scheduledIso) return false
  if (!isSameCalendarDay(scheduledIso, ref)) return false
  const t = new Date(scheduledIso).getTime()
  if (Number.isNaN(t)) return false
  return t >= ref.getTime() - 60_000
}

/** Not finished and not actively in consultation (still “waiting to be seen”). */
function isNotVisitedYet(status: string | undefined): boolean {
  const s = normalizeVisitStatus(status)
  if (!s) return true
  if (['completed', 'closed', 'ended', 'cancelled', 'canceled'].includes(s)) return false
  if (s === 'in_progress') return false
  return true
}

function visitToUpcomingRow(v: ProviderVisitListItem): ProviderUpcomingAppointment {
  const vid = String(v.visit_id || v.id || '').trim()
  return {
    appointment_id: vid,
    patient_id: v.patient_id,
    patient_name: v.patient_name,
    scheduled_start: v.scheduled_start || '',
    chief_complaint: v.chief_complaint?.trim() || '',
    appointment_type: v.visit_type?.trim() || 'Visit',
    previsit_completed: false,
    visit_id: vid,
    status: v.status || '',
  }
}

function ProviderDashboardPage() {
  const provider = useProviderIdentity()
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<ProviderUpcomingAppointment[]>([])
  const [visits, setVisits] = useState<ProviderVisitListItem[]>([])
  const [upcomingPage, setUpcomingPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    const loadDashboard = async (showSpinner: boolean) => {
      if (!cancelled && showSpinner) {
        setLoading(true)
        setError(null)
      }
      const [upcomingRes, visitsRes] = await Promise.allSettled([
        fetchProviderUpcoming(DEFAULT_PROVIDER_ID),
        fetchProviderVisits(DEFAULT_PROVIDER_ID),
      ])
      if (cancelled) return

      if (upcomingRes.status === 'fulfilled') {
        setAppointments(upcomingRes.value)
      }
      if (visitsRes.status === 'fulfilled') {
        setVisits(visitsRes.value)
      }

      const loadErrs: string[] = []
      if (upcomingRes.status === 'rejected') loadErrs.push(getApiErrorMessage(upcomingRes.reason))
      if (visitsRes.status === 'rejected') loadErrs.push(getApiErrorMessage(visitsRes.reason))
      setError(loadErrs.length ? [...new Set(loadErrs)].join(' · ') : null)
      setLoading(false)
    }
    void loadDashboard(true)
    const intervalId = window.setInterval(() => {
      void loadDashboard(false)
    }, 10_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadDashboard(false)
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const stats = useMemo(() => {
    const today = new Date()
    /** Registration time from backend (patients.created_at); not inferred from visits. */
    const registrationByPatient = new Map<string, string>()
    for (const v of visits) {
      const pid = (v.patient_id || '').trim()
      if (!pid) continue
      const reg = String(v.patient_created_at ?? '').trim()
      if (!reg || registrationByPatient.has(pid)) continue
      registrationByPatient.set(pid, reg)
    }

    const newRegisteredPatientsToday = new Set<string>()
    for (const v of visits) {
      const pid = (v.patient_id || '').trim()
      if (!pid) continue
      const registeredAt = registrationByPatient.get(pid)
      if (!registeredAt || !isSameCalendarDay(registeredAt, today)) continue
      if (!isSameCalendarDay(v.scheduled_start ?? v.created_at ?? null, today)) continue
      newRegisteredPatientsToday.add(pid)
    }

    const visitsToday = visits.filter((v) => isSameCalendarDay(v.scheduled_start || v.created_at, today))
    const pending = visitsToday.filter((v) => {
      const s = (v.status || '').toLowerCase()
      return s === 'scheduled' || s === 'queued' || s === 'in_queue'
    }).length
    const activeNow = visitsToday.filter((v) => (v.status || '').toLowerCase() === 'in_progress').length
    const totalVisitsToday = visitsToday

    return {
      patientsToday: newRegisteredPatientsToday.size,
      activeNow,
      pending,
      visitsTodayCount: totalVisitsToday.length,
    }
  }, [visits])

  const upcomingList = useMemo(() => {
    const now = new Date()
    const visitById = new Map<string, ProviderVisitListItem>()
    for (const v of visits) {
      const id = String(v.visit_id || v.id || '').trim()
      if (id) visitById.set(id, v)
    }

    const merged = new Map<string, ProviderUpcomingAppointment>()

    for (const a of appointments) {
      const vid = String(a.visit_id || '').trim()
      if (!vid || !a.scheduled_start) continue
      if (!isFutureSlotToday(a.scheduled_start, now)) continue
      const visit = visitById.get(vid)
      const effectiveStatus = visit?.status ?? a.status
      if (!isNotVisitedYet(effectiveStatus)) continue
      merged.set(vid, { ...a, status: effectiveStatus })
    }

    for (const v of visits) {
      const sched = v.scheduled_start
      if (!sched) continue
      if (!isFutureSlotToday(sched, now)) continue
      const vid = String(v.visit_id || v.id || '').trim()
      if (!vid) continue
      if (!isNotVisitedYet(v.status)) continue
      if (!merged.has(vid)) merged.set(vid, visitToUpcomingRow(v))
    }

    return [...merged.values()].sort((x, y) => timeValue(x.scheduled_start) - timeValue(y.scheduled_start))
  }, [appointments, visits])
  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingList.length / PAGE_SIZE))
  const pagedUpcomingList = useMemo(() => {
    const start = (upcomingPage - 1) * PAGE_SIZE
    return upcomingList.slice(start, start + PAGE_SIZE)
  }, [upcomingList, upcomingPage])

  useEffect(() => {
    setUpcomingPage(1)
  }, [upcomingList.length])

  useEffect(() => {
    if (upcomingPage > upcomingTotalPages) setUpcomingPage(upcomingTotalPages)
  }, [upcomingPage, upcomingTotalPages])

  const subtitleComplaint = (name: string, complaint: string) =>
    complaint && complaint.trim() ? complaint.trim() : `Visit — ${name}`

  const headerName = provider.displayName || 'Dr.'

  return (
    <div className="min-h-screen bg-white text-[#171d16] font-manrope">
      <main className="min-h-screen">
        <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
          <div className="flex items-center gap-6">
            <button className="text-gray-500 transition-opacity hover:opacity-80" onClick={() => setIsNotificationsOpen(true)} type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{headerName}</p>
                <p className="text-[11px] text-gray-500">{provider.title || 'Clinical provider'}</p>
              </div>
              <img alt="Dr. Profile" className="h-10 w-10 rounded-full border border-gray-200 object-cover" src={provider.avatarUrl} />
            </div>
          </div>
        </header>

        <div className="space-y-8 p-8 pt-24">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
          {loading && <p className="text-sm text-gray-500">Loading dashboard…</p>}

          <section className="rounded-2xl bg-gradient-to-r from-[#111827] to-[#1f2937] px-7 py-7 text-white shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-2xl font-bold text-gray-300">Welcome back, {headerName}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="flex w-fit items-center gap-2 rounded-xl border border-white/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  onClick={() => navigate('/new-appointment')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                  New visit
                </button>
                <button
                  className="flex w-fit items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  onClick={() => navigate('/new-visit')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  New patient registration
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-4 gap-6">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
              <p className="text-[13px] uppercase text-gray-500">Patients Today</p>
              <h3 className="mt-1 text-3xl font-bold">{stats.patientsToday}</h3>
              <p className="mt-2 text-xs text-[#575e70]">New register patients with a slot today</p>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
              <p className="text-[13px] uppercase text-gray-500">Active Now</p>
              <h3 className="mt-1 text-3xl font-bold">{stats.activeNow}</h3>
              <p className="mt-2 text-xs text-[#575e70]">Visits marked in progress</p>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
              <p className="text-[13px] uppercase text-gray-500">Pending Tasks</p>
              <h3 className="mt-1 text-3xl font-bold">{stats.pending}</h3>
              <p className="mt-2 text-xs text-amber-600">Scheduled / queue board</p>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
              <p className="text-[13px] uppercase text-gray-500">Visit Today</p>
              <h3 className="mt-1 text-3xl font-bold">{stats.visitsTodayCount}</h3>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="border-b border-gray-100 p-6">
              <h2 className="text-[18px] font-semibold">Upcoming Schedule</h2>
              <p className="mt-1 text-xs text-gray-500">
                {upcomingList.length} today · upcoming and not yet seen
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {!loading && upcomingList.length === 0 && (
                <div className="p-6 text-sm text-gray-500">
                  No remaining slots today: either none are scheduled, all are completed or in progress, or times are in the past. Use Calendar to book or check visits.
                </div>
              )}
              {pagedUpcomingList.map((a, idx) => (
                <button
                  key={`${a.visit_id}-${a.scheduled_start}-${a.patient_id}-${idx}`}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                  onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                  type="button"
                >
                  <div>
                    <p className="font-semibold">{a.patient_name}</p>
                    <p className="text-xs text-gray-500">Type: {subtitleComplaint(a.patient_name, a.chief_complaint)}</p>
                  </div>
                  <p className="text-sm font-medium">{formatDateTimeShort(a.scheduled_start)}</p>
                </button>
              ))}
            </div>
            {!loading && upcomingList.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-600">
                  Showing {(upcomingPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(upcomingPage * PAGE_SIZE, upcomingList.length)} of {upcomingList.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={upcomingPage === 1}
                    onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                    type="button"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    {upcomingPage} / {upcomingTotalPages}
                  </span>
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={upcomingPage === upcomingTotalPages}
                    onClick={() => setUpcomingPage((p) => Math.min(upcomingTotalPages, p + 1))}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default ProviderDashboardPage
