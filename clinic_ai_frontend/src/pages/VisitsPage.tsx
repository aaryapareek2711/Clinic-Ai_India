import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderVisits,
  type ProviderVisitListItem,
} from '../services/visitWorkflowApi'

type VisitTab = 'all' | 'scheduled' | 'in-progress' | 'completed'
type RowTone = 'blue' | 'amber' | 'green'

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
  if (s === 'completed' || s === 'closed' || s === 'ended') return 'green'
  if (s === 'scheduled' || s === 'queued' || s === 'in_queue') return 'amber'
  return 'blue'
}

function stageForStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === 'scheduled') return 'Check-in pending'
  if (s === 'in_queue') return 'Waiting'
  if (s === 'in_progress') return 'Assessment stage'
  if (s === 'completed' || s === 'closed' || s === 'ended') return 'Billing finalized'
  return 'Visit'
}

function matchesVisitTab(v: ProviderVisitListItem, tab: VisitTab): boolean {
  const s = (v.status || '').toLowerCase()
  if (tab === 'all') return true
  if (tab === 'scheduled') return s === 'scheduled' || s === 'queued' || s === 'in_queue'
  if (tab === 'in-progress') return s === 'in_progress'
  if (tab === 'completed') return s === 'completed' || s === 'closed' || s === 'ended'
  return true
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

function visitRowFromApi(v: ProviderVisitListItem): {
  visitId: string
  name: string
  meta: string
  status: string
  stage: string
  date: string
  duration: string
  tone: RowTone
} {
  const visitId = (v.visit_id || v.id || '').trim()
  const subtitle =
    v.visit_type && v.visit_type.trim() && v.visit_type.toLowerCase() !== 'visit'
      ? v.visit_type.trim()
      : v.chief_complaint?.trim() || 'Consultation'
  const name = `${v.patient_name.trim() || 'Patient'} — ${subtitle}`
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
    meta,
    status: displayStatus(v.status || 'open'),
    stage: stageForStatus(v.status || ''),
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

function VisitsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<VisitTab>('all')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [visits, setVisits] = useState<ProviderVisitListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setListError(null)
        }
        const data = await fetchProviderVisits(DEFAULT_PROVIDER_ID)
        if (!cancelled) setVisits(data)
      } catch (e) {
        if (!cancelled) setListError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredVisits = useMemo(
    () => visits.filter((v) => matchesVisitTab(v, activeTab)),
    [visits, activeTab],
  )

  const filteredRows = useMemo(() => filteredVisits.map(visitRowFromApi), [filteredVisits])

  const tabStats = useMemo(() => {
    const norm = (s: string) => s.toLowerCase()
    const total = visits.length
    const activeNow = visits.filter((v) => norm(v.status) === 'in_progress').length
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const scheduledToday = visits.filter((v) => {
      if (!v.scheduled_start) return false
      const d = new Date(v.scheduled_start)
      if (Number.isNaN(d.getTime())) return false
      return d >= startOfToday && d < new Date(startOfToday.getTime() + 86400000)
    }).length
    const completed = visits.filter((v) => ['completed', 'closed', 'ended'].includes(norm(v.status))).length
    const rate = total > 0 ? `${Math.round((completed / total) * 1000) / 10}%` : '—'

    const scheduledCount = visits.filter((v) =>
      ['scheduled', 'queued', 'in_queue'].includes(norm(v.status)),
    ).length
    const inProg = visits.filter((v) => norm(v.status) === 'in_progress').length

    const baseAll = [
      { label: 'Total Visits', value: String(total), tone: 'text-[#171d16]' },
      { label: 'Active Now', value: String(activeNow), tone: 'text-[#3b82f6]' },
      { label: 'Scheduled Today', value: String(scheduledToday), tone: 'text-[#f59e0b]' },
      { label: 'Completion Rate', value: rate, tone: 'text-[#16a34a]' },
    ]
    const baseScheduled = [
      { label: 'Scheduled (board)', value: String(scheduledCount), tone: 'text-[#f59e0b]' },
      { label: 'In queue', value: String(visits.filter((v) => norm(v.status) === 'in_queue').length), tone: 'text-[#2563eb]' },
      { label: 'Upcoming', value: String(scheduledToday), tone: 'text-[#171d16]' },
      { label: 'Completed', value: String(completed), tone: 'text-[#16a34a]' },
    ]
    const baseInProgress = [
      { label: 'Active Visits', value: String(inProg), tone: 'text-[#3b82f6]' },
      { label: 'Scheduled next', value: String(scheduledCount), tone: 'text-[#171d16]' },
      { label: 'Completed', value: String(completed), tone: 'text-[#16a34a]' },
      { label: 'Total', value: String(total), tone: 'text-[#171d16]' },
    ]
    const baseCompleted = [
      { label: 'Completed', value: String(completed), tone: 'text-[#16a34a]' },
      { label: 'In progress', value: String(inProg), tone: 'text-[#3b82f6]' },
      { label: 'Scheduled', value: String(scheduledCount), tone: 'text-[#f59e0b]' },
      { label: 'Total', value: String(total), tone: 'text-[#171d16]' },
    ]

    const byTab: Record<VisitTab, { label: string; value: string; tone: string }[]> = {
      all: baseAll,
      scheduled: baseScheduled,
      'in-progress': baseInProgress,
      completed: baseCompleted,
    }
    return byTab
  }, [visits])

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
                <p className="text-sm font-semibold">Dr. Profile</p>
                <p className="text-[10px] text-gray-500">Chief Surgeon</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e9f0e5] border border-[#bdcaba]">
                <img
                  alt="Dr. Profile"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbp_oWoE3bnBWCkxmGVQ6riaAyjs30B1Lo4Yhu5A5siihngE_nkAwxix-gGJYVdzU4cQw_1IauziH6vjCZxnBvpbUStMTrJMrXVoRW824lR8gZXHpXH9NuXgGmlvJsypd8lBwB6F__9FwTsvsiOXcWv9zKXjR19PCkpmgUymUSSC8YnRLjQDZAudIip-mTk3zjw6nyQRhuMUQJ2PNfv001VyWkBwe_k2WUxeTtt-2IPbA-mra85Nie88vfkwye-IGtIoKlqYm8HsEM"
                />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {tabStats[activeTab].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</h3>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <span className="material-symbols-outlined text-sm">insights</span>
                  <span className="ml-1">Live operational signal</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
                Loading visits…
              </div>
            )}
            {!loading && !listError && filteredRows.length === 0 && (
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
                    <h4 className="font-semibold">{row.name}</h4>
                    <p className="text-sm text-gray-500">{row.meta}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClasses(row.tone)}`}>{row.status}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">{row.stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium">{row.date}</p>
                    <p className="text-xs text-gray-400">{row.duration}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#2563eb] transition-colors">chevron_right</span>
                </div>
              </div>
            ))}
          </div>

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
    </div>
  )
}

export default VisitsPage
