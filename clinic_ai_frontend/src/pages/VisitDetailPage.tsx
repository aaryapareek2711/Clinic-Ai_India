import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import {
  fetchIntakeSession,
  fetchLatestClinicalNote,
  fetchPreVisitSummary,
  fetchTranscriptionStatus,
  fetchVisitDetail,
  generatePostVisitSummary,
  generateVitalsForm,
  sendPostVisitSummaryWhatsApp,
  type PostVisitPatientLanguage,
  submitVitals,
  uploadTranscriptionAudio,
  type ClinicalNoteLatest,
  type IntakeSessionResponse,
  type PostVisitSummaryResponse,
  type PreVisitSummaryResponse,
  type TranscriptionStatusResponse,
  type VisitDetailResponse,
  type VitalsFormResponse,
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

function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, '').trim()
}

function formatIndiaWhatsAppDisplay(digits: string): string {
  const d = digitsOnlyPhone(digits)
  if (d.length >= 10) {
    const last10 = d.slice(-10)
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`
  }
  return digits.trim() || '—'
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
  const [vitalsForm, setVitalsForm] = useState<VitalsFormResponse | null>(null)
  const [vitalsStaffName, setVitalsStaffName] = useState('Nurse')
  const [vitalsValues, setVitalsValues] = useState<Record<string, string>>({})
  const [vitalsMessage, setVitalsMessage] = useState<string | null>(null)
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatusResponse | null>(null)
  const [transcriptionMessage, setTranscriptionMessage] = useState<string | null>(null)
  const [postVisitSummary, setPostVisitSummary] = useState<PostVisitSummaryResponse | null>(null)
  const [postVisitMessage, setPostVisitMessage] = useState<string | null>(null)
  const [recapContactMode, setRecapContactMode] = useState<'patient' | 'different' | 'family'>('patient')
  const [recapPhoneDraft, setRecapPhoneDraft] = useState('')
  const [recapPatientLang, setRecapPatientLang] = useState<PostVisitPatientLanguage>('en')
  const [recapAction, setRecapAction] = useState<'generate' | 'send' | null>(null)
  const [postVisitSendInfo, setPostVisitSendInfo] = useState<{
    phoneDisplay: string
    languageDisplay: string
  } | null>(null)

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
      setVitalsForm(null)
      setVitalsValues({})
      setVitalsMessage(null)
      setTranscriptionStatus(null)
      setTranscriptionMessage(null)
      setPostVisitSummary(null)
      setPostVisitMessage(null)
      setPostVisitSendInfo(null)
      setRecapContactMode('patient')
      setRecapPatientLang('en')
      setRecapPhoneDraft(digitsOnlyPhone(v.patient?.phone_number ?? ''))
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
  const patientId = visit?.patient_id ?? ''

  const tabs: { id: VisitWorkflowTab; label: string; icon: string }[] = [
    { id: 'pre-visit', label: 'Pre-visit', icon: 'event_note' },
    { id: 'vitals', label: 'Vitals', icon: 'monitor_heart' },
    { id: 'transcription', label: 'Transcription', icon: 'mic' },
    { id: 'clinical-note', label: 'Clinical Note', icon: 'clinical_notes' },
    { id: 'post-visit', label: 'Recap', icon: 'summarize' },
  ]

  return (
    <div className="min-h-screen font-sans text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
        <div className="flex items-center space-x-6">
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

      <main className="min-h-screen pt-16">
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
                    Recap
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
                <div className="space-y-4 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => {
                        if (!patientId || !visitId) return
                        void (async () => {
                          try {
                            const form = await generateVitalsForm(patientId, visitId)
                            setVitalsForm(form)
                            const nextValues: Record<string, string> = {}
                            form.fields.forEach((f) => {
                              nextValues[f.key] = ''
                            })
                            setVitalsValues(nextValues)
                            setVitalsMessage(form.reason)
                          } catch (e) {
                            setVitalsMessage(getApiErrorMessage(e))
                          }
                        })()
                      }}
                      type="button"
                    >
                      Generate Vitals Form
                    </button>
                    <span className="text-xs text-[#575e70]">Uses `/api/vitals/generate-form`</span>
                  </div>
                  {vitalsMessage && <p className="text-xs text-[#575e70]">{vitalsMessage}</p>}
                  {vitalsForm && (
                    <>
                      <label className="block text-xs font-semibold text-[#171d16]">
                        Staff Name
                        <input
                          className="mt-1 w-full rounded-md border border-[#bdcaba] px-3 py-2 text-sm"
                          onChange={(e) => setVitalsStaffName(e.target.value)}
                          value={vitalsStaffName}
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {vitalsForm.fields.map((field) => (
                          <label className="block text-xs font-semibold text-[#171d16]" key={field.key}>
                            {field.label} ({field.key})
                            <input
                              className="mt-1 w-full rounded-md border border-[#bdcaba] px-3 py-2 text-sm"
                              onChange={(e) =>
                                setVitalsValues((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              placeholder={field.unit ? `Unit: ${field.unit}` : 'Enter value'}
                              value={vitalsValues[field.key] ?? ''}
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                        onClick={() => {
                          if (!patientId || !visitId || !vitalsForm) return
                          void (async () => {
                            try {
                              const values = vitalsForm.fields.map((f) => ({
                                key: f.key,
                                value: vitalsValues[f.key] ?? '',
                              }))
                              const res = await submitVitals(
                                patientId,
                                visitId,
                                vitalsForm.form_id || null,
                                vitalsStaffName.trim() || 'Nurse',
                                values,
                              )
                              setVitalsMessage(`Vitals submitted (${res.vitals_id.slice(-8)})`)
                            } catch (e) {
                              setVitalsMessage(getApiErrorMessage(e))
                            }
                          })()
                        }}
                        type="button"
                      >
                        Submit Vitals
                      </button>
                    </>
                  )}
                </div>
              )}

              {!loading && tab === 'transcription' && (
                <div className="space-y-4 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#bdcaba] px-4 py-2 font-semibold text-[#171d16]">
                    Upload Audio
                    <input
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file || !patientId || !visitId) return
                        void (async () => {
                          try {
                            const accepted = await uploadTranscriptionAudio(patientId, visitId, file)
                            setTranscriptionMessage(accepted.message || `Queued: ${accepted.job_id}`)
                          } catch (err) {
                            setTranscriptionMessage(getApiErrorMessage(err))
                          }
                        })()
                      }}
                      type="file"
                    />
                  </label>
                  <button
                    className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => {
                      if (!patientId || !visitId) return
                      void (async () => {
                        try {
                          const status = await fetchTranscriptionStatus(patientId, visitId)
                          setTranscriptionStatus(status)
                          setTranscriptionMessage(status.message || status.status)
                        } catch (e) {
                          setTranscriptionMessage(getApiErrorMessage(e))
                        }
                      })()
                    }}
                    type="button"
                  >
                    Check Transcription Status
                  </button>
                  {transcriptionMessage && <p className="text-xs text-[#575e70]">{transcriptionMessage}</p>}
                  {transcriptionStatus && (
                    <div className="rounded-lg border border-[#bdcaba] bg-slate-50 p-3 text-xs">
                      <p>Status: {transcriptionStatus.status}</p>
                      {transcriptionStatus.error && <p>Error: {transcriptionStatus.error}</p>}
                    </div>
                  )}
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
                <div className="mx-auto max-w-3xl space-y-6 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-[#171d16]">Send post-visit recap</h3>
                    <p className="mt-1 text-xs text-[#575e70]">
                      Patient profile language does not change. Choose the language and number for this WhatsApp send.
                    </p>
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      WhatsApp recipient
                    </legend>
                    {(
                      [
                        ['patient', "Patient's WhatsApp"] as const,
                        ['different', 'Different number'] as const,
                        ['family', 'Family member'] as const,
                      ]
                    ).map(([value, label]) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2">
                        <input
                          checked={recapContactMode === value}
                          className="text-[#006b2c]"
                          name="recap-contact"
                          onChange={() => setRecapContactMode(value)}
                          type="radio"
                          value={value}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                    {recapContactMode !== 'patient' && (
                      <input
                        className="mt-2 w-full max-w-md rounded-lg border border-[#bdcaba] px-3 py-2 text-[#171d16]"
                        inputMode="numeric"
                        onChange={(e) => setRecapPhoneDraft(e.target.value)}
                        placeholder="e.g. 919876543210"
                        type="text"
                        value={recapPhoneDraft}
                      />
                    )}
                  </fieldset>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      Message language (patient)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['hi', 'Hindi'] as const,
                          ['en', 'English'] as const,
                          ['hi-eng', 'Both'] as const,
                        ]
                      ).map(([code, label]) => (
                        <button
                          key={code}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            recapPatientLang === code
                              ? 'bg-[#006b2c] text-white'
                              : 'border border-[#bdcaba] bg-white text-[#171d16] hover:bg-[#eff6ea]'
                          }`}
                          onClick={() => setRecapPatientLang(code)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {postVisitSummary?.whatsapp_payload?.trim() && (
                    <div className="rounded-xl border border-[#62df7d]/40 bg-[#e8f8eb] p-4">
                      <p className="mb-2 text-xs font-semibold text-[#006b2c]">Preview</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#171d16]">
                        {postVisitSummary.whatsapp_payload.trim()}
                      </pre>
                      <p className="mt-2 text-xs text-[#575e70]">Approved WhatsApp template · post-visit recap</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e9f0e5] pt-6">
                    <button
                      className="rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-gray-50 disabled:opacity-50"
                      disabled={!patientId || !visitId || recapAction !== null}
                      onClick={() => {
                        if (!patientId || !visitId) return
                        void (async () => {
                          setRecapAction('generate')
                          setPostVisitMessage(null)
                          setPostVisitSendInfo(null)
                          try {
                            const res = await generatePostVisitSummary(patientId, visitId, {
                              preferred_language: recapPatientLang,
                            })
                            setPostVisitSummary(res)
                            setPostVisitMessage('Post-visit summary generated. Review the preview, then send.')
                          } catch (e) {
                            setPostVisitMessage(getApiErrorMessage(e))
                          } finally {
                            setRecapAction(null)
                          }
                        })()
                      }}
                      type="button"
                    >
                      {recapAction === 'generate' ? 'Generating…' : 'Generate / refresh summary'}
                    </button>
                    <button
                      className="rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006b2c] disabled:opacity-50"
                      disabled={!patientId || !visitId || recapAction !== null}
                      onClick={() => {
                        if (!patientId || !visitId) return
                        const overrideDigits =
                          recapContactMode === 'patient' ? '' : digitsOnlyPhone(recapPhoneDraft)
                        if (recapContactMode !== 'patient' && !overrideDigits) {
                          setPostVisitMessage('Enter a WhatsApp number for this recipient.')
                          return
                        }
                        void (async () => {
                          setRecapAction('send')
                          setPostVisitMessage(null)
                          try {
                            const res = await sendPostVisitSummaryWhatsApp(patientId, visitId, {
                              phone_number: recapContactMode === 'patient' ? undefined : overrideDigits,
                              preferred_language: recapPatientLang,
                            })
                            setPostVisitMessage(res.message)
                            const phoneDisplay =
                              recapContactMode === 'patient'
                                ? formatIndiaWhatsAppDisplay(visit?.patient?.phone_number ?? '')
                                : formatIndiaWhatsAppDisplay(overrideDigits)
                            setPostVisitSendInfo({
                              phoneDisplay,
                              languageDisplay: languageLabel(recapPatientLang),
                            })
                          } catch (e) {
                            setPostVisitSendInfo(null)
                            setPostVisitMessage(getApiErrorMessage(e))
                          } finally {
                            setRecapAction(null)
                          }
                        })()
                      }}
                      type="button"
                    >
                      {recapAction === 'send' ? 'Sending…' : 'Send now'}
                    </button>
                  </div>

                  {postVisitMessage && (
                    <p className="text-xs text-[#575e70]" role="status">
                      {postVisitMessage}
                    </p>
                  )}

                  {postVisitSendInfo && (
                    <div className="rounded-xl border border-[#62df7d]/50 bg-[#f0fdf4] p-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#16a34a] text-white">
                        <span className="material-symbols-outlined text-2xl">check</span>
                      </div>
                      <p className="text-lg font-semibold text-[#171d16]">Message sent</p>
                      <p className="mt-1 text-sm text-[#3e4a3d]">
                        {postVisitSendInfo.phoneDisplay} · {postVisitSendInfo.languageDisplay}
                      </p>
                      <p className="mt-2 text-xs text-[#575e70]">Post-visit recap template</p>
                    </div>
                  )}

                  {postVisitSummary?.payload && !postVisitSummary.whatsapp_payload?.trim() && (
                    <div className="space-y-2 rounded-lg border border-[#bdcaba] bg-slate-50 p-4 text-xs">
                      <p>
                        <strong>Visit reason:</strong> {postVisitSummary.payload.visit_reason || '—'}
                      </p>
                      <p>
                        <strong>Findings:</strong> {postVisitSummary.payload.what_doctor_found || '—'}
                      </p>
                      <p>
                        <strong>Follow-up:</strong> {postVisitSummary.payload.follow_up || '—'}
                      </p>
                    </div>
                  )}
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

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
