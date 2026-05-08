import { useEffect, useMemo, useState } from 'react'

import { getApiErrorMessage } from '../../lib/apiClient'
import {
  type IntakeSessionResponse,
  type PreVisitSummaryResponse,
  savePreVisitAdditionalDoctorNote,
  type VisitDetailResponse,
} from '../../services/visitWorkflowApi'
import { splitToChips } from './intakeUtils'

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
  onPreVisitUpdated: (doc: PreVisitSummaryResponse | null) => void
}

export default function VisitIntakeCanvas({
  visitId,
  visit,
  preVisit,
  onPreVisitUpdated,
}: Props) {
  const patientId = visit?.patient_id ?? ''

  const sections = preVisit?.sections
  const additionalDoctorNotePersisted = sections?.additional_doctor_note ?? null
  const hasSavedAdditionalDoctorNote = Boolean(String(additionalDoctorNotePersisted ?? '').trim())
  const [editingAdditionalDoctorNote, setEditingAdditionalDoctorNote] = useState(false)
  const [additionalDoctorNoteDraft, setAdditionalDoctorNoteDraft] = useState<string>(
    String(additionalDoctorNotePersisted ?? ''),
  )
  const [additionalDoctorNoteSaving, setAdditionalDoctorNoteSaving] = useState(false)
  const [additionalDoctorNoteError, setAdditionalDoctorNoteError] = useState<string | null>(null)

  useEffect(() => {
    if (editingAdditionalDoctorNote) return
    setAdditionalDoctorNoteDraft(String(additionalDoctorNotePersisted ?? ''))
    setAdditionalDoctorNoteError(null)
  }, [additionalDoctorNotePersisted, editingAdditionalDoctorNote])
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

  async function handleSaveAdditionalDoctorNote() {
    if (!patientId || !visitId) return
    const next = additionalDoctorNoteDraft.trim()
    if (!next) return

    setAdditionalDoctorNoteSaving(true)
    setAdditionalDoctorNoteError(null)
    try {
      const updated = await savePreVisitAdditionalDoctorNote(patientId, visitId, next)
      onPreVisitUpdated(updated)
      setEditingAdditionalDoctorNote(false)
      setAdditionalDoctorNoteDraft(next)
    } catch (e) {
      setAdditionalDoctorNoteError(getApiErrorMessage(e))
    } finally {
      setAdditionalDoctorNoteSaving(false)
    }
  }

  const showSummary = Boolean(preVisit?.sections)

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        {showSummary && sections && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-[18px] font-semibold text-[#171d16]">Pre-visit summary</h3>
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

              <section className="rounded-xl border border-[#bdcaba] bg-white p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#575e70]">Additional doctor note</p>
                  {hasSavedAdditionalDoctorNote && !editingAdditionalDoctorNote ? (
                    <button
                      className="rounded-md border border-[#bdcaba] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#575e70] hover:bg-gray-50"
                      onClick={() => setEditingAdditionalDoctorNote(true)}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>

                {editingAdditionalDoctorNote || !hasSavedAdditionalDoctorNote ? (
                  <div>
                    <textarea
                      className="w-full rounded-md border border-[#bdcaba] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006b2c] resize-none"
                      disabled={additionalDoctorNoteSaving}
                      value={additionalDoctorNoteDraft}
                      onChange={(e) => setAdditionalDoctorNoteDraft(e.target.value)}
                      rows={4}
                      placeholder="Add your additional doctor note…"
                    />

                    {additionalDoctorNoteError && (
                      <p className="mt-2 text-sm text-red-800" role="alert">
                        {additionalDoctorNoteError}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2">
                      {hasSavedAdditionalDoctorNote && editingAdditionalDoctorNote ? (
                        <button
                          className="rounded-lg border border-[#bdcaba] bg-white px-3 py-2 text-sm font-semibold text-[#575e70] hover:bg-gray-50"
                          disabled={additionalDoctorNoteSaving}
                          onClick={() => {
                            setEditingAdditionalDoctorNote(false)
                            setAdditionalDoctorNoteDraft(String(additionalDoctorNotePersisted ?? ''))
                            setAdditionalDoctorNoteError(null)
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      ) : null}
                      <button
                        className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={additionalDoctorNoteSaving || !additionalDoctorNoteDraft.trim()}
                        onClick={() => void handleSaveAdditionalDoctorNote()}
                        type="button"
                      >
                        {additionalDoctorNoteSaving ? 'Saving…' : 'Save note'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-[#575e70]">Note</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-[#171d16]">{additionalDoctorNotePersisted}</dd>
                    </div>
                  </dl>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
