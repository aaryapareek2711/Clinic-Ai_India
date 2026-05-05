import { useMemo, useState } from 'react'

import { getApiErrorMessage } from '../../lib/apiClient'
import {
  generatePreVisitSummary,
  type ClinicalNoteLatest,
  type IntakeSessionResponse,
  type PreVisitSummaryResponse,
  type VisitDetailResponse,
} from '../../services/visitWorkflowApi'
import { computeIntakeProgress, splitToChips } from './intakeUtils'

function isNotProvidedText(raw: string | undefined | null): boolean {
  const t = (raw ?? '').trim()
  return !t || /^not provided$/i.test(t)
}

function displayLine(raw: string | undefined | null): string {
  return isNotProvidedText(raw) ? '—' : String(raw).trim()
}

function symptomList(items: string[] | undefined): string[] {
  if (!Array.isArray(items) || items.length === 0) return []
  return items.map((s) => String(s).trim()).filter((s) => s.length > 0 && !/^not provided$/i.test(s))
}

/** Default / female-presenting portrait (legacy export name kept for callers). */
export const PATIENT_AVATAR_VISIT =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC5wjB4bCGivsoHc4557SxbmXVX7SnvEIxBtJj66qnr4iAipzt3Hqxo2G3iA5wYpVYzwDQCUdlmvtnwmc4NaB9IsBitNnupQWvB9gxZD4HCNWCbzA1xzu1vHEyy8CZiSq2nz8AqCYJMUB7huDMJlYW1Vpql888iiGsjatY5T2WHXF48hFcoFtjo_AB_MLqZOtz42QVgZwR97S8NTxyUJNMCcatjmxUyeMQSc0NlF4TXegfK0_JFFUOGO7hVgQ3be8oQWyNmXVG60ogG'

export const PATIENT_AVATAR_VISIT_MALE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCuSkfvIW3phx7yHbt104mLhs656BoGQpYY09pPg3wUO_G9c3DWXj7ry68ypMznP1rTdyAPSXjX6Xk7cDbvJ1wgmWIlq_McPQW-9KpGS9qeEbJVVjt4YVfbIWGE8WyTOLE1nlg7wDw7fKdH7x-kMASiUT_StwHliRrFojXgKNfKBB79rNiWPg8DfC3FAxKDCDvu0pyNjmXjRMaDTqqlXXqHwQuQtOnhf_uKw2ti2h8FznKYlsSlVV4VYJ3tst3kLqJ3Qx1OO_BNWviI'

function normGender(g: string | undefined): string {
  return (g ?? '').toLowerCase().replace(/_/g, ' ').trim()
}

/** Pick a stock portrait from recorded gender (API may send `male`, `MALE`, `male_patient`, etc.). */
export function patientPortraitSrc(gender: string | undefined): string {
  const g = normGender(gender)
  if (!g) return PATIENT_AVATAR_VISIT
  if (g === 'm' || g === 'male' || g.startsWith('male ')) return PATIENT_AVATAR_VISIT_MALE
  if (g === 'f' || g === 'female' || g.startsWith('female ')) return PATIENT_AVATAR_VISIT
  return PATIENT_AVATAR_VISIT
}

type Props = {
  visitId: string
  patientName: string
  visit: VisitDetailResponse | null
  intake: IntakeSessionResponse | null
  preVisit: PreVisitSummaryResponse | null
  clinicalNote: ClinicalNoteLatest | null
  onPreVisitUpdated: (doc: PreVisitSummaryResponse | null) => void
}

export default function VisitIntakeCanvas({
  visitId,
  patientName,
  visit,
  intake,
  preVisit,
  clinicalNote,
  onPreVisitUpdated,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patientId = visit?.patient_id ?? ''
  const { pct } = useMemo(() => computeIntakeProgress(intake), [intake])

  const sections = preVisit?.sections
  const allergyChips = useMemo(
    () => splitToChips(sections?.past_medical_history_allergies?.allergies ?? ''),
    [sections?.past_medical_history_allergies?.allergies],
  )
  const medicationChips = useMemo(
    () => splitToChips(sections?.current_medication?.medications_or_home_remedies ?? ''),
    [sections?.current_medication?.medications_or_home_remedies],
  )
  const associatedSymptoms = useMemo(() => symptomList(sections?.hpi?.associated_symptoms), [sections?.hpi?.associated_symptoms])
  const redFlagItems = useMemo(() => {
    const raw = sections?.red_flag_indicators ?? []
    if (!Array.isArray(raw)) return []
    return raw.map((s) => String(s).trim()).filter(Boolean)
  }, [sections?.red_flag_indicators])

  async function handleGenerate() {
    if (!patientId || !visitId) return
    setGenerating(true)
    setError(null)
    try {
      const doc = await generatePreVisitSummary(patientId, visitId)
      onPreVisitUpdated(doc)
    } catch (e) {
      setError(getApiErrorMessage(e))
      onPreVisitUpdated(null)
    } finally {
      setGenerating(false)
    }
  }

  const showSummary = Boolean(preVisit?.sections)

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <div className="rounded-xl border border-[#bdcaba] bg-white p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[18px] font-semibold text-[#171d16]">Initial Intake Progress</h3>
            <span className="text-sm font-semibold text-[#006b2c]">{pct}% Completed</span>
          </div>
          <div className="mb-6 h-2.5 w-full rounded-full bg-[#e9f0e5]">
            <div className="h-2.5 rounded-full bg-[#006b2c] transition-all" style={{ width: `${pct}%` }} />
          </div>

          {!showSummary && (
            <p className="text-sm leading-relaxed text-[#575e70]">
              After intake responses are saved, generate the summary to populate the five pre-visit sections: chief complaint,
              HPI, current medications and remedies, past history and allergies, and red-flag indicators.
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          {!showSummary && (
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-[#bdcaba] bg-[#eff6ea] px-4 py-3 text-sm">
              <span className="material-symbols-outlined text-[#006b2c] text-base">info</span>
              <span className="flex-1 text-[#171d16]">Generate a pre-visit summary after intake answers exist.</span>
              <button
                className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00873a] disabled:opacity-60"
                disabled={generating || !patientId}
                onClick={() => void handleGenerate()}
                type="button"
              >
                {generating ? 'Generating…' : 'Generate summary'}
              </button>
            </div>
          )}
          {showSummary && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-gray-50 disabled:opacity-60"
                disabled={generating || !patientId}
                onClick={() => void handleGenerate()}
                type="button"
              >
                {generating ? 'Refreshing…' : 'Refresh summary'}
              </button>
              {preVisit?.language && (
                <span className="text-xs text-[#575e70]">
                  Summary language: <span className="font-medium text-[#171d16]">{preVisit.language}</span>
                  {preVisit.status ? (
                    <>
                      {' '}
                      · Intake status: <span className="font-medium text-[#171d16]">{preVisit.status}</span>
                    </>
                  ) : null}
                </span>
              )}
            </div>
          )}
        </div>

        {showSummary && sections && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-[18px] font-semibold text-[#171d16]">Pre-visit summary</h3>
              <p className="max-w-xl text-xs text-[#575e70]">
                Doctor-facing structured summary aligned with the visit pre-visit record (five sections).
              </p>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl border border-[#bdcaba] bg-white p-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#575e70]">1 · Chief complaint</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-[#575e70]">Reason for visit</dt>
                    <dd className="mt-1 leading-relaxed text-[#171d16]">{displayLine(sections.chief_complaint?.reason_for_visit)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#575e70]">Symptom duration or onset</dt>
                    <dd className="mt-1 leading-relaxed text-[#171d16]">
                      {displayLine(sections.chief_complaint?.symptom_duration_or_onset)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-[#bdcaba] bg-white p-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#575e70]">2 · History of present illness (HPI)</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-[#575e70]">Associated symptoms</dt>
                    <dd className="mt-1 text-[#171d16]">
                      {associatedSymptoms.length > 0 ? (
                        <ul className="list-inside list-disc space-y-1">
                          {associatedSymptoms.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[#3e4a3d]">—</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#575e70]">Symptom severity or progression</dt>
                    <dd className="mt-1 leading-relaxed text-[#171d16]">
                      {displayLine(sections.hpi?.symptom_severity_or_progression)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#575e70]">Impact on daily life</dt>
                    <dd className="mt-1 leading-relaxed text-[#171d16]">{displayLine(sections.hpi?.impact_on_daily_life)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-[#bdcaba] bg-white p-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#575e70]">3 · Current medication and home remedies</p>
                {medicationChips.length > 0 ? (
                  <ul className="space-y-2 text-sm text-[#005320]">
                    {medicationChips.map((m) => (
                      <li key={m} className="flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#006b2c]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-[#171d16]">
                    {displayLine(sections.current_medication?.medications_or_home_remedies)}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-[#bdcaba] bg-white p-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#575e70]">4 · Past medical history and allergies</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-[#575e70]">Past medical history</dt>
                    <dd className="mt-1 leading-relaxed text-[#171d16]">
                      {displayLine(sections.past_medical_history_allergies?.past_medical_history)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#ba1a1a]">Allergies</dt>
                    <dd className="mt-1 text-[#171d16]">
                      {allergyChips.length > 0 ? (
                        <ul className="space-y-2 text-[#93000a]">
                          {allergyChips.map((a) => (
                            <li key={a} className="flex items-center">
                              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        displayLine(sections.past_medical_history_allergies?.allergies)
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-[#ba1a1a]/15 bg-[#fff8f7] p-6">
                <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#ba1a1a]">
                  <span className="material-symbols-outlined text-base">emergency</span>5 · Red flag indicators
                </p>
                {redFlagItems.length > 0 ? (
                  <ul className="space-y-2 text-sm text-[#93000a]">
                    {redFlagItems.map((r) => (
                      <li key={r} className="flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ba1a1a]" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#3e4a3d]">—</p>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
