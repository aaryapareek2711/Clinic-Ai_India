import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import { fetchMyProfile } from '../services/profileApi'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderUpcoming,
  fetchProviderVisits,
  type ProviderUpcomingAppointment,
  type ProviderVisitListItem,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

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

function formatTimeShort(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatVisitDay(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function displayStatus(raw: string | undefined): string {
  const s = (raw || '').toLowerCase()
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ProviderDashboardPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [welcomeName, setWelcomeName] = useState<string>('Provider')
  const [welcomeTitle, setWelcomeTitle] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<ProviderUpcomingAppointment[]>([])
  const [visits, setVisits] = useState<ProviderVisitListItem[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
        const [upcomingRows, visitRows] = await Promise.all([
          fetchProviderUpcoming(DEFAULT_PROVIDER_ID),
          fetchProviderVisits(DEFAULT_PROVIDER_ID),
        ])
        try {
          const me = await fetchMyProfile()
          if (!cancelled) {
            setWelcomeName(me.full_name?.trim() || me.username || 'Provider')
            setWelcomeTitle(me.job_title?.trim() || me.role?.replace(/_/g, ' ') || '')
          }
        } catch {
          if (!cancelled) setWelcomeTitle('')
        }
        if (!cancelled) {
          setAppointments(upcomingRows)
          setVisits(visitRows)
        }
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])

  const stats = useMemo(() => {
    const patientsTodayIds = new Set<string>()
    for (const v of visits) {
      if (isSameCalendarDay(v.scheduled_start ?? null, today)) {
        if (v.patient_id) patientsTodayIds.add(v.patient_id)
      }
    }
    for (const a of appointments) {
      if (isSameCalendarDay(a.scheduled_start, today)) {
        patientsTodayIds.add(a.patient_id)
      }
    }
    const pending = visits.filter((v) => {
      const s = (v.status || '').toLowerCase()
      return s === 'scheduled' || s === 'queued' || s === 'in_queue'
    }).length
    const activeNow = visits.filter((v) => (v.status || '').toLowerCase() === 'in_progress').length
    const completed = visits.filter((v) => ['completed', 'closed', 'ended'].includes((v.status || '').toLowerCase()))

    let latestCompletedLabel = '—'
    const withEnd = completed
      .map((v) => ({ v, t: v.actual_end ? new Date(v.actual_end).getTime() : 0 }))
      .filter((x) => x.t > 0)
      .sort((a, b) => b.t - a.t)
    if (withEnd[0]) {
      latestCompletedLabel = formatTimeShort(withEnd[0].v.actual_end!)
    }

    return {
      patientsToday: patientsTodayIds.size,
      activeNow,
      pending,
      opdLabel: completed.length === 0 ? 'No closed visits loaded' : `${completed.length} visit(s) completed (loaded)`,
      opdLatest: completed.length === 0 ? '' : `Last closed slot: ${latestCompletedLabel}`,
    }
  }, [appointments, visits, today])

  const upcomingList = useMemo(() => {
    return [...appointments]
      .filter((a) => a.scheduled_start)
      .sort((x, y) => new Date(x.scheduled_start).getTime() - new Date(y.scheduled_start).getTime())
      .slice(0, 10)
  }, [appointments])

  const recentVisitsRows = useMemo(() => {
    return [...visits].slice(0, 12)
  }, [visits])

  const subtitleComplaint = (name: string, complaint: string) =>
    complaint && complaint.trim() ? complaint.trim() : `Visit — ${name}`

  return (
    <div className="text-[#171d16] min-h-screen font-manrope">
      <main className="min-h-screen">
        <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
          <div className="w-[360px]">
            <input className="w-full rounded-lg border border-gray-200 bg-[#f6f8fa] px-4 py-2 text-sm outline-none focus:border-[#16a34a]" placeholder="Search patient, visit, or note..." type="text" />
          </div>
          <div className="flex items-center gap-6">
            <button className="text-gray-500 transition-opacity hover:opacity-80" onClick={() => setIsNotificationsOpen(true)} type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{welcomeName}</p>
                <p className="text-[11px] text-gray-500">{welcomeTitle || 'Clinical provider'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#00873a] bg-[#eff6ea] text-[#006b2c]">
                <span className="material-symbols-outlined text-[22px]">person</span>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-16 flex h-[120px] items-center justify-between bg-[#111827] px-8">
          <div>
            <h1 className="text-[28px] font-bold text-white">Provider Dashboard</h1>
            <p className="text-sm text-[#9ca3af]">Welcome back{welcomeName ? `, ${welcomeName}` : ''}</p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex w-fit items-center gap-2 rounded-lg bg-[#16a34a] px-6 py-2.5 font-medium text-white hover:opacity-90"
              onClick={() => navigate('/new-visit')}
              type="button"
            >
              <span className="material-symbols-outlined">add</span>
              New Visit
            </button>
            <button className="rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90" onClick={() => navigate('/careprep')} type="button">
              CarePrep
            </button>
          </div>
        </section>

        <div className="space-y-8 p-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
          {loading && <p className="text-sm text-gray-500">Loading dashboard…</p>}

          <div className="grid grid-cols-4 gap-6">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
              <p className="text-[13px] uppercase text-gray-500">Patients Today</p>
              <h3 className="mt-1 text-3xl font-bold">{stats.patientsToday}</h3>
              <p className="mt-2 text-xs text-[#575e70]">Unique patients with a slot today</p>
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
              <p className="text-[13px] uppercase text-gray-500">Visit Outcomes</p>
              <h3 className="mt-1 text-2xl font-bold leading-snug">{stats.opdLabel}</h3>
              <p className="mt-2 text-xs text-gray-400">{stats.opdLatest}</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
              <div className="border-b border-gray-100 p-6">
                <h2 className="text-[18px] font-semibold">Upcoming Schedule</h2>
                <p className="mt-1 text-xs text-gray-500">{upcomingList.length} appointment(s) from backend</p>
              </div>
              <div className="divide-y divide-gray-100">
                {!loading && upcomingList.length === 0 && (
                  <div className="p-6 text-sm text-gray-500">No upcoming appointments returned. Seed visits with <code className="font-mono text-xs">scheduled_start</code> or open Calendar.</div>
                )}
                {upcomingList.map((a) => (
                  <button
                    key={a.visit_id}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(a.visit_id)}&tab=pre-visit`)}
                    type="button"
                  >
                    <div>
                      <p className="font-semibold">{a.patient_name}</p>
                      <p className="text-xs text-gray-500">Type: {subtitleComplaint(a.patient_name, a.chief_complaint)}</p>
                    </div>
                    <p className="text-sm font-medium">{formatTimeShort(a.scheduled_start)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
              <div className="border-b border-gray-100 p-6">
                <h2 className="text-[18px] font-semibold">Recent Visits</h2>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4 font-semibold">Visit</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!loading && recentVisitsRows.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-sm text-gray-500" colSpan={3}>No visits in workspace yet.</td>
                    </tr>
                  )}
                  {recentVisitsRows.map((v) => {
                    const vid = v.visit_id || v.id
                    const tone = (v.status || '').toLowerCase()
                    const badge =
                      tone === 'completed' || tone === 'closed' || tone === 'ended'
                        ? 'bg-green-100 text-green-700'
                        : tone === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                    return (
                      <tr key={vid} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(vid)}&tab=pre-visit`)}>
                        <td className="px-6 py-4 font-medium">{v.patient_name} — {v.chief_complaint?.trim() || v.visit_type || 'Consultation'}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${badge}`}>{displayStatus(v.status)}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatVisitDay(v.scheduled_start || v.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default ProviderDashboardPage
