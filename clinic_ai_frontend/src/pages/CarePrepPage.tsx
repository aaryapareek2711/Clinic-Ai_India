import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import NotificationsDrawer from './NotificationsDrawer'
import type { CarePrepQueuePatient } from '../data/carePrepPatients'
import { carePrepPatients } from '../data/carePrepPatients'

type QueueFilter = 'all' | 'ready' | 'in_progress'
type QueueSort = 'time_newest' | 'time_oldest' | 'name_az' | 'name_za' | 'token'

function applyQueueFilter(patients: CarePrepQueuePatient[], filter: QueueFilter): CarePrepQueuePatient[] {
  if (filter === 'ready') return patients.filter((p) => p.statusKind === 'complete')
  if (filter === 'in_progress') return patients.filter((p) => p.statusKind === 'progress')
  return patients
}

function sortQueuePatients(patients: CarePrepQueuePatient[], sort: QueueSort): CarePrepQueuePatient[] {
  const copy = [...patients]
  copy.sort((a, b) => {
    if (sort === 'time_newest') return a.submittedMinutesAgo - b.submittedMinutesAgo
    if (sort === 'time_oldest') return b.submittedMinutesAgo - a.submittedMinutesAgo
    if (sort === 'name_az') return a.name.localeCompare(b.name)
    if (sort === 'name_za') return b.name.localeCompare(a.name)
    return a.tokenKey.localeCompare(b.tokenKey)
  })
  return copy
}

function StatusCell({ patient }: { patient: CarePrepQueuePatient }) {
  if (patient.statusKind === 'complete') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-[#22c55e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          100% Complete
        </div>
      </div>
    )
  }
  const pct = patient.progressPct ?? 0
  return (
    <div className="flex flex-col gap-1">
      <div className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-[#3b82f6]">{pct}% Complete</div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CarePrepPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [queueSort, setQueueSort] = useState<QueueSort>('time_newest')

  const visiblePatients = useMemo(() => {
    const filtered = applyQueueFilter(carePrepPatients, queueFilter)
    return sortQueuePatients(filtered, queueSort)
  }, [queueFilter, queueSort])

  function goToIntake(p: CarePrepQueuePatient) {
    if (p.action !== 'review' || !p.intake) return
    navigate(`/careprep/intake/${encodeURIComponent(p.tokenKey)}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4fcf0] font-sans text-[#171d16] antialiased tracking-tight">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex flex-1 items-center gap-6">
          <span className="text-lg font-bold text-slate-900">MedGenie CarePrep</span>
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              search
            </span>
            <input
              className="w-full rounded-lg border border-[#bdcaba] bg-[#eff6ea] py-2 pl-10 pr-4 text-sm transition-all outline-none focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/20"
              placeholder="Search patient name, token, or ID..."
              type="search"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Open notifications"
            className="rounded-full p-2 text-slate-500 transition-transform hover:bg-slate-50 active:scale-95"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-16">
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="mb-2 text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-[#171d16]">CarePrep Queue</h2>
            <p className="text-base leading-relaxed text-[#3e4a3d]">Review and manage clinical intake reports for pending patients.</p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">Total Queue</p>
              <p className="text-3xl font-bold text-[#171d16]">12</p>
              <div className="mt-2 flex items-center text-xs font-medium text-[#006b2c]">
                <span className="material-symbols-outlined mr-1 text-sm">trending_up</span>
                <span>+2 since 8 AM</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">Ready for Review</p>
              <p className="text-3xl font-bold text-[#006b2c]">8</p>
              <div className="mt-2 flex items-center text-xs text-[#3e4a3d]">
                <span className="material-symbols-outlined mr-1 text-sm">check_circle</span>
                <span>100% Intake Complete</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">In Progress</p>
              <p className="text-3xl font-bold text-amber-600">4</p>
              <div className="mt-2 flex items-center text-xs text-[#3e4a3d]">
                <span className="material-symbols-outlined mr-1 text-sm">pending</span>
                <span>Awaiting digital form completion</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-1 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">Avg. Wait Time</p>
              <p className="text-3xl font-bold text-[#171d16]">14m</p>
              <div className="mt-2 flex items-center text-xs text-[#3e4a3d]">
                <span className="material-symbols-outlined mr-1 text-sm">timer</span>
                <span>Optimal range</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[18px] font-semibold leading-snug text-[#171d16]">Active Intake Queue</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    filter_list
                  </span>
                  <select
                    aria-label="Filter queue"
                    className="appearance-none cursor-pointer rounded-lg border border-[#bdcaba] bg-white py-2 pl-9 pr-9 text-xs font-semibold text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#006b2c] focus:outline-none focus:ring-2 focus:ring-[#006b2c]/20"
                    value={queueFilter}
                    onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
                  >
                    <option value="all">All intakes</option>
                    <option value="ready">100% complete</option>
                    <option value="in_progress">Intake in progress</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    expand_more
                  </span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    sort
                  </span>
                  <select
                    aria-label="Sort queue"
                    className="appearance-none cursor-pointer rounded-lg border border-[#bdcaba] bg-white py-2 pl-9 pr-9 text-xs font-semibold text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#006b2c] focus:outline-none focus:ring-2 focus:ring-[#006b2c]/20"
                    value={queueSort}
                    onChange={(e) => setQueueSort(e.target.value as QueueSort)}
                  >
                    <option value="time_newest">Time: newest first</option>
                    <option value="time_oldest">Time: oldest first</option>
                    <option value="name_az">Name: A → Z</option>
                    <option value="name_za">Name: Z → A</option>
                    <option value="token">Token</option>
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
                  <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">Token</th>
                  <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">
                    Patient Name
                  </th>
                  <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">
                    Time Submitted
                  </th>
                  <th className="px-6 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">
                    Intake Status
                  </th>
                  <th className="px-6 py-4 text-right text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePatients.map((p) => (
                  <tr
                    key={p.token}
                    className={`hover:bg-slate-50/80 transition-colors ${p.action === 'review' ? 'cursor-pointer' : ''} ${p.action === 'waiting' ? 'opacity-80' : ''}`}
                    onClick={() => {
                      if (p.action === 'review') goToIntake(p)
                    }}
                  >
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{p.token}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${p.initialsClass}`}
                        >
                          {p.initials}
                        </div>
                        <div>
                          <p className="font-medium text-[#171d16]">{p.name}</p>
                          <p className="text-xs text-[#3e4a3d]">{p.dobLine}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#3e4a3d]">{p.submitted}</td>
                    <td className="px-6 py-4">
                      <StatusCell patient={p} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.action === 'review' ? (
                        <button
                          className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00873a] active:scale-95"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            goToIntake(p)
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
                Showing {visiblePatients.length} of {carePrepPatients.length} intakes
                {queueFilter !== 'all' ? ' (filter applied)' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border border-[#bdcaba] px-3 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button className="rounded border border-[#bdcaba] bg-slate-100 px-3 py-1 text-xs font-bold" type="button">
                  1
                </button>
                <button
                  className="rounded border border-[#bdcaba] px-3 py-1 text-xs font-medium hover:bg-slate-50"
                  type="button"
                >
                  2
                </button>
                <button
                  className="rounded border border-[#bdcaba] px-3 py-1 text-xs font-medium hover:bg-slate-50"
                  type="button"
                >
                  3
                </button>
                <button className="rounded border border-[#bdcaba] px-3 py-1 hover:bg-slate-50" type="button">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white md:col-span-2">
              <div className="relative z-10">
                <h4 className="mb-2 text-xl font-bold">Automated Clinical Insights</h4>
                <p className="mb-6 max-w-md text-sm text-slate-300">
                  MedGenie AI has flagged 3 potential high-risk contraindications in the current queue. Please review these as a priority
                  before session commencement.
                </p>
                <button
                  className="rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-blue-50"
                  type="button"
                >
                  View Flags
                </button>
              </div>
              <div className="pointer-events-none absolute bottom-[-20px] right-[-20px] opacity-10 transition-transform duration-500 group-hover:scale-110">
                <span className="material-symbols-outlined text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  psychology
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-xl bg-[#006b2c] p-8 text-white">
              <div>
                <span className="material-symbols-outlined mb-4 text-3xl">analytics</span>
                <h4 className="mb-1 text-lg font-bold">Queue Health</h4>
                <p className="text-xs text-[#62df7d]">Throughput is currently optimal.</p>
              </div>
              <div className="mt-8">
                <div className="mb-1 flex justify-between text-xs">
                  <span>Clinical Capacity</span>
                  <span>84%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#00873a]">
                  <div className="h-full w-[84%] bg-white" />
                </div>
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
