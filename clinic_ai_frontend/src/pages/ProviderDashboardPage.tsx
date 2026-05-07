import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

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
const INITIAL_UPCOMING_COUNT = 5
const UPCOMING_LOAD_MORE_STEP = 10
const AUTO_REFRESH_MS = 20_000
const MIN_FOCUS_REFRESH_GAP_MS = 8_000

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

function toDisplayName(value: string | null | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return 'Patient'
  return raw
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ')
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

function isTomorrowSlot(scheduledIso: string, ref: Date): boolean {
  if (!scheduledIso) return false
  const d = new Date(ref)
  d.setDate(d.getDate() + 1)
  return isSameCalendarDay(scheduledIso, d)
}

function dayReference(day: 'today' | 'tomorrow'): Date {
  const ref = new Date()
  if (day === 'tomorrow') ref.setDate(ref.getDate() + 1)
  return ref
}

function ProviderDashboardPage() {
  const provider = useProviderIdentity()
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [upcomingDayFilter, setUpcomingDayFilter] = useState<'today' | 'tomorrow'>('today')
  const [upcomingVisibleCount, setUpcomingVisibleCount] = useState(INITIAL_UPCOMING_COUNT)
  const lastFocusRefetchAtRef = useRef(0)

  const upcomingQuery = useQuery({
    queryKey: ['dashboard', 'upcoming', DEFAULT_PROVIDER_ID],
    queryFn: () => fetchProviderUpcoming(DEFAULT_PROVIDER_ID),
    staleTime: 15_000,
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: false,
  })
  const visitsQuery = useQuery({
    queryKey: ['dashboard', 'visits', DEFAULT_PROVIDER_ID],
    queryFn: () => fetchProviderVisits(DEFAULT_PROVIDER_ID),
    staleTime: 15_000,
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const appointments: ProviderUpcomingAppointment[] = upcomingQuery.data ?? []
  const visits: ProviderVisitListItem[] = visitsQuery.data ?? []
  const loading = (upcomingQuery.isFetching && !upcomingQuery.data) || (visitsQuery.isFetching && !visitsQuery.data)
  const error = useMemo(() => {
    const errs: string[] = []
    if (upcomingQuery.error) errs.push(getApiErrorMessage(upcomingQuery.error))
    if (visitsQuery.error) errs.push(getApiErrorMessage(visitsQuery.error))
    return errs.length ? [...new Set(errs)].join(' · ') : null
  }, [upcomingQuery.error, visitsQuery.error])

  useEffect(() => {
    const onVisible = () => {
      const now = Date.now()
      if (document.visibilityState === 'visible' && now - lastFocusRefetchAtRef.current >= MIN_FOCUS_REFRESH_GAP_MS) {
        lastFocusRefetchAtRef.current = now
        void upcomingQuery.refetch()
        void visitsQuery.refetch()
      }
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [upcomingQuery, visitsQuery])

  const mergedUpcoming = useMemo(() => {
    const visitById = new Map<string, ProviderVisitListItem>()
    for (const v of visits) {
      const id = String(v.visit_id || v.id || '').trim()
      if (id) visitById.set(id, v)
    }

    const merged = new Map<string, ProviderUpcomingAppointment>()

    for (const a of appointments) {
      const vid = String(a.visit_id || '').trim()
      if (!vid || !a.scheduled_start) continue
      const visit = visitById.get(vid)
      const effectiveStatus = visit?.status ?? a.status
      if (!isNotVisitedYet(effectiveStatus)) continue
      merged.set(vid, { ...a, status: effectiveStatus })
    }

    for (const v of visits) {
      const sched = v.scheduled_start
      if (!sched) continue
      const vid = String(v.visit_id || v.id || '').trim()
      if (!vid) continue
      if (!isNotVisitedYet(v.status)) continue
      if (!merged.has(vid)) merged.set(vid, visitToUpcomingRow(v))
    }

    return [...merged.values()].sort((x, y) => timeValue(x.scheduled_start) - timeValue(y.scheduled_start))
  }, [appointments, visits])

  const dayLabel = upcomingDayFilter === 'today' ? 'Today' : 'Tomorrow'

  const selectedDayAllSlots = useMemo(() => {
    const now = new Date()
    if (upcomingDayFilter === 'today') {
      return mergedUpcoming.filter((a) => isSameCalendarDay(a.scheduled_start, now))
    }
    return mergedUpcoming.filter((a) => isTomorrowSlot(a.scheduled_start, now))
  }, [mergedUpcoming, upcomingDayFilter])

  const selectedDayAllVisits = useMemo(() => {
    const now = new Date()
    if (upcomingDayFilter === 'today') {
      return visits.filter((v) => isSameCalendarDay(v.scheduled_start, now))
    }
    return visits.filter((v) => isTomorrowSlot(v.scheduled_start || '', now))
  }, [upcomingDayFilter, visits])

  const selectedDayUpcomingSlots = useMemo(() => {
    const now = new Date()
    if (upcomingDayFilter === 'today') {
      const nowMs = now.getTime()
      return mergedUpcoming.filter((a) => {
        if (!isSameCalendarDay(a.scheduled_start, now)) return false
        const slotMs = timeValue(a.scheduled_start)
        return slotMs >= nowMs
      })
    }
    return mergedUpcoming.filter((a) => isTomorrowSlot(a.scheduled_start, now))
  }, [mergedUpcoming, upcomingDayFilter])

  const stats = useMemo(() => {
    const targetDayRef = dayReference(upcomingDayFilter)
    const patientsForDaySet = new Set<string>()
    for (const visit of visits) {
      const pid = (visit.patient_id || '').trim()
      if (!pid) continue
      const isNewlyRegistered = isSameCalendarDay(visit?.patient_created_at, targetDayRef)
      if (!isNewlyRegistered) continue
      if (!isSameCalendarDay(visit.scheduled_start, targetDayRef)) continue
      patientsForDaySet.add(pid)
    }
    const pending = selectedDayUpcomingSlots.filter((a) => {
      const s = normalizeVisitStatus(a.status)
      return !['completed', 'closed', 'ended', 'cancelled', 'canceled', 'in_progress'].includes(s)
    }).length
    return {
      patientsForDay: patientsForDaySet.size,
      pending,
      visitsForDayCount: selectedDayAllVisits.length,
    }
  }, [selectedDayUpcomingSlots, upcomingDayFilter, visits, selectedDayAllVisits.length])

  const upcomingList = useMemo(() => {
    const now = new Date()
    if (upcomingDayFilter === 'today') {
      const nowMs = now.getTime()
      return visits
        .filter((v) => {
          if (!isSameCalendarDay(v.scheduled_start, now)) return false
          return timeValue(v.scheduled_start) >= nowMs
        })
        .map((v) => visitToUpcomingRow(v))
        .sort((a, b) => timeValue(a.scheduled_start) - timeValue(b.scheduled_start))
    }
    return visits
      .filter((v) => isTomorrowSlot(v.scheduled_start || '', now))
      .map((v) => visitToUpcomingRow(v))
      .sort((a, b) => timeValue(a.scheduled_start) - timeValue(b.scheduled_start))
  }, [upcomingDayFilter, visits])

  const visibleUpcoming = useMemo(
    () => upcomingList.slice(0, upcomingVisibleCount),
    [upcomingList, upcomingVisibleCount],
  )

  useEffect(() => {
    setUpcomingVisibleCount(INITIAL_UPCOMING_COUNT)
  }, [upcomingDayFilter, upcomingList.length])

  const visitModeLabel = (rawType: string | undefined) => {
    const t = (rawType || '').trim().toLowerCase()
    if (t.includes('walk_in') || t.includes('walk-in') || t.includes('walkin')) return 'Walk-in'
    return 'Scheduled'
  }

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

          <section className="rounded-2xl bg-gradient-to-r from-[#111827] to-[#1f2937] px-8 py-12 text-white shadow-lg">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-2xl font-bold text-white">Welcome , {headerName}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="flex w-fit items-center gap-2 rounded-xl bg-[#16a34a] px-5 py-2.5 text-base font-semibold text-white hover:opacity-90"
                  onClick={() => navigate('/start-visit')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                  New Visit
                </button>
                <button
                  className="flex w-fit items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/20"
                  onClick={() => navigate('/new-visit')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  Register new patient
                </button>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-start gap-2">
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                upcomingDayFilter === 'today' ? 'bg-[#16a34a] text-white' : 'border border-gray-200 bg-white text-[#171d16]'
              }`}
              onClick={() => setUpcomingDayFilter('today')}
              type="button"
            >
              Today
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                upcomingDayFilter === 'tomorrow' ? 'bg-[#16a34a] text-white' : 'border border-gray-200 bg-white text-[#171d16]'
              }`}
              onClick={() => setUpcomingDayFilter('tomorrow')}
              type="button"
            >
              Tomorrow
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <button
              className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-left transition-all hover:border-[#16a34a] hover:shadow-sm"
              onClick={() => navigate(`/dashboard/slots?view=new-patients&day=${upcomingDayFilter}`)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] uppercase text-gray-500">New patients {dayLabel}</p>
                  <h3 className="mt-1 text-3xl font-bold">{stats.patientsForDay}</h3>
                  <p className="mt-2 text-xs text-[#575e70]">Newly registered patients with today&apos;s slot</p>
                </div>
                <span className="material-symbols-outlined text-2xl text-[#16a34a]">stethoscope</span>
              </div>
            </button>
            <button
              className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-left transition-all hover:border-[#f59e0b] hover:shadow-sm"
              onClick={() => navigate(`/dashboard/slots?view=pending&day=${upcomingDayFilter}`)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] uppercase text-gray-500">Pending {dayLabel}</p>
                  <h3 className="mt-1 text-3xl font-bold">{stats.pending}</h3>
                  <p className="mt-2 text-xs text-amber-600">Scheduled / queue board</p>
                </div>
                <span className="material-symbols-outlined text-2xl text-[#f59e0b]">schedule</span>
              </div>
            </button>
            <button
              className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-left transition-all hover:border-[#2563eb] hover:shadow-sm"
              onClick={() => navigate(`/dashboard/slots?view=visits&day=${upcomingDayFilter}`)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] uppercase text-gray-500">Visit {dayLabel}</p>
                  <h3 className="mt-1 text-3xl font-bold">{stats.visitsForDayCount}</h3>
                  <p className="mt-2 text-xs text-[#575e70]">Total patients with {upcomingDayFilter} slot</p>
                </div>
                <span className="material-symbols-outlined text-2xl text-[#2563eb]">calendar_month</span>
              </div>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[24px] font-bold leading-tight">Upcoming Schedule</h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {upcomingList.length} {upcomingDayFilter} · total slots
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {!loading && upcomingList.length === 0 && (
                <div className="p-6 text-sm text-gray-500">
                  No remaining slots today: either none are scheduled, all are completed or in progress, or times are in the past. Use Calendar to book or check visits.
                </div>
              )}
              {visibleUpcoming.map((a, idx) => (
                <button
                  key={`${a.visit_id}-${a.scheduled_start}-${a.patient_id}-${idx}`}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                  onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                  type="button"
                >
                  <div>
                    <p className="font-semibold">{toDisplayName(a.patient_name)}</p>
                    <p className="text-xs text-gray-500">Type: {visitModeLabel(a.appointment_type)}</p>
                  </div>
                  <p className="text-sm font-medium">{formatDateTimeShort(a.scheduled_start)}</p>
                </button>
              ))}
            </div>
            {!loading && upcomingList.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-600">
                  Showing 1-{Math.min(upcomingVisibleCount, upcomingList.length)} of {upcomingList.length}
                </p>
                {upcomingVisibleCount < upcomingList.length ? (
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-[#171d16] hover:bg-gray-50"
                    onClick={() =>
                      setUpcomingVisibleCount((n) => Math.min(n + UPCOMING_LOAD_MORE_STEP, upcomingList.length))
                    }
                    type="button"
                  >
                    View more
                  </button>
                ) : (
                  <span className="text-sm text-gray-500">All shown</span>
                )}
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
