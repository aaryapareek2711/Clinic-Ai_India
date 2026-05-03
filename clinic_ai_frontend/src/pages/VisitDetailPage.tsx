import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import {
  fetchIntakeSession,
  fetchLatestClinicalNote,
  fetchPreVisitSummary,
  fetchVisitDetail,
  type ClinicalNoteLatest,
  type IntakeSessionResponse,
  type PreVisitSummaryResponse,
  type VisitDetailResponse,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'
import { languageLabel } from './visit/intakeUtils'
import VisitIntakeCanvas, { PATIENT_AVATAR_VISIT } from './visit/VisitIntakeCanvas'

export type VisitWorkflowTab = 'pre-visit' | 'vitals' | 'transcription' | 'clinical-note' | 'post-visit'

const TAB_ORDER: VisitWorkflowTab[] = ['pre-visit', 'vitals', 'transcription', 'clinical-note', 'post-visit']

/** Older URLs map into the 5-step workflow */
const LEGACY_TAB_MAP: Record<string, VisitWorkflowTab> = {
  intake: 'pre-visit',
  'opd-note': 'clinical-note',
  whatsapp: 'post-visit',
}

const DR_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCuSkfvIW3phx7yHbt104mLhs656BoGQpYY09pPg3wUO_G9c3DWXj7ry68ypMznP1rTdyAPSXjX6Xk7cDbvJ1wgmWIlq_McPQW-9KpGS9qeEbJVVjt4YVfbIWGE8WyTOLE1nlg7wDw7fKdH7x-kMASiUT_StwHliRrFojXgKNfKBB79rNiWPg8DfC3FAxKDCDvu0pyNjmXjRMaDTqqlXXqHwQuQtOnhf_uKw2ti2h8FznKYlsSlVV4VYJ3tst3kLqJ3Qx1OO_BNWviI'

function ageFromDob(dob: string | undefined): string {
  if (!dob) return '—'
  const y = new Date(dob).getFullYear()
  if (Number.isNaN(y) || y < 1900) return '—'
  return `${new Date().getFullYear() - y}`
}

function normalizeWorkflowTab(raw: string): VisitWorkflowTab {
  const mapped = LEGACY_TAB_MAP[raw]
  if (mapped) return mapped
  if (TAB_ORDER.includes(raw as VisitWorkflowTab)) return raw as VisitWorkflowTab
  return 'pre-visit'
}

/** Pre-visit step is aimed at visits that have a scheduled slot (board-style workflow). */
function showScheduledPreVisitBadge(v: VisitDetailResponse | null): boolean {
  if (!v?.scheduled_start) return false
  const s = (v.status || '').toLowerCase()
  return ['scheduled', 'open', 'queued', 'in_queue', 'in_progress'].includes(s)
}

export default function VisitDetailPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const visitId = searchParams.get('visitId')?.trim() ?? ''
  const rawTab = searchParams.get('tab')?.trim() ?? 'pre-visit'
  const tab: VisitWorkflowTab = normalizeWorkflowTab(rawTab)

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondaryWarning, setSecondaryWarning] = useState<string | null>(null)
  const [visit, setVisit] = useState<VisitDetailResponse | null>(null)
  const [intake, setIntake] = useState<IntakeSessionResponse | null>(null)
  const [preVisit, setPreVisit] = useState<PreVisitSummaryResponse | null>(null)
  const [clinicalNote, setClinicalNote] = useState<ClinicalNoteLatest | null>(null)

  const syncTabToUrl = useCallback(
    (next: VisitWorkflowTab) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('tab', next)
      if (visitId) nextParams.set('visitId', visitId)
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, visitId, setSearchParams],
  )

  useEffect(() => {
    if (rawTab !== tab) syncTabToUrl(tab)
  }, [rawTab, tab, syncTabToUrl])

  const loadWorkspace = useCallback(async () => {
    if (!visitId) {
      setVisit(null)
      setIntake(null)
      setPreVisit(null)
      setClinicalNote(null)
      setSecondaryWarning(null)
      return
    }
    setLoading(true)
    setError(null)
    setSecondaryWarning(null)
    try {
      const v = await fetchVisitDetail(visitId)
      setVisit(v)
      const pid = v.patient_id

      const [intakeRes, preRes, noteRes] = await Promise.all([
        fetchIntakeSession(visitId).catch(() => null),
        fetchPreVisitSummary(pid, visitId).catch((e) => {
          setSecondaryWarning(getApiErrorMessage(e))
          return null
        }),
        fetchLatestClinicalNote(pid, visitId),
      ])
      setIntake(intakeRes)
      setPreVisit(preRes)
      setClinicalNote(noteRes)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setVisit(null)
      setIntake(null)
      setPreVisit(null)
      setClinicalNote(null)
      setSecondaryWarning(null)
    } finally {
      setLoading(false)
    }
  }, [visitId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  const patientName = useMemo(() => {
    const fn = visit?.patient?.first_name?.trim() ?? ''
    const ln = visit?.patient?.last_name?.trim() ?? ''
    const full = `${fn} ${ln}`.trim()
    return full || 'Patient'
  }, [visit])

  const genderLabel = visit?.patient?.gender ? visit.patient.gender.replace(/_/g, ' ') : '—'
  const chief =
    visit?.chief_complaint?.trim() ||
    preVisit?.sections?.chief_complaint?.reason_for_visit?.trim() ||
    intake?.illness?.trim() ||
    'Consultation'

  const breadcrumbTitle = chief.length > 42 ? `${chief.slice(0, 40)}…` : chief
  const langBadge = languageLabel(preVisit?.language ?? 'en')
  const queueBadge = visitId ? `#${visitId.slice(-3).toUpperCase()}` : '#—'
  const scheduledBadge = showScheduledPreVisitBadge(visit)

  const notePayload = clinicalNote?.payload

  const tabs: { id: VisitWorkflowTab; label: string; icon: string }[] = [
    { id: 'pre-visit', label: 'Pre-visit', icon: 'event_note' },
    { id: 'vitals', label: 'Vitals', icon: 'monitor_heart' },
    { id: 'transcription', label: 'Transcription', icon: 'mic' },
    { id: 'clinical-note', label: 'Clinical Note', icon: 'clinical_notes' },
    { id: 'post-visit', label: 'Post Visit', icon: 'summarize' },
  ]

  return (
    <div className="min-h-screen bg-[#f4fcf0] font-sans text-[#171d16] antialiased">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-[240px] flex-col border-r border-gray-800 bg-[#111827] py-6">
        <div className="mb-8 px-6">
          <h1 className="font-bold text-xl tracking-tight text-white">MedGenie</h1>
          <p className="font-medium text-xs text-[#16a34a]">Provider</p>
        </div>
        <nav className="flex flex-1 flex-col space-y-1 px-2">
          <button
            className="flex items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            onClick={() => navigate('/dashboard')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">dashboard</span>
            Dashboard
          </button>
          <button
            className="flex items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            onClick={() => navigate('/calendar')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            Calendar
          </button>
          <button className="sidebar-active mx-2 flex items-center rounded-lg px-4 py-2 font-inter text-sm antialiased" type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            Visits
          </button>
          <button
            className="flex items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            onClick={() => navigate('/templates')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">description</span>
            Templates
          </button>
          <button
            className="flex items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            onClick={() => navigate('/settings')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">settings</span>
            Settings
          </button>
          <button
            className="flex items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            type="button"
          >
            <span className="material-symbols-outlined mr-3">credit_card</span>
            Subscription
          </button>
          <button
            className="flex items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            type="button"
          >
            <span className="material-symbols-outlined mr-3">bar_chart</span>
            Analytics
          </button>
        </nav>
        <div className="mt-auto px-2">
          <button
            className="flex w-full items-center rounded-lg px-4 py-2 font-inter text-sm text-gray-400 antialiased transition-colors duration-200 hover:bg-gray-800 hover:text-white"
            onClick={() => navigate('/login')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
        <div className="flex items-center space-x-6">
          <button className="text-gray-500 transition-opacity hover:opacity-80" type="button">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button
            className="relative text-gray-500 transition-opacity hover:opacity-80"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[#ba1a1a]" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#171d16]">Dr. Rajesh Kumar</p>
              <p className="text-xs text-[#575e70]">Senior Pulmonologist</p>
            </div>
            <img alt="" className="h-10 w-10 rounded-full border border-[#bdcaba] object-cover" src={DR_AVATAR} />
          </div>
        </div>
      </header>

      <main className="ml-[240px] min-h-screen pt-16">
        {!visitId && (
          <div className="p-8">
            <p className="rounded-xl border border-[#bdcaba] bg-white p-6 text-sm text-[#3e4a3d]">
              Select a visit from the list. Add <code className="font-mono text-xs">visitId</code> to the URL.
            </p>
            <button
              className="mt-4 rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => navigate('/visits')}
              type="button"
            >
              Back to visits
            </button>
          </div>
        )}

        {visitId && error && (
          <div className="mx-8 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {visitId && !error && secondaryWarning && (
          <div className="mx-8 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Pre-visit summary could not be loaded: {secondaryWarning}
          </div>
        )}

        {visitId && !error && (
          <>
            <div className="p-8 pb-0">
              <nav className="mb-4 flex items-center space-x-2 text-sm text-[#575e70]">
                <button className="hover:text-[#006b2c]" onClick={() => navigate('/dashboard')} type="button">
                  Dashboard
                </button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <button className="hover:text-[#006b2c]" onClick={() => navigate('/visits')} type="button">
                  Visits
                </button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="font-semibold text-[#171d16]">{breadcrumbTitle}</span>
              </nav>

              <div className="flex flex-col gap-6 rounded-xl bg-[#111827] p-8 text-white md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    <img alt="" className="h-20 w-20 rounded-xl border-2 border-[#006b2c] object-cover" src={PATIENT_AVATAR_VISIT} />
                    <span className="absolute -bottom-2 -right-2 rounded border-2 border-[#111827] bg-amber-500 px-2 py-1 text-xs font-bold text-[#171d16]">
                      {queueBadge}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-3">
                      <h2 className="font-bold text-2xl text-white">{patientName}</h2>
                      <span className="rounded-full bg-[#dde5d9]/20 px-3 py-0.5 text-xs font-medium">
                        🌐 {langBadge}
                      </span>
                    </div>
                    <p className="font-normal text-gray-400">
                      {ageFromDob(visit?.patient?.date_of_birth)} Years • {genderLabel} • {chief}
                    </p>
                    <div className="mt-2 flex gap-4">
                      <div className="flex items-center text-xs text-gray-400">
                        <span className="material-symbols-outlined mr-1 text-sm">bloodtype</span>—
                      </div>
                      <div className="flex items-center text-xs text-gray-400">
                        <span className="material-symbols-outlined mr-1 text-sm">height</span>—
                      </div>
                      <div className="flex items-center text-xs text-gray-400">
                        <span className="material-symbols-outlined mr-1 text-sm">weight</span>—
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="flex items-center rounded-lg bg-[#a72d51] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#8a143c]"
                    onClick={() => syncTabToUrl('clinical-note')}
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2">description</span>
                    Generate OPD Note
                  </button>
                  <button
                    className="flex items-center rounded-lg bg-[#16a34a] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#006b2c]"
                    onClick={() => syncTabToUrl('post-visit')}
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2">send</span>
                    Send WhatsApp
                  </button>
                  <button
                    className="flex items-center rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-white/20"
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2">add_circle</span>
                    Add Lab Result
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto border-b border-[#bdcaba] px-8">
              <div className="flex min-w-min gap-8 pb-0">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    className={`flex shrink-0 items-center border-b-2 pb-4 text-sm font-semibold transition-colors ${
                      tab === t.id
                        ? 'border-[#006b2c] text-[#006b2c]'
                        : 'border-transparent text-[#575e70] hover:text-[#171d16]'
                    }`}
                    onClick={() => syncTabToUrl(t.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2 text-xl">{t.icon}</span>
                    {t.label}
                    {t.id === 'pre-visit' && scheduledBadge && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Scheduled
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8">
              {loading && <p className="text-sm text-[#575e70]">Loading visit…</p>}

              {!loading && tab === 'pre-visit' && (
                <VisitIntakeCanvas
                  clinicalNote={clinicalNote}
                  intake={intake}
                  onPreVisitUpdated={setPreVisit}
                  patientName={patientName}
                  preVisit={preVisit}
                  visit={visit}
                  visitId={visitId}
                />
              )}

              {!loading && tab === 'vitals' && (
                <div className="rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  Vitals: generate form and submit via <code className="font-mono text-xs">/api/vitals</code> (next wiring).
                </div>
              )}

              {!loading && tab === 'transcription' && (
                <div className="rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  Transcription: upload audio and poll status via <code className="font-mono text-xs">/api/notes/transcribe</code> (next wiring).
                </div>
              )}

              {!loading && tab === 'clinical-note' && (
                <div className="mx-auto max-w-4xl space-y-6 rounded-xl border border-[#bdcaba] bg-white p-8">
                  <h3 className="text-[18px] font-semibold">Clinical Note</h3>
                  {!clinicalNote && (
                    <p className="text-sm text-[#3e4a3d]">
                      No saved clinical note for this visit yet. Generate one from the backend after transcription completes.
                    </p>
                  )}
                  {clinicalNote && (
                    <>
                      <section>
                        <h4 className="mb-2 font-semibold text-[#171d16]">Assessment</h4>
                        <p className="text-sm leading-relaxed text-[#3e4a3d]">{notePayload?.assessment ?? '—'}</p>
                      </section>
                      <section>
                        <h4 className="mb-2 font-semibold text-[#171d16]">Plan</h4>
                        <p className="text-sm leading-relaxed text-[#3e4a3d]">{notePayload?.plan ?? '—'}</p>
                      </section>
                      {notePayload?.rx && notePayload.rx.length > 0 && (
                        <section>
                          <h4 className="mb-2 font-semibold text-[#171d16]">Prescription</h4>
                          <ul className="list-inside list-disc text-sm text-[#3e4a3d]">
                            {notePayload.rx.map((r) => (
                              <li key={`${r.medicine_name}-${r.dose}`}>
                                {[r.medicine_name, r.dose, r.frequency, r.duration].filter(Boolean).join(' · ')}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </>
                  )}
                </div>
              )}

              {!loading && tab === 'post-visit' && (
                <div className="rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  Post-visit summary and WhatsApp send use <code className="font-mono text-xs">/api/notes/post-visit-summary</code> (next wiring).
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <button
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#006b2c] text-white shadow-lg transition-transform hover:scale-110"
        type="button"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      <style>{`
        .sidebar-active {
          background-color: #2563eb;
          color: white !important;
          border-left: 4px solid white;
        }
      `}</style>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
