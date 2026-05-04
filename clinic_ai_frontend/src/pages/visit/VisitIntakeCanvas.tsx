import { useMemo, useState } from 'react'

import { getApiErrorMessage } from '../../lib/apiClient'
import {
  generatePreVisitSummary,
  type ClinicalNoteLatest,
  type IntakeSessionResponse,
  type PreVisitSummaryResponse,
  type VisitDetailResponse,
} from '../../services/visitWorkflowApi'
import { computeIntakeProgress, splitToChips, topicHeading } from './intakeUtils'

export const PATIENT_AVATAR_VISIT =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC5wjB4bCGivsoHc4557SxbmXVX7SnvEIxBtJj66qnr4iAipzt3Hqxo2G3iA5wYpVYzwDQCUdlmvtnwmc4NaB9IsBitNnupQWvB9gxZD4HCNWCbzA1xzu1vHEyy8CZiSq2nz8AqCYJMUB7huDMJlYW1Vpql888iiGsjatY5T2WHXF48hFcoFtjo_AB_MLqZOtz42QVgZwR97S8NTxyUJNMCcatjmxUyeMQSc0NlF4TXegfK0_JFFUOGO7hVgQ3be8oQWyNmXVG60ogG'

const WA_HEADER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQnSPUVTyL-nhLjEbcbkrmF46xwC8vZWEv52r9qjkUJzEwqgo_rYYaOGpgczIaa7U0zelaLs6CRKgMShALJVdkwXqzIgQ4YlWLp6XVe2phA0JGpVZoImQ-XI1DG3ozERRh36YlZpA-VBq_0xR7A1NnRS7lsmLNDf7VR-DD_P6KQpkwRx0gWiiW3vDOIWEIiURMZZFitEhs8P-VihYzAKk0X7RDGVaJesB5d6X25cxAij-piSMdaKfFM-tzU7rwxZX1II_IOMyGgCpz'

function formatNoteTime(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return '—'
  }
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

  const allergyChips = useMemo(() => splitToChips(preVisit?.sections?.past_medical_history_allergies?.allergies ?? ''), [preVisit])
  const medicationChips = useMemo(() => splitToChips(preVisit?.sections?.current_medication?.medications_or_home_remedies ?? ''), [preVisit])

  const qaRows = intake?.question_answers?.filter((x) => x.question || x.answer) ?? []
  const qaPreview = qaRows.slice(-2)

  const payload = clinicalNote?.payload
  const assessment =
    payload?.assessment?.trim() ||
    [
      preVisit?.sections?.chief_complaint?.reason_for_visit,
      preVisit?.sections?.hpi?.symptom_severity_or_progression,
    ]
      .filter(Boolean)
      .join(' ') ||
    'No assessment text yet. Generate a pre-visit summary or clinical note when intake and transcription are available.'
  const plan =
    payload?.plan?.trim() ||
    preVisit?.sections?.hpi?.impact_on_daily_life?.trim() ||
    'Plan will appear after documentation is generated.'
  const rxRows = payload?.rx?.length ? payload.rx : []
  const redFlags = payload?.red_flags?.length ? payload.red_flags : preVisit?.sections?.red_flag_indicators ?? []

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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-8">
        <div className="rounded-xl border border-[#bdcaba] bg-white p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[18px] font-semibold text-[#171d16]">Initial Intake Progress</h3>
            <span className="text-sm font-semibold text-[#006b2c]">{pct}% Completed</span>
          </div>
          <div className="mb-8 h-2.5 w-full rounded-full bg-[#e9f0e5]">
            <div className="h-2.5 rounded-full bg-[#006b2c] transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-[#ba1a1a]">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">Critical Allergies</span>
              </div>
              {allergyChips.length > 0 ? (
                <ul className="space-y-2 text-sm text-[#93000a]">
                  {allergyChips.map((a) => (
                    <li key={a} className="flex items-center">
                      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#3e4a3d]">No allergies recorded.</p>
              )}
            </div>
            <div className="rounded-xl border border-[#006b2c]/20 bg-[#00873a]/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-[#006b2c]">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  medication
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">Current Medications</span>
              </div>
              {medicationChips.length > 0 ? (
                <ul className="space-y-2 text-sm text-[#005320]">
                  {medicationChips.map((m) => (
                    <li key={m} className="flex items-center">
                      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#006b2c]" />
                      {m}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#3e4a3d]">No medications recorded.</p>
              )}
            </div>
          </div>

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
            <div className="mt-4">
              <button
                className="rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-gray-50 disabled:opacity-60"
                disabled={generating || !patientId}
                onClick={() => void handleGenerate()}
                type="button"
              >
                {generating ? 'Refreshing…' : 'Refresh summary'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h3 className="text-[18px] font-semibold text-[#171d16]">OPD Note Draft</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#bdcaba] bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#575e70]">Section 01</span>
                <span className="material-symbols-outlined text-[#6e7b6c]">edit</span>
              </div>
              <h4 className="mb-2 font-semibold text-[#171d16]">Assessment</h4>
              <p className="text-sm leading-relaxed text-[#3e4a3d]">{assessment}</p>
            </div>
            <div className="rounded-xl border border-[#bdcaba] bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#575e70]">Section 02</span>
                <span className="material-symbols-outlined text-[#6e7b6c]">edit</span>
              </div>
              <h4 className="mb-2 font-semibold text-[#171d16]">Plan</h4>
              <p className="text-sm leading-relaxed text-[#3e4a3d]">{plan}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#bdcaba] bg-white">
            <div className="flex items-center justify-between border-b border-[#bdcaba] bg-[#e9f0e5] px-6 py-3">
              <span className="flex items-center font-semibold text-[#171d16]">
                <span className="material-symbols-outlined mr-2 text-[#006b2c]">prescriptions</span>
                Prescription (Rx)
              </span>
              <span className="text-xs text-[#575e70]">
                Last updated: {clinicalNote?.created_at ? formatNoteTime(clinicalNote.created_at) : '—'}
              </span>
            </div>
            <div className="p-6">
              {rxRows.length === 0 ? (
                <p className="text-sm text-[#3e4a3d]">No prescriptions in note yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#bdcaba] text-left text-[#575e70]">
                      <th className="pb-3 font-medium">Medicine</th>
                      <th className="pb-3 font-medium">Dosage</th>
                      <th className="pb-3 font-medium">Frequency</th>
                      <th className="pb-3 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bdcaba]/50">
                    {rxRows.map((row, i) => (
                      <tr key={`${row.medicine_name}-${i}`}>
                        <td className="py-4 font-semibold text-[#171d16]">{row.medicine_name ?? '—'}</td>
                        <td className="py-4">{row.dose ?? '—'}</td>
                        <td className="py-4">{row.frequency ?? '—'}</td>
                        <td className="py-4">{row.duration ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {redFlags.length > 0 && (
            <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 p-6">
              <h4 className="mb-3 flex items-center font-semibold text-[#ba1a1a]">
                <span className="material-symbols-outlined mr-2">emergency</span>
                Patient Red Flags (Watch-list)
              </h4>
              <div className="flex flex-wrap gap-2">
                {redFlags.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-[#ba1a1a]/30 bg-white px-3 py-1 text-xs font-medium text-[#ba1a1a]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#bdcaba] bg-white shadow-sm" id="intake-qa-anchor">
          <div className="flex items-center justify-between border-b border-gray-100 bg-[#eff6ea] p-6">
            <h3 className="text-[18px] font-semibold text-[#171d16]">Intake Q&amp;A Recap</h3>
            <span className="text-xs font-medium uppercase tracking-wider text-[#3e4a3d]">Via WhatsApp intake</span>
          </div>
          {qaRows.length === 0 ? (
            <div className="p-8 text-sm text-[#3e4a3d]">No intake messages yet for this visit.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {qaRows.slice(0, 12).map((row, idx) => (
                <div key={`${row.question}-${idx}`} className="p-6 transition-colors hover:bg-gray-50/50">
                  <p className="mb-1 text-xs font-medium uppercase text-[#006b2c]">{topicHeading(row.topic, `Topic ${idx + 1}`)}</p>
                  <p className="mb-2 font-medium text-[#171d16]">{row.question || '—'}</p>
                  <div className="border-l-4 border-[#62df7d] py-1 pl-4 italic text-[#3e4a3d]">&quot;{row.answer || '—'}&quot;</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="sticky top-24 rounded-xl border border-[#bdcaba] bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-[#171d16]">WhatsApp Update</h3>
            <div className="flex items-center gap-1 text-[#16a34a]">
              <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
              <span className="text-xs font-semibold">Active</span>
            </div>
          </div>
          <div className="relative flex aspect-[9/16] flex-col overflow-hidden rounded-xl border border-[#bdcaba] bg-[#e5ddd5]">
            <div className="flex items-center gap-3 bg-[#075e54] p-3 text-white">
              <span className="material-symbols-outlined">arrow_back</span>
              <img alt="" className="h-8 w-8 rounded-full border border-white/20 object-cover" src={WA_HEADER_IMG} />
              <div>
                <p className="text-sm font-bold leading-tight">{patientName}</p>
                <p className="text-[10px] opacity-80">Online</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {qaPreview.length === 0 ? (
                <p className="text-xs text-[#3e4a3d]">Messages appear when intake is in progress.</p>
              ) : (
                qaPreview.map((row, i) => (
                  <div
                    key={`${row.question}-${i}`}
                    className="relative max-w-[85%] rounded-lg bg-white p-3 text-xs text-[#171d16] shadow-sm"
                  >
                    {row.answer || row.question}
                  </div>
                ))
              )}
              <div className="relative ml-auto max-w-[85%] rounded-lg bg-[#dcf8c6] p-3 text-xs shadow-sm">
                <p className="mb-1 font-bold">Prescription Summary:</p>
                {rxRows.slice(0, 2).map((r) => (
                  <span key={r.medicine_name} className="block">
                    — {r.medicine_name ?? 'Medicine'}
                  </span>
                ))}
                {rxRows.length === 0 && <span className="text-[#575e70]">Awaiting clinical note.</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white p-3">
              <div className="flex-1 rounded-full bg-[#e9f0e5] px-4 py-2 text-xs text-[#575e70]">Type message…</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#075e54] text-white">
                <span className="material-symbols-outlined">mic</span>
              </div>
            </div>
          </div>
          <button
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-3 font-bold text-white transition-all hover:bg-[#006b2c] active:scale-[0.98]"
            type="button"
          >
            <span className="material-symbols-outlined">send</span>
            Send Now
          </button>
        </div>
      </div>
    </div>
  )
}
