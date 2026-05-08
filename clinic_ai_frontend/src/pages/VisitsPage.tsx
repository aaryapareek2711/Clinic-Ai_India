import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '../lib/apiClient'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderVisitsPaged,
  scheduleVisitIntake,
  type ProviderVisitListItem,
} from '../services/visitWorkflowApi'

type VisitTab = 'all' | 'scheduled' | 'in-progress' | 'completed'
type RowTone = 'blue' | 'amber' | 'green'
type VisitSort =
  | 'patient_newest'
  | 'patient_oldest'
  | 'visit_latest'
  | 'visit_oldest'
  | 'time_newest'
  | 'time_oldest'
  | 'name_az'
  | 'name_za'
  | 'visit_id'
const PAGE_SIZE = 10
const AUTO_REFRESH_MS = 30_000
const MIN_FOCUS_REFRESH_GAP_MS = 8_000

function displayStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === 'in_progress') return 'In Progress'
  if (s === 'in_queue') return 'In Queue'
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function toneForStatus(status: string): RowTone {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'complete' || s === 'closed' || s === 'ended') return 'green'
  if (s === 'scheduled' || s === 'queued' || s === 'in_queue') return 'amber'
  return 'blue'
}

function stageForStatus(status: string, currentWorkflowStage?: string | null): string {
  const stage = String(currentWorkflowStage || '').trim().toLowerCase()
  if (stage === 'intake') return 'Intake'
  if (stage === 'pre_visit') return 'Pre-Visit'
  if (stage === 'vitals') return 'Vitals'
  if (stage === 'transcription') return 'Transcription'
  if (stage === 'clinical_note') return 'Clinical Note'
  if (stage === 'post_visit') return 'Post-Visit'
  if (stage === 'completed') return 'Completed'
  if (stage === 'cancelled') return 'Cancelled'
  if (stage === 'no_show') return 'No Show'
  const s = status.toLowerCase()
  if (s === 'scheduled') return 'Intake'
  if (s === 'queued' || s === 'in_queue') return 'Pre-Visit'
  if (s === 'in_progress') return 'Vitals / Transcript'
  if (s === 'completed' || s === 'complete' || s === 'closed' || s === 'ended') return 'Transcript completed'
  return 'Intake'
}

function formatVisitRowTimes(v: ProviderVisitListItem): { date: string; duration: string } {
  const sched = v.scheduled_start
  if (sched) {
    try {
      const d = new Date(sched)
      if (!Number.isNaN(d.getTime())) {
        const dateStr = d.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
        const dur =
          v.duration_minutes != null && v.duration_minutes >= 0
            ? `Duration: ${v.duration_minutes} min`
            : 'Scheduled'
        return { date: dateStr, duration: dur }
      }
    } catch {
      /* fall through */
    }
  }
  if (v.duration_minutes != null && v.duration_minutes >= 0) {
    return { date: 'Completed', duration: `Duration: ${v.duration_minutes} min` }
  }
  const created = v.created_at
  if (created) {
    try {
      const d = new Date(created)
      if (!Number.isNaN(d.getTime())) return { date: d.toLocaleDateString(), duration: 'Visit' }
    } catch {
      /* ignore */
    }
  }
  return { date: '—', duration: '' }
}

function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function canEditAppointment(scheduledIso: string | null | undefined): boolean {
  if (!scheduledIso) return false
  const t = new Date(scheduledIso).getTime()
  if (Number.isNaN(t)) return false
  return t >= Date.now()
}

function visitRowFromApi(v: ProviderVisitListItem): {
  visitId: string
  name: string
  patientName: string
  scheduledStart: string
  meta: string
  status: string
  stage: string
  date: string
  duration: string
  tone: RowTone
} {
  const toDisplayName = (value: string): string =>
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
      .join(' ')

  const visitId = (v.visit_id || v.id || '').trim()
  const subtitle =
    v.visit_type && v.visit_type.trim() && v.visit_type.toLowerCase() !== 'visit'
      ? v.visit_type.trim()
      : v.chief_complaint?.trim() || 'Consultation'
  const displayName = toDisplayName(v.patient_name || '') || 'Patient'
  const name = `${displayName} — ${subtitle}`
  const pid = v.patient_id?.trim() || ''
  const meta =
    pid.length > 0
      ? `ID: …${pid.slice(-10)}${v.mobile_number ? ` • ${v.mobile_number}` : ''}`
      : v.mobile_number
        ? String(v.mobile_number)
        : 'Patient'
  const { date, duration } = formatVisitRowTimes(v)
  return {
    visitId,
    name,
    patientName: displayName,
    scheduledStart: v.scheduled_start || '',
    meta,
    status: displayStatus(v.status || 'open'),
    stage: stageForStatus(v.status || '', v.current_workflow_stage),
    date,
    duration,
    tone: toneForStatus(v.status || ''),
  }
}
type NotificationTone = 'green' | 'blue' | 'teal' | 'gray'

const notifications = [
  {
    title: 'OPD Note Generated',
    subtitle: 'Visit Note: Arthur Morgan',
    body: 'AI has completed the transcription for the 10:15 AM session. Please review and sign.',
    time: '12m ago',
    icon: 'clinical_notes',
    tone: 'green' as NotificationTone,
    unread: true,
    actions: ['Review Note', 'Discard'],
  },
  {
    title: 'Lab Results',
    subtitle: 'Lab Report: Sarah Connor',
    body: 'Comprehensive Metabolic Panel (CMP) results are now available for review.',
    time: '1h ago',
    icon: 'biotech',
    tone: 'blue' as NotificationTone,
    unread: true,
    actions: ['View Results'],
  },
  {
    title: 'WhatsApp Message',
    subtitle: 'John Marston (Patient)',
    body: '"Doctor, I am feeling much better today. Should I continue the current dosage for another week?"',
    time: '3h ago',
    icon: 'chat_bubble',
    tone: 'teal' as NotificationTone,
    unread: false,
    actions: ['Reply Now'],
  },
  {
    title: 'System Notice',
    subtitle: 'Maintenance Scheduled',
    body: 'MedGenie servers will undergo brief maintenance on Sunday, June 12, at 2:00 AM UTC.',
    time: 'Yesterday',
    icon: 'update',
    tone: 'gray' as NotificationTone,
    unread: false,
    actions: [],
  },
] as const

function notificationToneClasses(tone: NotificationTone) {
  if (tone === 'green') return 'bg-green-50 text-[#16a34a] border-green-100'
  if (tone === 'blue') return 'bg-blue-50 text-[#2563eb] border-blue-100'
  if (tone === 'teal') return 'bg-[#25d366]/10 text-[#128c7e] border-[#25d366]/20'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function statusClasses(tone: string) {
  if (tone === 'amber') return 'bg-amber-100 text-[#f59e0b] border-amber-200'
  if (tone === 'green') return 'bg-green-100 text-[#22c55e] border-green-200'
  return 'bg-blue-100 text-[#3b82f6] border-blue-200'
}

function iconClasses(tone: string) {
  if (tone === 'amber') return 'bg-amber-50 text-amber-600'
  if (tone === 'green') return 'bg-green-50 text-green-600'
  return 'bg-blue-50 text-blue-600'
}

function statusFilterForTab(tab: VisitTab): string | undefined {
  if (tab === 'all') return undefined
  if (tab === 'scheduled') return 'scheduled'
  if (tab === 'in-progress') return 'in_progress'
  return 'completed'
}

function VisitsPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [activeTab, setActiveTab] = useState<VisitTab>('all')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<VisitSort>('patient_newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [rescheduleTarget, setRescheduleTarget] = useState<{ visitId: string; patientName: string } | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const lastFocusRefetchAtRef = useRef(0)
  const search = useMemo(() => searchQuery.trim() || undefined, [searchQuery])
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [
      'visits',
      'provider',
      DEFAULT_PROVIDER_ID,
      'paged',
      { page: currentPage, pageSize: PAGE_SIZE, tab: activeTab, search, sort: sortBy },
    ],
    queryFn: () =>
      fetchProviderVisitsPaged(DEFAULT_PROVIDER_ID, {
        page: currentPage,
        pageSize: PAGE_SIZE,
        statusFilter: statusFilterForTab(activeTab),
        search,
        sort: sortBy,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: false,
  })
  const visits: ProviderVisitListItem[] = data?.items ?? []
  const totalVisits = data?.total ?? 0
  const loading = isFetching && !data
  const listError = error ? getApiErrorMessage(error) : null

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusRefetchAtRef.current < MIN_FOCUS_REFRESH_GAP_MS) return
      lastFocusRefetchAtRef.current = now
      void refetch()
    }
    const onVisibility = () => {
      const now = Date.now()
      if (document.visibilityState !== 'visible') return
      if (now - lastFocusRefetchAtRef.current < MIN_FOCUS_REFRESH_GAP_MS) return
      lastFocusRefetchAtRef.current = now
      void refetch()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refetch])

  const filteredRows = useMemo(() => visits.map(visitRowFromApi), [visits])
  const totalPages = Math.max(1, Math.ceil(totalVisits / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, sortBy])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const tabTitles: Record<VisitTab, string> = {
    all: 'All Visits',
    scheduled: 'Scheduled Visits',
    'in-progress': 'In Progress Visits',
    completed: 'Completed Visits',
  }

  const tabDescriptions: Record<VisitTab, string> = {
    all: 'Manage patient visits and documentation',
    scheduled: 'Track upcoming appointments and ready check-ins',
    'in-progress': 'Monitor currently active consultations and stages',
    completed: 'Review closed visits and finalized documentation',
  }

  return (
    <div className="text-[#171d16] min-h-screen">
      <main className="min-h-screen">
        <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <button className="flex items-center gap-2 text-gray-500 hover:opacity-80 transition-opacity" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                aria-label="Open notifications"
                className="relative text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
                onClick={() => setIsNotificationsOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{provider.displayName}</p>
                <p className="text-[10px] text-gray-500">{provider.title}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bdcaba] bg-[#e9f0e5] text-[#3e4a3d]">
                <span className="material-symbols-outlined text-[22px]">account_circle</span>
              </div>
            </div>
          </div>
        </header>

        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h2 className="text-[28px] font-bold">{tabTitles[activeTab]}</h2>
            <p className="text-[#3e4a3d] mt-1">{tabDescriptions[activeTab]}</p>
          </div>

          {listError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {listError}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex bg-[#eff6ea] p-1 rounded-xl w-full max-w-[620px] border border-[#bdcaba]">
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'all' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('all')}
                type="button"
              >
                All Visits
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'scheduled' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('scheduled')}
                type="button"
              >
                Scheduled
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'in-progress' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('in-progress')}
                type="button"
              >
                In Progress
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'completed' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('completed')}
                type="button"
              >
                Completed
              </button>
            </div>
            <button
              className="shrink-0 rounded-lg bg-[#16a34a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d]"
              onClick={() => navigate('/start-visit')}
              type="button"
            >
              New Visit
            </button>
          </div>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, patient ID, mobile, or visit ID"
                type="text"
                value={searchQuery}
              />
            </div>
            <div className="relative min-w-[220px]">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[18px] text-slate-500">
                sort
              </span>
              <select
                aria-label="Sort visits"
                className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as VisitSort)}
              >
                <option value="patient_newest">New patient: newest first</option>
                <option value="patient_oldest">New patient: oldest first</option>
                <option value="visit_latest">Last visit: newest first</option>
                <option value="visit_oldest">Last visit: oldest first</option>
                <option value="time_newest">Time: newest first</option>
                <option value="time_oldest">Time: oldest first</option>
                <option value="name_az">Name: A → Z</option>
                <option value="name_za">Name: Z → A</option>
                <option value="visit_id">Visit ID</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                expand_more
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
                Loading visits…
              </div>
            )}
            {!loading && !listError && totalVisits === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
                <p className="font-medium text-[#171d16]">No visits to show</p>
                <p className="mt-1 text-sm text-gray-500">
                  Create a visit in the backend or calendar flow, then refresh this page.
                </p>
              </div>
            )}
            {!loading &&
              filteredRows.map((row, idx) => (
              <div
                key={row.visitId || `visit-row-${idx}`}
                className="group bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-[#2563eb] transition-all cursor-pointer"
                onClick={() => {
                  if (!row.visitId) return
                  navigate(
                    `/visits/detail?visitId=${encodeURIComponent(row.visitId)}&tab=pre-visit`,
                  )
                }}
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconClasses(row.tone)}`}>
                    <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{row.name}</h4>
                    <p className="text-sm text-gray-500">{row.meta}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClasses(row.tone)}`}>{row.status}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">{row.stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{row.date}</p>
                    <p className="text-xs text-gray-400">{row.duration}</p>
                  </div>
                  {canEditAppointment(row.scheduledStart) && (
                    <button
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#171d16] hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRescheduleTarget({ visitId: row.visitId, patientName: row.patientName })
                        if (row.scheduledStart) {
                          const dt = new Date(row.scheduledStart)
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
                        } else {
                          setRescheduleDate('')
                          setRescheduleTime('')
                        }
                        setRescheduleError(null)
                      }}
                      type="button"
                    >
                      Edit Appointment
                    </button>
                  )}
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#2563eb] transition-colors">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
          {!loading && !listError && totalVisits > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, totalVisits)} of {totalVisits}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {isNotificationsOpen && (
        <>
          <button
            aria-label="Close notifications panel"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsNotificationsOpen(false)}
            type="button"
          />
          <aside className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2563eb]">notifications_active</span>
                <h2 className="text-lg font-bold text-[#171d16]">Notifications</h2>
              </div>
              <button
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                onClick={() => setIsNotificationsOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-2 pt-2 border-b border-gray-100 bg-gray-50/50">
              <div className="flex gap-1 overflow-x-auto">
                <button className="px-4 py-3 text-sm font-semibold border-b-2 border-[#2563eb] text-[#2563eb] whitespace-nowrap" type="button">
                  All <span className="ml-1 bg-[#2563eb] text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.length}</span>
                </button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" type="button">Patients</button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" type="button">System</button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" type="button">WhatsApp</button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto bg-white">
              {notifications.map((item) => (
                <div key={`${item.title}-${item.time}`} className="p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-colors relative">
                  {item.unread && <div className="absolute right-4 top-4 w-2 h-2 bg-[#2563eb] rounded-full" />}
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${notificationToneClasses(item.tone)}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[13px] font-semibold uppercase text-gray-700">{item.title}</span>
                        <span className="text-[11px] text-gray-500 font-medium">{item.time}</span>
                      </div>
                      <p className="text-sm font-medium text-[#171d16] mb-1">{item.subtitle}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">{item.body}</p>
                      {item.actions.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {item.actions.map((action, idx) => (
                            <button
                              className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${idx === 0 ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]' : 'border border-gray-200 text-[#171d16] hover:bg-gray-50'}`}
                              key={action}
                              type="button"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button className="w-full py-2.5 text-sm font-semibold text-gray-600 hover:text-[#2563eb] flex items-center justify-center gap-2 transition-colors" type="button">
                <span className="material-symbols-outlined text-sm">done_all</span>
                Mark all as read
              </button>
            </div>
          </aside>
        </>
      )}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#171d16]">Edit appointment</h3>
            <p className="mt-1 text-sm text-[#3e4a3d]">{rescheduleTarget.patientName}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                Date
                <input
                  className="mt-1 w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm"
                  min={localDateInputMin()}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  type="date"
                  value={rescheduleDate}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                Time
                <input
                  className="mt-1 w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm"
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  type="time"
                  value={rescheduleTime}
                />
              </label>
            </div>
            {rescheduleError && <p className="mt-3 text-xs text-red-700">{rescheduleError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#171d16]"
                onClick={() => setRescheduleTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={rescheduleSubmitting || !rescheduleDate || !rescheduleTime}
                onClick={() => {
                  void (async () => {
                    if (!rescheduleTarget) return
                    setRescheduleSubmitting(true)
                    setRescheduleError(null)
                    try {
                      await scheduleVisitIntake(rescheduleTarget.visitId, {
                        appointment_date: rescheduleDate,
                        appointment_time: rescheduleTime,
                      })
                      setRescheduleTarget(null)
                      await refetch()
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
    </div>
  )
}

export default VisitsPage
