import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import BackButton from '../components/BackButton'
import ProviderHeaderProfileMenu from '../components/ProviderHeaderProfileMenu'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatPatientDisplayId } from '../lib/patientDisplayId'
import { DEFAULT_PROVIDER_ID, fetchProviderCarePrep } from '../services/visitWorkflowApi'
import type { CarePrepItem } from '../services/visitWorkflowApi'

import NotificationsDrawer from './NotificationsDrawer'

type CarePrepSort =
  | 'patient_newest'
  | 'patient_oldest'
  | 'name_az'
  | 'name_za'
  | 'visit_id'
const PAGE_SIZE = 10

type QueueRow = {
  visitId: string
  patientId: string
  patientName: string
  mobileNumber: string
  tokenLabel: string
  dobLine: string
  submitted: string
  submittedMinutesAgo: number
  patientCreatedAt: string
  statusKind: 'complete' | 'progress'
  progressPct?: number
  action: 'review' | 'waiting'
  initials: string
  initialsClass: string
}

const INITIALS_CLASSES = ['bg-blue-600 text-white', 'bg-teal-600 text-white', 'bg-violet-600 text-white', 'bg-rose-600 text-white']
const MAX_INTAKE_QUESTIONS = 8

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

function toDisplayName(value: string | null | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return 'Patient'
  return raw
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ')
}

function mapVisitAndIntake(visit: CarePrepItem): QueueRow {
  const visitId = visit.visit_id
  const patientId = visit.patient_id || ''
  const name = toDisplayName(visit.patient_name)
  const qaLen = Number(visit.intake_question_count ?? 0)
  const st = String(visit.intake_status || 'not_started').toLowerCase()
  const touchedAt = visit.touched_at

  let statusKind: 'complete' | 'progress' = 'progress'
  const answered = Math.max(0, Math.min(MAX_INTAKE_QUESTIONS, qaLen))
  let progressPct = Math.round((answered / MAX_INTAKE_QUESTIONS) * 100)
  let action: 'review' | 'waiting' = 'waiting'

  if (st === 'not_started') {
    progressPct = 0
    action = 'waiting'
  } else if (st === 'stopped' && qaLen > 0) {
    statusKind = 'complete'
    progressPct = 100
    action = 'review'
  } else if (qaLen >= MAX_INTAKE_QUESTIONS) {
    statusKind = 'complete'
    progressPct = 100
    action = 'review'
  } else if (qaLen > 0) {
    action = 'review'
  }
  // CarePrep row should always be navigable to intake details,
  // even when intake is not started yet.
  if (!visitId) action = 'waiting'
  else action = 'review'

  const mins = minutesSince(touchedAt)
  const seed = visitId ? visitId.charCodeAt(0) : 63
  const initialsClass = INITIALS_CLASSES[Math.abs(seed) % INITIALS_CLASSES.length]

  return {
    visitId,
    patientId,
    patientName: name,
    mobileNumber: String(visit.mobile_number || ''),
    tokenLabel: visitId.slice(-6).toUpperCase(),
    dobLine: formatPatientDisplayId(name, visit.mobile_number),
    submitted: submittedLabelMinutes(mins),
    submittedMinutesAgo: mins,
    patientCreatedAt: String(visit.patient_created_at || ''),
    statusKind,
    progressPct,
    action,
    initials: initialsFromName(name),
    initialsClass,
  }
}

function StatusCell({ row }: { row: QueueRow }) {
  if (row.statusKind === 'complete') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-[#22c55e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          Completed
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<CarePrepSort>('patient_newest')
  const [currentPage, setCurrentPage] = useState(1)
  const { data, isFetching, error } = useQuery({
    queryKey: [
      'careprep',
      'rows',
      DEFAULT_PROVIDER_ID,
      {
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        sort: sortBy,
      },
    ],
    queryFn: () =>
      fetchProviderCarePrep(DEFAULT_PROVIDER_ID, {
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        sort: sortBy,
      }),
    staleTime: 10_000,
  })
  const loading = isFetching && !data
  const errorMessage = error ? getApiErrorMessage(error) : null
  const rows = useMemo(() => {
    const visits: CarePrepItem[] = data?.items ?? []
    return visits.map((v) => mapVisitAndIntake(v))
  }, [data])

  const visiblePatients = useMemo(() => rows, [rows])
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const pagedPatients = visiblePatients

  // Reset to page 1 whenever the search or sort changes so an empty/small
  // result set isn't shown as "0 rows" on a leftover page index.
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  // Clamp the page index when the total shrinks (e.g. after applying a search).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  function goToIntake(vid: string): void {
    navigate(`/careprep/intake/${encodeURIComponent(vid)}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4fcf0] font-sans tracking-tight text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex flex-1 items-center gap-4">
          <BackButton to="/dashboard" className="-ml-2 font-manrope" />
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-[#171d16]">Care Prep</h2>
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
          <ProviderHeaderProfileMenu />
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-20">
        <div className="flex-1 px-8 pb-8">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          <div className="mb-8">
            <p className="text-slate-500">Manage and monitor intake of all patients.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[18px] leading-snug font-semibold text-[#171d16]">Patients</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[320px]">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    search
                  </span>
                  <input
                    className="w-full rounded-lg border border-[#bdcaba] bg-white py-2.5 pr-4 pl-9 text-sm text-[#171d16] placeholder:text-slate-400 shadow-sm focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/20 focus:outline-none"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by patient name, patient ID, mobile, or visit ID"
                    type="search"
                    value={searchQuery}
                  />
                </div>
                <div className="relative min-w-[220px]">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    sort
                  </span>
                  <select
                    aria-label="Sort patients"
                    className="w-full appearance-none cursor-pointer rounded-lg border border-[#bdcaba] bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/20 focus:outline-none"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as CarePrepSort)}
                  >
                    <option value="patient_newest">New patient: newest first</option>
                    <option value="patient_oldest">New patient: oldest first</option>
                    <option value="name_az">Name: A → Z</option>
                    <option value="name_za">Name: Z → A</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Patient Name</th>
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Last Activity</th>
                  <th className="px-6 py-4 text-[13px] font-medium tracking-[0.05em] text-[#3e4a3d] uppercase">Intake Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={3}>
                      Loading patients…
                    </td>
                  </tr>
                )}
                {!loading && visiblePatients.length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={3}>
                      No qualifying visits. Create or schedule visits in the backend, then refresh.
                    </td>
                  </tr>
                )}
                {pagedPatients.map((p) => (
                  <tr
                    key={p.visitId}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    onClick={() => {
                      goToIntake(p.visitId)
                    }}
                  >
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
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-[#3e4a3d]">
                {visiblePatients.length === 0
                  ? 'Showing 0 row(s)'
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, visiblePatients.length)} of ${visiblePatients.length} row(s)`}
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
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
