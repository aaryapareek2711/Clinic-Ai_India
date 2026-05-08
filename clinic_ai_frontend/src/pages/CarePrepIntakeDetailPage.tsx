import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import BackButton from '../components/BackButton'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import {
  fetchIntakeSession,
  fetchPreVisitSummary,
  fetchVisitDetail,
  translateDisplayPayload,
  type VisitDetailResponse,
} from '../services/visitWorkflowApi'
import type { IntakeSessionResponse, PreVisitSummaryResponse } from '../services/visitWorkflowApi'
import { languageLabel } from './visit/intakeUtils'

import NotificationsDrawer from './NotificationsDrawer'

function shouldHideQuestionLabel(raw: string | null | undefined): boolean {
  const q = (raw || '').trim().toLowerCase()
  return !q || q.startsWith('unmapped_')
}

function resolvePreferredLanguageCode(
  intakeLanguage: string | null | undefined,
  preVisitLanguage: string | null | undefined,
): string {
  const preferred = [intakeLanguage, preVisitLanguage]
    .map((v) => (v || '').trim())
    .find((v) => v.length > 0 && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'none')
  return preferred || 'en'
}

export default function CarePrepIntakeDetailPage() {
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  /** Route param preserves legacy name `tokenKey` but carries `visit_id` */
  const { tokenKey } = useParams<{ tokenKey: string }>()
  const visitId = tokenKey?.trim() ?? ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visit, setVisit] = useState<VisitDetailResponse | null>(null)
  const [intake, setIntake] = useState<IntakeSessionResponse | null>(null)
  const [preVisit, setPreVisit] = useState<PreVisitSummaryResponse | null>(null)
  const [languageMode, setLanguageMode] = useState<'english' | 'preferred'>('english')
  const [translatedRecapRows, setTranslatedRecapRows] = useState<Array<{ question: string; answer: string }> | null>(null)
  const [translatedChiefLabel, setTranslatedChiefLabel] = useState<string | null>(null)
  const [translatingDisplay, setTranslatingDisplay] = useState(false)

  useEffect(() => {
    if (!visitId) return
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
        const v = await fetchVisitDetail(visitId)
        if (cancelled) return
        setVisit(v)
        const pid = v.patient_id
        const [intakeRes, preRes] = await Promise.all([
          fetchIntakeSession(visitId).catch(() => null),
          fetchPreVisitSummary(pid, visitId).catch(() => null),
        ])
        if (!cancelled) {
          setIntake(intakeRes)
          setPreVisit(preRes)
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
  }, [visitId])

  const patientName = useMemo(() => {
    const fn = visit?.patient?.first_name?.trim() ?? ''
    const ln = visit?.patient?.last_name?.trim() ?? ''
    const full = `${fn} ${ln}`.trim()
    return full || 'Patient'
  }, [visit])

  const ageSexLine = useMemo(() => {
    const dob = visit?.patient?.date_of_birth
    const g = visit?.patient?.gender?.replace(/_/g, ' ') ?? '—'
    let yrs = '—'
    if (dob) {
      const y = new Date(dob).getFullYear()
      if (!Number.isNaN(y) && y > 1900) yrs = `${new Date().getFullYear() - y}`
    }
    return `${yrs} Years Old • ${g}`
  }, [visit])

  const chiefLabel = (
    visit?.chief_complaint?.trim() ||
    preVisit?.sections?.chief_complaint?.reason_for_visit?.trim() ||
    intake?.illness?.trim() ||
    'INTAKE REVIEW'
  ).toUpperCase()

  const preferredLanguageCode = resolvePreferredLanguageCode(intake?.language, preVisit?.language)
  const preferredLanguage = languageLabel(preferredLanguageCode)
  const activeLanguageLabel = languageMode === 'english' ? 'English' : preferredLanguage

  const intakeDateLine = useMemo(() => {
    const iso = intake?.updated_at ?? visit?.scheduled_start ?? null
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }, [intake?.updated_at, visit])

  const recapRows = useMemo(() => {
    return (intake?.question_answers ?? []).filter((item) => {
      const answer = (item.answer || '').trim()
      return answer.length > 0 && !shouldHideQuestionLabel(item.question)
    })
  }, [intake?.question_answers])

  useEffect(() => {
    let cancelled = false
    const pref = preferredLanguageCode.trim().toLowerCase()
    const shouldTranslateToEnglish = languageMode === 'english' && !!pref && pref !== 'en'
    const shouldTranslateToPreferred = languageMode === 'preferred' && !!pref && pref !== 'en'
    if (!shouldTranslateToEnglish && !shouldTranslateToPreferred) {
      setTranslatedRecapRows(null)
      setTranslatedChiefLabel(null)
      setTranslatingDisplay(false)
      return
    }
    const payload = {
      chiefLabel,
      recapRows: recapRows.map((item) => ({
        question: String(item.question || ''),
        answer: String(item.answer || ''),
      })),
    }
    setTranslatingDisplay(true)
    void (async () => {
      try {
        const targetLanguage = shouldTranslateToEnglish ? 'English' : languageLabel(preferredLanguageCode)
        const translated = await translateDisplayPayload(payload, targetLanguage)
        if (!cancelled) {
          setTranslatedChiefLabel(String(translated.chiefLabel || ''))
          setTranslatedRecapRows(
            Array.isArray(translated.recapRows)
              ? (translated.recapRows as Array<{ question: string; answer: string }>)
              : null,
          )
        }
      } catch {
        if (!cancelled) {
          setTranslatedChiefLabel(null)
          setTranslatedRecapRows(null)
        }
      } finally {
        if (!cancelled) setTranslatingDisplay(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [languageMode, preferredLanguageCode, chiefLabel, recapRows])

  const displayChiefLabel = translatedChiefLabel || chiefLabel
  const displayRecapRows = translatedRecapRows || recapRows

  if (!visitId) {
    return (
      <div className="p-8 pt-24">
        <p className="text-sm text-slate-600">Missing visit id.</p>
        <Link className="mt-4 inline-block font-semibold text-[#006b2c]" to="/careprep">Back</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4fcf0] font-sans text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-4">
          <Link className="text-lg font-bold tracking-tight text-slate-900" to="/careprep">
            MedGenie CarePrep
          </Link>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-sm font-medium">Intake Summary</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              aria-label="Open notifications"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-50"
              onClick={() => setIsNotificationsOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{provider.displayName}</p>
              <p className="text-[10px] uppercase text-[#3e4a3d]">{provider.title}</p>
            </div>
            <img alt="Dr. Profile" className="h-9 w-9 rounded-full border border-gray-200 object-cover" src={provider.avatarUrl} />
          </div>
        </div>
      </header>

      <main className="relative flex-1 p-8 pt-24">
        <div className="mb-4 -ml-2">
          <BackButton fallback="/careprep" />
        </div>
        {loading && <p className="text-sm text-slate-600">Loading intake…</p>}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button className="ml-4 font-semibold underline" onClick={() => navigate('/careprep')} type="button">
              Back
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {translatingDisplay && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <p className="text-sm font-semibold text-[#171d16]">
                    {languageMode === 'english'
                      ? 'Translating to English…'
                      : `Translating to ${languageLabel(preferredLanguageCode)}…`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Please wait.</p>
                </div>
              </div>
            )}
            <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#d9dff5] shadow-sm">
                  <span className="material-symbols-outlined text-[34px] text-[#5b6280]">person</span>
                </div>
                <div>
                  <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-[#171d16]">{patientName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-[#404758]">
                    {ageSexLine.split(' • ').map((part, i) => (
                      <span key={part} className="flex items-center gap-x-4">
                        {i > 0 ? <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" /> : null}
                        <span>{part.trim()}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 rounded-full bg-[#ffd9de] px-2.5 py-0.5 text-xs font-bold text-[#8a143c]">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {displayChiefLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      languageMode === 'english' ? 'bg-[#006b2c] text-white' : 'text-slate-600'
                    }`}
                    onClick={() => setLanguageMode('english')}
                    type="button"
                  >
                    English
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      languageMode === 'preferred' ? 'bg-[#006b2c] text-white' : 'text-slate-600'
                    }`}
                    onClick={() => setLanguageMode('preferred')}
                    type="button"
                  >
                    Patient preferred ({preferredLanguage})
                  </button>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[13px] font-medium tracking-[0.05em] text-slate-500 uppercase">Updated</p>
                  <p className="text-[18px] leading-snug font-semibold text-[#171d16]">{intakeDateLine}</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold tracking-wider text-[#006b2c] uppercase">
                  {(intake?.status || 'unknown').replace(/_/g, ' ')}
                </span>
                <p className="text-xs text-slate-500">Display language: {activeLanguageLabel}</p>
                {translatingDisplay && preferredLanguageCode.toLowerCase() !== 'en' && (
                  <p className="text-xs text-slate-500">
                    {languageMode === 'english'
                      ? 'Translating display content to English…'
                      : `Translating display content to ${languageLabel(preferredLanguageCode)}…`}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-[18px] leading-snug font-semibold text-[#171d16]">
                      <span className="material-symbols-outlined text-[#006b2c]">chat_bubble</span>
                      Intake Q&amp;A Recap
                    </h3>
                  </div>
                  <div className="space-y-8 p-6 select-none">
                    {displayRecapRows.length === 0 && (
                      <p className="text-sm text-[#575e70]">No intake answers stored for this visit yet.</p>
                    )}
                    {displayRecapRows.map((item, idx) => (
                      <div key={`${visitId}-qa-${idx}`} className="group">
                        <p className="mb-2 text-base font-bold text-slate-900">{item.question || 'Question'}</p>
                        <div className="ml-4 border-l-2 border-slate-100 pl-4 transition-colors group-hover:border-[#006b2c]">
                          <p className="font-body text-base leading-relaxed text-[#3e4a3d] italic">{item.answer || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 mt-12 flex flex-col items-stretch justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4 text-slate-500">
                <span className="material-symbols-outlined">history</span>
                <span className="text-sm font-medium">Visit {visitId.slice(-8)} · open clinical workspace</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  className="flex items-center gap-2 rounded-lg bg-[#006b2c] px-8 py-3 font-bold text-white transition-all hover:bg-[#00873a] active:scale-95"
                  onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(visitId)}&tab=pre-visit`)}
                  type="button"
                >
                  <span className="material-symbols-outlined">edit_note</span>
                  Open visit workspace
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
