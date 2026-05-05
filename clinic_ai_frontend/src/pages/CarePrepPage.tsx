import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import { DEFAULT_PROVIDER_ID, fetchIntakeSession, fetchProviderVisits } from '../services/visitWorkflowApi'
import type { IntakeSessionResponse, ProviderVisitListItem } from '../services/visitWorkflowApi'

import NotificationsDrawer from './NotificationsDrawer'

type QueueFilter = 'all' | 'ready' | 'in_progress'
type QueueSort = 'time_newest' | 'time_oldest' | 'name_az' | 'name_za' | 'token'
type QueueSearchField = 'name' | 'token' | 'patient_id'
const PAGE_SIZE = 10

type QueueRow = {
  visitId: string
  patientId: string
  patientName: string
  tokenLabel: string
  dobLine: string
  submitted: string
  submittedMinutesAgo: number
  statusKind: 'complete' | 'progress'
  progressPct?: number
  action: 'review' | 'waiting'
  initials: string
  initialsClass: string
}

const INITIALS_CLASSES = ['bg-blue-600 text-white', 'bg-teal-600 text-white', 'bg-violet-600 text-white', 'bg-rose-600 text-white']

function initialsFromName(name: string): string {
  const p = name.split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return `${p[0][0] ?? ''}${p[1][0] ?? ''}`.toUpperCase()
}

function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 999_999
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 999_999
  return Math.max(0, Math.floor((Date.now() - t) / 60_000))
}

function submittedLabelMinutes(mins: number): string {
  if (mins >= 999_999) return '—'
  if (mins === 0) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function mapVisitAndIntake(visit: ProviderVisitListItem, intake: IntakeSessionResponse | null): QueueRow {
  const visitId = visit.visit_id || visit.id
  const patientId = visit.patient_id || ''
  const name = visit.patient_name?.trim() || 'Patient'
  const qaLen = intake?.question_answers?.length ?? 0
  const st = (intake?.status ?? 'not_started').toLowerCase()
  const touchedAt = intake?.updated_at || intake?.question_answers?.[qaLen - 1]?.answered_at || visit.created_at

  let statusKind: 'complete' | 'progress' = 'progress'
  let progressPct = Math.min(95, 10 + qaLen * 12)
  let action: 'review' | 'waiting' = 'waiting'

  if (!intake || st === 'not_started') {
    progressPct = 5
    action = 'waiting'
  } else if (st === 'stopped' && qaLen > 0) {
    statusKind = 'complete'
    progressPct = 100
    action = 'review'
  } else if (qaLen >= 6) {
    statusKind = 'complete'
    progressPct = 100
    action = 'review'
  } else if (qaLen > 0) {
    action = 'review'
  }

  const mins = minutesSince(touchedAt)
  const seed = visitId ? visitId.charCodeAt(0) : 63
  const initialsClass = INITIALS_CLASSES[Math.abs(seed) % INITIALS_CLASSES.length]

  return {
    visitId,
    patientId,
    patientName: name,
    tokenLabel: visitId.slice(-6).toUpperCase(),
    dobLine: `Patient ID …${patientId.slice(-10)}`,
    submitted: submittedLabelMinutes(mins),
    submittedMinutesAgo: mins,
    statusKind,
    progressPct,
    action,
    initials: initialsFromName(name),
    initialsClass,
  }
}

function applyQueueFilter(rows: QueueRow[], filter: QueueFilter): QueueRow[] {
  if (filter === 'ready') return rows.filter((p) => p.statusKind === 'complete')
  if (filter === 'in_progress') return rows.filter((p) => p.statusKind === 'progress')
  return rows
}

function sortQueueRows(rows: QueueRow[], sort: QueueSort): QueueRow[] {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sort === 'time_newest') return a.submittedMinutesAgo - b.submittedMinutesAgo
    if (sort === 'time_oldest') return b.submittedMinutesAgo - a.submittedMinutesAgo
    if (sort === 'name_az') return a.patientName.localeCompare(b.patientName)
    if (sort === 'name_za') return b.patientName.localeCompare(a.patientName)
    return a.tokenLabel.localeCompare(b.tokenLabel)
  })
  return copy
}

function StatusCell({ row }: { row: QueueRow }) {
  if (row.statusKind === 'complete') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-[#22c55e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          Intake ready
        </div>
      </div>
    )
  }
  const pct = row.progressPct ?? 0
  return (
    <div className="flex flex-col gap-1">
      <div className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-[#3b82f6]">{pct}%</div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CarePrepPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [queueSort, setQueueSort] = useState<QueueSort>('time_newest')
  const [searchField, setSearchField] = useState<QueueSearchField | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
        const visits = await fetchProviderVisits(DEFAULT_PROVIDER_ID)
        const candidate = [...visits]
          .filter((v) => String(v.visit_id || v.id || '').trim().length > 0)
          .sort((a, b) => {
            const ta = new Date(a.scheduled_start || a.created_at || '').getTime()
            const tb = new Date(b.scheduled_start || b.created_at || '').getTime()
            return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
          })
          .slice(0, 40)

        const intakes = await Promise.all(
          candidate.map((v) =>
            fetchIntakeSession(v.visit_id || v.id).catch(() => null),
          ),
        )

        const mapped = candidate.map((v, i) => mapVisitAndIntake(v, intakes[i]))
        if (!cancelled) setRows(mapped)
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

  const visiblePatients = useMemo(() => {
    const base = applyQueueFilter(rows, queueFilter)
    const q = searchQuery.trim().toLowerCase()
    const filtered = base.filter((r) => {
      if (!q || !searchField) return true
      if (searchField === 'name') return r.patientName.toLowerCase().includes(q)
      if (searchField === 'token') return r.tokenLabel.toLowerCase().includes(q)
      return r.patientId.toLowerCase().includes(q)
    })
    return sortQueueRows(filtered, queueSort)
  }, [rows, queueFilter, queueSort, searchQuery, searchField])
  const totalPages = Math.max(1, Math.ceil(visiblePatients.length / PAGE_SIZE))
  const pagedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return visiblePatients.slice(start, start + PAGE_SIZE)
  }, [visiblePatients, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [queueFilter, queueSort, searchQuery, searchField])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const totals = useMemo(() => {
    const total = rows.length
    const ready = rows.filter((r) => r.statusKind === 'complete').length
    const prog = rows.filter((r) => r.statusKind === 'progress').length
    return { total, ready, prog }
  }, [rows])

  function goToIntake(vid: string): void {
    navigate(`/careprep/intake/${encodeURIComponent(vid)}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4fcf0] font-sans tracking-tight text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex flex-1 items-center gap-6">
          <span className="text-lg font-bold text-slate-900">MedGenie CarePrep</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            aria-label="Open notifications"
            className="rounded-full p-2 text-slate-500 transition-transform hover:bg-slate-50 active:scale-95"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{provider.displayName}</p>
              <p className="text-[10px] uppercase text-[#3e4a3d]">{provider.title}</p>
            </div>
            <img alt="Dr. Profile" className="h-9 w-9 rounded-full border border-gray-200 object-cover" src={provider.avatarUrl} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-16">
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="mb-2 text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-[#171d16]">CarePrep Queue</h2>
            <p className="text-base leading-relaxed text-[#3e4a3d]">
              Intake status for active workspace visits.
            </p>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Loaded Queue</p>
              <p className="text-3xl font-bold text-[#171d16]">{totals.total}</p>
              <div className="mt-2 flex items-center text-xs font-medium text-[#006b2c]">
                <span className="material-symbols-outlined mr-1 text-sm">sync</span>
                <span>Live from API</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Ready for Review</p>
              <p className="text-3xl font-bold text-[#006b2c]">{totals.ready}</p>
              <div className="mt-2 flex items-center text-xs text-[#3e4a3d]">
                <span className="material-symbols-outlined mr-1 text-sm">check_circle</span>
                <span>Heuristic complete</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">In Progress</p>
              <p className="text-3xl font-bold text-amber-600">{totals.prog}</p>
              <div className="mt-2 flex items-center text-xs text-[#3e4a3d]">
                <span className="material-symbols-outlined mr-1 text-sm">pending</span>
                <span>Intake ongoing / minimal</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Status</p>
              <p className="text-3xl font-bold text-[#171d16]">{loading ? '…' : 'OK'}</p>
              <div className="mt-2 flex items-center text-xs text-[#3e4a3d]">
                <span className="material-symbols-outlined mr-1 text-sm">timer</span>
                <span>Up to 40 visits scanned</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[18px] leading-snug font-semibold text-[#171d16]">Active Intake Queue</h3>
              <div className="flex flex-wrap items-center gap-3">
                {searchField ? (
                  <div className="relative min-w-[240px]">
                    <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">search</span>
                    <input
                      className="w-full rounded-lg border border-[#bdcaba] bg-white py-2.5 pr-4 pl-9 text-sm text-[#171d16] placeholder:text-slate-400 shadow-sm focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/20 focus:outline-none"
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search by ${searchField === 'patient_id' ? 'patient ID' : searchField}`}
                      type="search"
                      value={searchQuery}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#bdcaba] bg-white px-4 py-2.5 text-sm text-slate-300">
                    Select filter first, then search bar opens.
                  </div>
                )}
                <div className="relative">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-[#bdcaba] bg-white px-4 py-2.5 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50"
                    onClick={() => setIsFilterOpen((v) => !v)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                    Filter
                  </button>
                  {isFilterOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-[#bdcaba] bg-white p-2 shadow-lg">
                      <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setSearchField('name'); setSearchQuery(''); setIsFilterOpen(false) }} type="button">Patient name</button>
                      <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setSearchField('token'); setSearchQuery(''); setIsFilterOpen(false) }} type="button">Token</button>
                      <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setSearchField('patient_id'); setSearchQuery(''); setIsFilterOpen(false) }} type="button">Patient ID</button>
                      <button className="mt-1 block w-full rounded px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50" onClick={() => { setSearchField(null); setSearchQuery(''); setIsFilterOpen(false) }} type="button">Clear filter</button>
                    </div>
                  )}
                </div>
                <div className="relative min-w-[220px]">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">sort</span>
                  <select
                    aria-label="Sort queue"
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#bdcaba] bg-white py-2 pr-9 pl-9 text-xs font-semibold text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/20 focus:outline-none"
                    value={queueSort}
                    onChange={(e) => setQueueSort(e.target.value as QueueSort)}
                  >
                    <option value="time_newest">Recency</option>
                    <option value="time_oldest">Oldest touched</option>
                    <option value="name_az">Name: A-Z</option>
                    <option value="name_za">Name: Z-A</option>
                    <option value="token">Token</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-slate-400">expand_more</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-slate-500">tune</span>
                  <select
                    aria-label="Filter queue"
                    className="cursor-pointer appearance-none rounded-lg border border-[#bdcaba] bg-white py-2 pr-9 pl-9 text-xs font-semibold text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/20 focus:outline-none"
                    value={queueFilter}
                    onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
                  >
                    <option value="all">All intakes</option>
                    <option value="ready">Ready heuristic</option>
                    <option value="in_progress">In progress</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-slate-400">expand_more</span>
                </div>
              </div>
            </div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Token</th>
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Patient Name</th>
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Last Activity</th>
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Intake Status</th>
                  <th className="px-6 py-4 text-right text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && visiblePatients.length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={5}>
                      No qualifying visits. Create or schedule visits in the backend, then refresh.
                    </td>
                  </tr>
                )}
                {pagedPatients.map((p) => (
                  <tr
                    key={p.visitId}
                    className={`transition-colors hover:bg-slate-50/80 ${p.action === 'review' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (p.action === 'review') goToIntake(p.visitId)
                    }}
                  >
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{p.tokenLabel}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${p.initialsClass}`}>{p.initials}</div>
                        <div>
                          <p className="font-medium text-[#171d16]">{p.patientName}</p>
                          <p className="text-xs text-[#3e4a3d]">{p.dobLine}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#3e4a3d]">{p.submitted}</td>
                    <td className="px-6 py-4">
                      <StatusCell row={p} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.action === 'review' ? (
                        <button
                          className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00873a] active:scale-95"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            goToIntake(p.visitId)
                          }}
                        >
                          Review Intake
                        </button>
                      ) : (
                        <button
                          className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500"
                          disabled
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Waiting...
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-[#3e4a3d]">
                {visiblePatients.length === 0
                  ? 'Showing 0 row(s)'
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, visiblePatients.length)} of ${visiblePatients.length} row(s)`}
                {queueFilter !== 'all' ? ' (filter applied)' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-auto border-t border-slate-200 bg-slate-50 p-8">
          <div className="flex flex-col items-center justify-between gap-4 text-xs font-medium text-[#3e4a3d] sm:flex-row">
            <p>© 2026 MedGenie AI Clinical Systems. All rights reserved.</p>
            <div className="flex gap-6">
              <a className="hover:text-[#006b2c]" href="#privacy">
                Privacy Policy
              </a>
              <a className="hover:text-[#006b2c]" href="#compliance">
                Compliance Hub
              </a>
              <a className="hover:text-[#006b2c]" href="#support">
                Support
              </a>
            </div>
          </div>
        </footer>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
