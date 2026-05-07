import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

type DashboardSlotView = 'new-patients' | 'pending' | 'visits'
type DashboardSlotDay = 'today' | 'tomorrow'
const AUTO_REFRESH_MS = 10_000
const MIN_FOCUS_REFRESH_GAP_MS = 5_000

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

function normalizeVisitStatus(raw: string | undefined): string {
  return (raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function formatDateTimeShort(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toDisplayName(value: string | null | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return 'Patient'
  return raw
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ')
}

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

function parseView(raw: string | null): DashboardSlotView {
  if (raw === 'pending' || raw === 'visits') return raw
  return 'new-patients'
}

function parseDay(raw: string | null): DashboardSlotDay {
  if (raw === 'tomorrow') return 'tomorrow'
  return 'today'
}

function dayReference(day: DashboardSlotDay): Date {
  const ref = new Date()
  if (day === 'tomorrow') ref.setDate(ref.getDate() + 1)
  return ref
}

function subtitleForView(view: DashboardSlotView): string {
  if (view === 'new-patients') return 'Patients scheduled for the selected day'
  if (view === 'pending') return 'Scheduled / queued appointments yet to start'
  return 'All scheduled visits for the selected day'
}

function titleForView(view: DashboardSlotView, day: DashboardSlotDay): string {
  const dayLabel = day === 'today' ? 'Today' : 'Tomorrow'
  if (view === 'new-patients') return `New Patients ${dayLabel}`
  if (view === 'pending') return `Pending ${dayLabel}`
  return `Visits ${dayLabel}`
}

function DashboardSlotsPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [searchParams] = useSearchParams()
  const lastFocusRefetchAtRef = useRef(0)
  const view = parseView(searchParams.get('view'))
  const day = parseDay(searchParams.get('day'))
  const dayLabel = day === 'today' ? 'Today' : 'Tomorrow'

  const upcomingQuery = useQuery({
    queryKey: ['dashboard', 'slots', 'upcoming', DEFAULT_PROVIDER_ID],
    queryFn: () => fetchProviderUpcoming(DEFAULT_PROVIDER_ID),
    staleTime: 15_000,
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const visitsQuery = useQuery({
    queryKey: ['dashboard', 'slots', 'visits', DEFAULT_PROVIDER_ID],
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

  const selectedDaySlots = useMemo(() => {
    const now = new Date()
    if (day === 'today') return mergedUpcoming.filter((a) => isSameCalendarDay(a.scheduled_start, now))
    return mergedUpcoming.filter((a) => isTomorrowSlot(a.scheduled_start, now))
  }, [day, mergedUpcoming])

  const rows = useMemo(() => {
    if (view === 'pending') {
      const nowMs = Date.now()
      return selectedDaySlots.filter((slot) => {
        const status = normalizeVisitStatus(slot.status)
        const isFinished =
          status === 'completed' ||
          status === 'closed' ||
          status === 'ended' ||
          status === 'cancelled' ||
          status === 'canceled' ||
          status === 'in_progress'
        if (isFinished) return false
        if (day === 'tomorrow') return true
        return timeValue(slot.scheduled_start) >= nowMs
      })
    }
    if (view === 'visits') {
      const targetDayRef = dayReference(day)
      return visits
        .filter((visit) => isSameCalendarDay(visit.scheduled_start, targetDayRef))
        .map((visit) => visitToUpcomingRow(visit))
        .sort((x, y) => timeValue(x.scheduled_start) - timeValue(y.scheduled_start))
    }

    const targetDayRef = dayReference(day)
    const firstPerPatient = new Map<string, ProviderUpcomingAppointment>()
    for (const visit of visits) {
      const pid = (visit.patient_id || '').trim()
      if (!pid) continue
      const registeredAt = visit.patient_created_at
      const isNewlyRegistered = isSameCalendarDay(registeredAt, targetDayRef)
      if (!isNewlyRegistered) continue
      if (!isSameCalendarDay(visit.scheduled_start, targetDayRef)) continue
      const row = visitToUpcomingRow(visit)
      const existing = firstPerPatient.get(pid)
      if (!existing) {
        firstPerPatient.set(pid, row)
        continue
      }
      if (timeValue(row.scheduled_start) < timeValue(existing.scheduled_start)) {
        firstPerPatient.set(pid, row)
      }
    }
    return [...firstPerPatient.values()].sort((x, y) => timeValue(x.scheduled_start) - timeValue(y.scheduled_start))
  }, [day, selectedDaySlots, view, visits])

  return (
    <div className="min-h-screen bg-white text-[#171d16] font-manrope">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
        <button
          className="flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-[#171d16]"
          onClick={() => navigate('/dashboard')}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold">{provider.displayName || 'Dr.'}</p>
            <p className="text-[11px] text-gray-500">{provider.title || 'Clinical provider'}</p>
          </div>
          <img alt="Dr. Profile" className="h-10 w-10 rounded-full border border-gray-200 object-cover" src={provider.avatarUrl} />
        </div>
      </header>

      <main className="space-y-6 p-8 pt-24">
        <section className="px-1 py-1">
          <h1 className="text-[28px] leading-tight tracking-[-0.02em] font-bold text-[#171d16]">{titleForView(view, day)}</h1>
          <p className="text-slate-500 mt-1">
            {subtitleForView(view)} · {dayLabel}
          </p>
        </section>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-600">{loading ? 'Loading list…' : `${rows.length} record(s)`}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {!loading && rows.length === 0 && (
              <div className="p-6 text-sm text-gray-500">No records found for this selection.</div>
            )}
            {rows.map((item, idx) => (
              <button
                key={`${item.visit_id}-${item.patient_id}-${idx}`}
                className="flex w-full items-center justify-between gap-6 p-5 text-left transition-colors hover:bg-gray-50"
                onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(item.visit_id)}&tab=pre-visit`)}
                type="button"
              >
                <div>
                  <p className="font-semibold">{toDisplayName(item.patient_name)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    ID: …{(item.patient_id || '').slice(-10) || '—'} · {(item.status || 'open').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDateTimeShort(item.scheduled_start)}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.appointment_type || 'Visit'}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardSlotsPage
