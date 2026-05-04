import { useCallback, useEffect, useMemo, useState } from 'react'

import { getApiErrorMessage } from '../../lib/apiClient'
import {
  generateClinicalNote,
  type ClinicalNoteLatest,
  type IndiaClinicalNotePayload,
} from '../../services/visitWorkflowApi'

function asIndiaPayload(raw: ClinicalNoteLatest['payload']): IndiaClinicalNotePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.assessment !== 'string' || typeof o.plan !== 'string') return null
  return {
    assessment: o.assessment,
    plan: o.plan,
    rx: Array.isArray(o.rx) ? (o.rx as IndiaClinicalNotePayload['rx']) : [],
    investigations: Array.isArray(o.investigations)
      ? (o.investigations as IndiaClinicalNotePayload['investigations'])
      : [],
    red_flags: Array.isArray(o.red_flags) ? (o.red_flags as string[]) : [],
    follow_up_in: o.follow_up_in != null ? String(o.follow_up_in) : null,
    follow_up_date: o.follow_up_date != null ? String(o.follow_up_date) : null,
    follow_up_time: o.follow_up_time != null ? String(o.follow_up_time) : null,
    doctor_notes: o.doctor_notes != null ? String(o.doctor_notes) : null,
    chief_complaint: o.chief_complaint != null ? String(o.chief_complaint) : null,
    data_gaps: Array.isArray(o.data_gaps) ? (o.data_gaps as string[]) : [],
  }
}

function parseSoapFromDoctorNotes(raw: string | null | undefined): { subjective: string; objective: string } | null {
  const s = (raw ?? '').trim()
  if (!s.toLowerCase().startsWith('subjective:')) return null
  const afterSubj = s.slice('subjective:'.length).trim()
  const marker = /\nobjective:/i
  const m = afterSubj.match(marker)
  if (!m || m.index === undefined) return null
  const subjective = afterSubj.slice(0, m.index).trim()
  const objective = afterSubj.slice(m.index + m[0].length).trim()
  if (!subjective && !objective) return null
  return { subjective, objective }
}

function formatNoteForExport(
  visitLabel: string,
  payload: IndiaClinicalNotePayload,
  meta: { noteId: string; createdAt: string; noteType?: string; version?: number },
): string {
  const lines: string[] = [
    `Clinical note · ${visitLabel}`,
    `Note ID: ${meta.noteId} · Saved: ${meta.createdAt}${meta.noteType ? ` · Type: ${meta.noteType}` : ''}${meta.version != null ? ` · v${meta.version}` : ''}`,
    '',
  ]
  if (payload.chief_complaint?.trim()) {
    lines.push('Chief complaint (context)', payload.chief_complaint.trim(), '')
  }
  const soap = parseSoapFromDoctorNotes(payload.doctor_notes)
  if (soap) {
    lines.push('Subjective', soap.subjective || '—', '', 'Objective', soap.objective || '—', '')
  } else if (payload.doctor_notes?.trim()) {
    lines.push('Clinical narrative / doctor notes', payload.doctor_notes.trim(), '')
  }
  lines.push('Assessment', payload.assessment || '—', '', 'Plan', payload.plan || '—', '')
  if (payload.rx?.length) {
    lines.push('', 'Prescription (Rx)')
    for (const r of payload.rx) {
      const parts = [r.medicine_name, r.dose, r.frequency, r.duration, r.route, r.food_instruction].filter(
        (x) => (x ?? '').toString().trim(),
      )
      lines.push(`  • ${parts.join(' · ') || '—'}`)
    }
  }
  if (payload.investigations?.length) {
    lines.push('', 'Investigations')
    for (const inv of payload.investigations) {
      lines.push(`  • ${inv.test_name} (${inv.urgency})`)
      if (inv.preparation_instructions?.trim()) lines.push(`    Prep: ${inv.preparation_instructions.trim()}`)
      if (inv.routing_note?.trim()) lines.push(`    Routing: ${inv.routing_note.trim()}`)
    }
  }
  if (payload.red_flags?.length) {
    lines.push('', 'Red flags')
    for (const rf of payload.red_flags) lines.push(`  • ${rf}`)
  }
  if (payload.data_gaps?.length) {
    lines.push('', 'Data gaps')
    for (const g of payload.data_gaps) lines.push(`  • ${g}`)
  }
  const fu =
    (payload.follow_up_in?.trim() && `In: ${payload.follow_up_in.trim()}`) ||
    (payload.follow_up_date?.trim() &&
      `Date: ${payload.follow_up_date.trim()}${payload.follow_up_time?.trim() ? ` at ${payload.follow_up_time.trim()}` : ''}`)
  if (fu) lines.push('', 'Follow-up', fu)
  return lines.join('\n')
}

export type VisitClinicalNotePanelProps = {
  patientId: string
  visitId: string
  visitTitle: string
  clinicalNote: ClinicalNoteLatest | null
  /** True once transcription status has been loaded for this visit (any value). */
  transcriptionStatusKnown: boolean
  transcriptionCompleted: boolean
  onNoteUpdated: (note: ClinicalNoteLatest | null) => void
  onApproveNext?: (payload: { followUpDate: string; followUpTime: string }) => void
}

export default function VisitClinicalNotePanel({
  patientId,
  visitId,
  visitTitle,
  clinicalNote,
  transcriptionStatusKnown,
  transcriptionCompleted,
  onNoteUpdated,
  onApproveNext,
}: VisitClinicalNotePanelProps) {
  const [generating, setGenerating] = useState(false)
  const [approvingNext, setApprovingNext] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftAssessment, setDraftAssessment] = useState('')
  const [draftPlan, setDraftPlan] = useState('')
  const [draftDoctorNotes, setDraftDoctorNotes] = useState('')
  const [draftChief, setDraftChief] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpTime, setFollowUpTime] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const payload = useMemo(() => asIndiaPayload(clinicalNote?.payload), [clinicalNote])

  useEffect(() => {
    if (!editing || !payload) return
    setDraftAssessment(payload.assessment ?? '')
    setDraftPlan(payload.plan ?? '')
    setDraftDoctorNotes(payload.doctor_notes ?? '')
    setDraftChief(payload.chief_complaint ?? '')
  }, [editing, payload, clinicalNote?.note_id])

  useEffect(() => {
    // Keep follow-up draft in sync with latest persisted note so Approve & Next forwards current values.
    setFollowUpDate(payload?.follow_up_date?.toString().trim() || '')
    setFollowUpTime(payload?.follow_up_time?.toString().trim() || '')
  }, [payload?.follow_up_date, payload?.follow_up_time, clinicalNote?.note_id])

  const displayPayload = useMemo((): IndiaClinicalNotePayload | null => {
    if (!payload) return null
    if (!editing) return payload
    return {
      ...payload,
      assessment: draftAssessment,
      plan: draftPlan,
      doctor_notes: draftDoctorNotes || null,
      chief_complaint: draftChief || null,
    }
  }, [payload, editing, draftAssessment, draftPlan, draftDoctorNotes, draftChief])

  const soapParts = useMemo(() => parseSoapFromDoctorNotes(displayPayload?.doctor_notes), [displayPayload?.doctor_notes])

  const handleGenerate = useCallback(async () => {
    if (!patientId || !visitId || generating) return
    setGenerating(true)
    setMessage(null)
    try {
      const res = await generateClinicalNote(patientId, visitId, {
        follow_up_date: followUpDate.trim() || undefined,
        follow_up_time: followUpTime.trim() || undefined,
      })
      onNoteUpdated(res)
      setMessage('Clinical note generated and saved on the server.')
      setEditing(false)
    } catch (e) {
      setMessage(getApiErrorMessage(e))
    } finally {
      setGenerating(false)
    }
  }, [patientId, visitId, generating, followUpDate, followUpTime, onNoteUpdated])

  const handleApproveAndNext = useCallback(async () => {
    if (!patientId || !visitId || approvingNext) return
    setApprovingNext(true)
    setMessage(null)
    const fuDate = followUpDate.trim()
    const fuTime = followUpTime.trim()
    try {
      const res = await generateClinicalNote(patientId, visitId, {
        follow_up_date: fuDate || undefined,
        follow_up_time: fuTime || undefined,
      })
      onNoteUpdated(res)
      setEditing(false)
      setMessage('Clinical note approved. Moving to post-visit.')
      onApproveNext?.({ followUpDate: fuDate, followUpTime: fuTime })
    } catch (e) {
      setMessage(getApiErrorMessage(e))
    } finally {
      setApprovingNext(false)
    }
  }, [patientId, visitId, approvingNext, followUpDate, followUpTime, onNoteUpdated, onApproveNext])

  const handleCopy = useCallback(async () => {
    if (!clinicalNote || !displayPayload) return
    const text = formatNoteForExport(visitTitle, displayPayload, {
      noteId: clinicalNote.note_id,
      createdAt: clinicalNote.created_at,
      noteType: clinicalNote.note_type,
      version: clinicalNote.version,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback('Copied to clipboard — paste into your EHR or document.')
    } catch {
      setCopyFeedback('Could not access clipboard. Select and copy manually.')
    }
    window.setTimeout(() => setCopyFeedback(null), 4000)
  }, [clinicalNote, displayPayload, visitTitle])

  const startEdit = () => {
    if (!payload) return
    setDraftAssessment(payload.assessment ?? '')
    setDraftPlan(payload.plan ?? '')
    setDraftDoctorNotes(payload.doctor_notes ?? '')
    setDraftChief(payload.chief_complaint ?? '')
    setEditing(true)
    setMessage(null)
  }

  const cancelEdit = () => {
    setEditing(false)
    setMessage(null)
  }

  const urgencyClass = (u: string) => {
    const x = (u || '').toLowerCase()
    if (x === 'stat') return 'bg-rose-100 text-rose-800'
    if (x === 'urgent') return 'bg-amber-100 text-amber-900'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-xl border border-[#bdcaba] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[#e9f0e5] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#171d16]">Clinical note</h3>
          <p className="mt-1 text-xs text-[#575e70]">
            India OPD structure: assessment, plan, prescription, investigations, follow-up, and safety flags — aligned with
            the server note contract.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-[#bdcaba] bg-white px-3 py-2 text-sm font-semibold text-[#171d16] hover:bg-[#f7faf4] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!clinicalNote || generating}
            onClick={() => void handleCopy()}
            type="button"
          >
            Copy note
          </button>
          {clinicalNote && payload && (
            <button
              className="rounded-lg border border-[#006b2c]/40 bg-[#f0fdf4] px-3 py-2 text-sm font-semibold text-[#006b2c] hover:bg-[#dcfce7] disabled:opacity-50"
              disabled={generating}
              onClick={() => (editing ? cancelEdit() : startEdit())}
              type="button"
            >
              {editing ? 'Cancel edit' : 'Edit locally'}
            </button>
          )}
          <button
            className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005422] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!patientId || !visitId || generating || approvingNext}
            onClick={() => void handleGenerate()}
            type="button"
          >
            {generating ? 'Working…' : clinicalNote ? 'Regenerate note' : 'Generate note'}
          </button>
          <button
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!patientId || !visitId || generating || approvingNext}
            onClick={() => void handleApproveAndNext()}
            type="button"
          >
            {approvingNext ? 'Approving…' : 'Approve & Next'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-[#c5d4c0] bg-[#f7faf4] p-4 text-xs text-[#3e4a3d]">
        <p className="font-semibold text-[#171d16]">Optional before generate</p>
        <p className="mt-1 text-[#575e70]">
          Staff follow-up date/time is sent to the server with generation (scheduling + may refresh a cached note). Leave
          blank if not needed.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#575e70]">Follow-up date</span>
            <input
              className="rounded-lg border border-[#bdcaba] px-2 py-1.5 text-sm text-[#171d16]"
              onChange={(e) => setFollowUpDate(e.target.value)}
              type="date"
              value={followUpDate}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#575e70]">Time (HH:MM)</span>
            <input
              className="w-28 rounded-lg border border-[#bdcaba] px-2 py-1.5 text-sm text-[#171d16]"
              onChange={(e) => setFollowUpTime(e.target.value)}
              placeholder="10:30"
              type="text"
              value={followUpTime}
            />
          </label>
        </div>
      </div>

      {transcriptionStatusKnown && !transcriptionCompleted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-950">
          Transcription is not marked completed yet. Generation may fail until audio is transcribed — finish the
          Transcription step first when possible.
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.toLowerCase().includes('fail') || message.includes('404') || message.includes('422')
              ? 'border border-rose-200 bg-rose-50 text-rose-900'
              : 'border border-[#86efac] bg-[#ecfdf3] text-[#14532d]'
          }`}
        >
          {message}
        </div>
      )}
      {copyFeedback && (
        <p className="text-xs font-medium text-[#006b2c]" role="status">
          {copyFeedback}
        </p>
      )}

      {!clinicalNote && (
        <div className="rounded-xl border border-[#e9f0e5] bg-[#fafdfb] px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f5e9] text-[#2e7d32]">
            <span className="material-symbols-outlined text-3xl">clinical_notes</span>
          </div>
          <p className="text-sm font-medium text-[#171d16]">No saved clinical note for this visit</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#575e70]">
            Run <span className="font-semibold text-[#171d16]">Generate note</span> after intake and transcription are
            available. The server builds assessment, plan, Rx, investigations, red flags, and follow-up fields.
          </p>
        </div>
      )}

      {clinicalNote && displayPayload && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#575e70]">
            {clinicalNote.note_type && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">{clinicalNote.note_type}</span>
            )}
            {clinicalNote.status && (
              <span className="rounded-full bg-[#e8f5e9] px-2.5 py-0.5 font-medium text-[#2e7d32]">{clinicalNote.status}</span>
            )}
            {clinicalNote.version != null && <span>Version {clinicalNote.version}</span>}
            <span>Saved {new Date(clinicalNote.created_at).toLocaleString()}</span>
          </div>

          {editing ? (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">Chief complaint</span>
                <textarea
                  className="min-h-[72px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  onChange={(e) => setDraftChief(e.target.value)}
                  value={draftChief}
                />
              </label>
              {soapParts && (
                <>
                  <p className="text-xs text-[#575e70]">
                    Subjective / objective are stored inside clinical narrative. Edit the block below to adjust both.
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      Clinical narrative (SOAP source)
                    </span>
                    <textarea
                      className="min-h-[120px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 font-mono text-xs text-[#171d16]"
                      onChange={(e) => setDraftDoctorNotes(e.target.value)}
                      value={draftDoctorNotes}
                    />
                  </label>
                </>
              )}
              {!soapParts && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                    Clinical narrative / doctor notes
                  </span>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                    onChange={(e) => setDraftDoctorNotes(e.target.value)}
                    value={draftDoctorNotes}
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">Assessment</span>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  onChange={(e) => setDraftAssessment(e.target.value)}
                  value={draftAssessment}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">Plan</span>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  onChange={(e) => setDraftPlan(e.target.value)}
                  value={draftPlan}
                />
              </label>
              <p className="text-xs text-[#575e70]">
                Edits are local only — use <span className="font-semibold">Copy note</span> to paste into your EHR. Regenerate
                replaces the server copy from AI.
              </p>
            </div>
          ) : (
            <>
              {(displayPayload.chief_complaint?.trim() || visitTitle) && (
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#575e70]">Chief complaint</h4>
                  <p className="text-sm leading-relaxed text-[#171d16]">
                    {displayPayload.chief_complaint?.trim() || visitTitle}
                  </p>
                </section>
              )}

              {soapParts ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <section className="rounded-lg border border-[#e9f0e5] bg-[#fafdfb] p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#006b2c]">Subjective</h4>
                    <p className="text-sm leading-relaxed text-[#3e4a3d] whitespace-pre-wrap">{soapParts.subjective || '—'}</p>
                  </section>
                  <section className="rounded-lg border border-[#e9f0e5] bg-[#fafdfb] p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#006b2c]">Objective</h4>
                    <p className="text-sm leading-relaxed text-[#3e4a3d] whitespace-pre-wrap">{soapParts.objective || '—'}</p>
                  </section>
                </div>
              ) : (
                displayPayload.doctor_notes?.trim() && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#575e70]">Clinical narrative</h4>
                    <p className="text-sm leading-relaxed text-[#3e4a3d] whitespace-pre-wrap">{displayPayload.doctor_notes}</p>
                  </section>
                )
              )}

              <section className="rounded-lg border border-[#c8e6c9]/60 bg-[#f1f8f4] p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#006b2c]">Assessment</h4>
                <p className="text-sm leading-relaxed text-[#171d16]">{displayPayload.assessment || '—'}</p>
              </section>

              <section className="rounded-lg border border-[#b3e5fc]/50 bg-[#f5fbfe] p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0277bd]">Plan</h4>
                <p className="text-sm leading-relaxed text-[#171d16]">{displayPayload.plan || '—'}</p>
              </section>

              {displayPayload.rx && displayPayload.rx.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#575e70]">Prescription (Rx)</h4>
                  <div className="overflow-x-auto rounded-lg border border-[#bdcaba]">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#e9f0e5] bg-[#f7faf4] text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                          <th className="px-3 py-2">Medicine</th>
                          <th className="px-3 py-2">Dose</th>
                          <th className="px-3 py-2">Frequency</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2">Route</th>
                          <th className="px-3 py-2">With food</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayPayload.rx.map((r, i) => (
                          <tr className="border-b border-[#f0f4ed] last:border-0" key={`${r.medicine_name}-${i}`}>
                            <td className="px-3 py-2.5 font-medium text-[#171d16]">{r.medicine_name || '—'}</td>
                            <td className="px-3 py-2.5 text-[#3e4a3d]">{r.dose || '—'}</td>
                            <td className="px-3 py-2.5 text-[#3e4a3d]">{r.frequency || '—'}</td>
                            <td className="px-3 py-2.5 text-[#3e4a3d]">{r.duration || '—'}</td>
                            <td className="px-3 py-2.5 text-[#3e4a3d]">{r.route || '—'}</td>
                            <td className="px-3 py-2.5 text-[#3e4a3d]">{r.food_instruction || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {displayPayload.investigations && displayPayload.investigations.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#575e70]">Investigations</h4>
                  <ul className="space-y-2">
                    {displayPayload.investigations.map((inv, i) => (
                      <li
                        className="flex flex-col gap-1 rounded-lg border border-[#e9f0e5] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        key={`${inv.test_name}-${i}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#171d16]">{inv.test_name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyClass(inv.urgency)}`}>
                            {inv.urgency}
                          </span>
                        </div>
                        <div className="text-xs text-[#575e70]">
                          {inv.preparation_instructions?.trim() && <p>Prep: {inv.preparation_instructions}</p>}
                          {inv.routing_note?.trim() && <p>Routing: {inv.routing_note}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {displayPayload.red_flags && displayPayload.red_flags.length > 0 && (
                <section className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-800">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Red flags
                  </h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-rose-900">
                    {displayPayload.red_flags.map((rf) => (
                      <li key={rf}>{rf}</li>
                    ))}
                  </ul>
                </section>
              )}

              {displayPayload.data_gaps && displayPayload.data_gaps.length > 0 && (
                <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Data gaps</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-[#78350f]">
                    {displayPayload.data_gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="flex flex-wrap items-center gap-3 rounded-lg border border-[#bdcaba] bg-[#f8faf6] px-4 py-3 text-sm">
                <span className="material-symbols-outlined text-[#006b2c]">event_upcoming</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">Follow-up</p>
                  <p className="font-medium text-[#171d16]">
                    {displayPayload.follow_up_in?.trim()
                      ? `In ${displayPayload.follow_up_in.trim()}`
                      : displayPayload.follow_up_date?.trim()
                        ? `${displayPayload.follow_up_date.trim()}${displayPayload.follow_up_time?.trim() ? ` · ${displayPayload.follow_up_time.trim()}` : ''}`
                        : '—'}
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
