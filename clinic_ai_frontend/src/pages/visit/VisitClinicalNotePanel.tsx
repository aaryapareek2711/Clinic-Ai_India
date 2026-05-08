import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  clearSelectedClinicalTemplate,
  getSelectedClinicalTemplate,
  setSelectedClinicalTemplate,
} from '../../lib/clinicalTemplateSelection'
import { getApiErrorMessage } from '../../lib/apiClient'
import {
  generateClinicalNote,
  type ClinicalNoteLatest,
  type IndiaClinicalNotePayload,
} from '../../services/visitWorkflowApi'
import { listClinicalTemplates, type ClinicalTemplateListItem } from '../../services/templatesApi'

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

type FollowUpUnit = 'days' | 'weeks' | 'months'

function parseFollowUpIn(raw: string | null | undefined): { count: string; unit: FollowUpUnit } {
  const text = String(raw || '').trim().toLowerCase()
  const m = text.match(/(\d+)\s*(day|days|week|weeks|month|months)/)
  if (!m) return { count: '7', unit: 'days' }
  const unitRaw = m[2]
  if (unitRaw.startsWith('week')) return { count: m[1], unit: 'weeks' }
  if (unitRaw.startsWith('month')) return { count: m[1], unit: 'months' }
  return { count: m[1], unit: 'days' }
}

function composeFollowUpIn(countRaw: string, unit: FollowUpUnit): string {
  const n = Number.parseInt(countRaw, 10)
  if (!Number.isFinite(n) || n <= 0) return ''
  const plural = n === 1 ? unit.slice(0, -1) : unit
  return `In ${n} ${plural}`
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
}

export default function VisitClinicalNotePanel({
  patientId,
  visitId,
  visitTitle,
  clinicalNote,
  transcriptionStatusKnown,
  transcriptionCompleted,
  onNoteUpdated,
}: VisitClinicalNotePanelProps) {
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [activeEditSection, setActiveEditSection] = useState<'chief' | 'narrative' | 'assessment' | 'plan' | null>(null)
  const [draftAssessment, setDraftAssessment] = useState('')
  const [draftPlan, setDraftPlan] = useState('')
  const [draftDoctorNotes, setDraftDoctorNotes] = useState('')
  const [draftChief, setDraftChief] = useState('')
  const [editingFollowUp, setEditingFollowUp] = useState(false)
  const [followUpCountDraft, setFollowUpCountDraft] = useState('7')
  const [followUpUnitDraft, setFollowUpUnitDraft] = useState<FollowUpUnit>('days')
  const [selectedTemplate, setSelectedTemplate] = useState(() => getSelectedClinicalTemplate())
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateOptions, setTemplateOptions] = useState<ClinicalTemplateListItem[]>([])

  const payload = useMemo(() => asIndiaPayload(clinicalNote?.payload), [clinicalNote])
  const editing = activeEditSection !== null

  useEffect(() => {
    if (!editing || !payload) return
    setDraftAssessment(payload.assessment ?? '')
    setDraftPlan(payload.plan ?? '')
    setDraftDoctorNotes(payload.doctor_notes ?? '')
    setDraftChief(payload.chief_complaint ?? '')
  }, [editing, payload, clinicalNote?.note_id])

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

  const handleGenerate = useCallback(
    async (templateIdOverride?: string | null) => {
      if (!patientId || !visitId || generating) return
      setGenerating(true)
      setMessage(null)
      try {
        const chosenTemplateId =
          templateIdOverride === undefined ? selectedTemplate?.id : templateIdOverride?.trim() || undefined
        const res = await generateClinicalNote(patientId, visitId, {
          template_id: chosenTemplateId || undefined,
          force_regenerate: true,
        })
        onNoteUpdated(res)
        setMessage('Clinical note generated and saved on the server.')
        setActiveEditSection(null)
      } catch (e) {
        setMessage(getApiErrorMessage(e))
      } finally {
        setGenerating(false)
      }
    },
    [patientId, visitId, generating, selectedTemplate?.id, onNoteUpdated],
  )

  const startEdit = (section: 'chief' | 'narrative' | 'assessment' | 'plan') => {
    if (!payload) return
    setDraftAssessment(payload.assessment ?? '')
    setDraftPlan(payload.plan ?? '')
    setDraftDoctorNotes(payload.doctor_notes ?? '')
    setDraftChief(payload.chief_complaint ?? '')
    setActiveEditSection(section)
    setMessage(null)
  }

  const cancelEdit = () => {
    setActiveEditSection(null)
    setMessage(null)
  }

  const urgencyClass = (u: string) => {
    const x = (u || '').toLowerCase()
    if (x === 'stat') return 'bg-rose-100 text-rose-800'
    if (x === 'urgent') return 'bg-amber-100 text-amber-900'
    return 'bg-slate-100 text-slate-700'
  }

  const startFollowUpEdit = () => {
    const parsed = parseFollowUpIn(displayPayload?.follow_up_in)
    setFollowUpCountDraft(parsed.count)
    setFollowUpUnitDraft(parsed.unit)
    setEditingFollowUp(true)
    setMessage(null)
  }

  const cancelFollowUpEdit = () => {
    setEditingFollowUp(false)
    setMessage(null)
  }

  const saveFollowUpEdit = () => {
    const nextFollowUpIn = composeFollowUpIn(followUpCountDraft, followUpUnitDraft)
    if (!nextFollowUpIn) {
      setMessage('Please choose a valid follow-up count greater than 0.')
      return
    }
    if (!clinicalNote || !displayPayload) {
      setMessage('Cannot update follow-up right now. Reload this visit and try again.')
      return
    }
    const nextPayload = {
      ...(clinicalNote.payload as Record<string, unknown>),
      follow_up_in: nextFollowUpIn,
      follow_up_date: null,
      follow_up_time: null,
    }
    onNoteUpdated({
      ...clinicalNote,
      payload: nextPayload,
    })
    setEditingFollowUp(false)
    setMessage('Follow-up timing updated in this view.')
  }

  useEffect(() => {
    if (!templatePickerOpen) return
    let cancelled = false
    void (async () => {
      try {
        setTemplatesLoading(true)
        setTemplatesError(null)
        const res = await listClinicalTemplates({
          page: 1,
          page_size: 100,
          search: templateSearch.trim() || undefined,
        })
        if (!cancelled) setTemplateOptions(res.items ?? [])
      } catch (e) {
        if (!cancelled) setTemplatesError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setTemplatesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templatePickerOpen, templateSearch])

  return (
    <div className="w-full space-y-6 rounded-xl border border-[#bdcaba] bg-white p-6 shadow-sm sm:p-8">
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
            className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005422] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!patientId || !visitId || generating}
            onClick={() => void handleGenerate(selectedTemplate?.id ?? null)}
            type="button"
          >
            {generating ? 'Working…' : clinicalNote ? 'Regenerate note' : 'Generate note'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-[#c5d4c0] bg-[#f7faf4] p-4 text-xs text-[#3e4a3d]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[#171d16]">Selected template</p>
          <button
            className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#171d16] hover:bg-gray-50"
            onClick={() => setTemplatePickerOpen(true)}
            type="button"
          >
            Choose template
          </button>
          {selectedTemplate ? (
            <>
              <span className="rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">
                {selectedTemplate.name}
              </span>
              <button
                className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#575e70] hover:bg-gray-50"
                onClick={() => {
                  clearSelectedClinicalTemplate()
                  setSelectedTemplate(null)
                  void handleGenerate(null)
                }}
                type="button"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-[11px] text-[#575e70]">No template selected.</span>
          )}
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
              {activeEditSection === 'chief' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">Chief complaint</span>
                  <textarea
                    className="min-h-[72px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                    onChange={(e) => setDraftChief(e.target.value)}
                    value={draftChief}
                  />
                </label>
              )}
              {activeEditSection === 'narrative' && (
                <>
                  {soapParts && (
                    <p className="text-xs text-[#575e70]">
                      Subjective / objective are stored inside clinical narrative. Edit the block below to adjust both.
                    </p>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      Clinical narrative / doctor notes
                    </span>
                    <textarea
                      className="min-h-[120px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                      onChange={(e) => setDraftDoctorNotes(e.target.value)}
                      value={draftDoctorNotes}
                    />
                  </label>
                </>
              )}
              {activeEditSection === 'assessment' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">Assessment</span>
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                    onChange={(e) => setDraftAssessment(e.target.value)}
                    value={draftAssessment}
                  />
                </label>
              )}
              {activeEditSection === 'plan' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#575e70]">Plan</span>
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                    onChange={(e) => setDraftPlan(e.target.value)}
                    value={draftPlan}
                  />
                </label>
              )}
              <p className="text-xs text-[#575e70]">
                Edits are local only. Regenerate replaces the server copy from AI.
              </p>
              <div className="flex justify-end">
                <button
                  className="rounded-lg border border-[#bdcaba] bg-white px-3 py-1.5 text-xs font-semibold text-[#171d16] hover:bg-gray-50"
                  onClick={cancelEdit}
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {(displayPayload.chief_complaint?.trim() || visitTitle) && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">Chief complaint</h4>
                    <button
                      className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#171d16] hover:bg-gray-50"
                      onClick={() => startEdit('chief')}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-[#171d16]">
                    {displayPayload.chief_complaint?.trim() || visitTitle}
                  </p>
                </section>
              )}

              {soapParts ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <section className="rounded-lg border border-[#e9f0e5] bg-[#fafdfb] p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#006b2c]">Subjective</h4>
                      <button
                        className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#171d16] hover:bg-gray-50"
                        onClick={() => startEdit('narrative')}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-[#3e4a3d] whitespace-pre-wrap">{soapParts.subjective || '—'}</p>
                  </section>
                  <section className="rounded-lg border border-[#e9f0e5] bg-[#fafdfb] p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#006b2c]">Objective</h4>
                    <p className="text-sm leading-relaxed text-[#3e4a3d] whitespace-pre-wrap">{soapParts.objective || '—'}</p>
                  </section>
                </div>
              ) : null}

              <section className="rounded-lg border border-[#c8e6c9]/60 bg-[#f1f8f4] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[#006b2c]">Assessment</h4>
                  <button
                    className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#171d16] hover:bg-gray-50"
                    onClick={() => startEdit('assessment')}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-[#171d16]">{displayPayload.assessment || '—'}</p>
              </section>

              <section className="rounded-lg border border-[#b3e5fc]/50 bg-[#f5fbfe] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[#0277bd]">Plan</h4>
                  <button
                    className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#171d16] hover:bg-gray-50"
                    onClick={() => startEdit('plan')}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
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
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">Follow-up</p>
                    {!editingFollowUp && (
                      <button
                        className="rounded-md border border-[#bdcaba] bg-white px-2 py-1 text-[11px] font-semibold text-[#171d16] hover:bg-gray-50"
                        onClick={startFollowUpEdit}
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingFollowUp ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="w-20 rounded-lg border border-[#bdcaba] px-2 py-1.5 text-sm text-[#171d16]"
                        onChange={(e) => setFollowUpCountDraft(e.target.value)}
                        value={followUpCountDraft}
                      >
                        {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-28 rounded-lg border border-[#bdcaba] px-2 py-1.5 text-sm text-[#171d16]"
                        onChange={(e) => setFollowUpUnitDraft(e.target.value as FollowUpUnit)}
                        value={followUpUnitDraft}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                      <button
                        className="rounded-md bg-[#2563eb] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                        onClick={saveFollowUpEdit}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-md border border-[#bdcaba] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#171d16] hover:bg-gray-50"
                        onClick={cancelFollowUpEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium text-[#171d16]">
                      {displayPayload.follow_up_in?.trim()
                        ? displayPayload.follow_up_in.trim()
                        : displayPayload.follow_up_date?.trim()
                          ? `${displayPayload.follow_up_date.trim()}${displayPayload.follow_up_time?.trim() ? ` · ${displayPayload.follow_up_time.trim()}` : ''}`
                          : '—'}
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {templatePickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            aria-label="Close template picker"
            className="absolute inset-0 bg-black/45"
            onClick={() => setTemplatePickerOpen(false)}
            type="button"
          />
          <div
            aria-labelledby="template-picker-title"
            aria-modal="true"
            className="relative z-[71] flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#bdcaba] bg-white shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h4 className="text-lg font-bold text-[#171d16]" id="template-picker-title">
                  Choose clinical template
                </h4>
                <p className="mt-1 text-sm text-[#575e70]">Select one of your saved templates.</p>
              </div>
              <button
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setTemplatePickerOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="border-b border-gray-100 px-6 py-3">
              <input
                className="w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16] placeholder:text-slate-400"
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates by name..."
                type="search"
                value={templateSearch}
              />
            </div>
            <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
              {templatesLoading && <p className="text-sm text-[#575e70]">Loading templates…</p>}
              {!templatesLoading && templatesError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{templatesError}</p>
              )}
              {!templatesLoading && !templatesError && templateOptions.length === 0 && (
                <p className="text-sm text-[#575e70]">No templates found.</p>
              )}
              {!templatesLoading &&
                !templatesError &&
                templateOptions.map((t) => (
                  <button
                    className="rounded-2xl border border-[#dce5d8] bg-white p-4 text-left hover:border-[#16a34a] hover:bg-[#f8faf6]"
                    key={t.id}
                    onClick={() => {
                      const picked = { id: t.id, name: t.name || 'Template' }
                      setSelectedClinicalTemplate(picked)
                      setSelectedTemplate(picked)
                      setTemplatePickerOpen(false)
                      void handleGenerate(picked.id)
                    }}
                    type="button"
                  >
                    <p className="text-3xl font-semibold text-[#171d16]">{t.name || 'Untitled template'}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#3e4a3d]">{t.description?.trim() || '—'}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="uppercase tracking-wide text-[#575e70]">{(t.category || 'General').toUpperCase()}</span>
                      <span className="font-semibold text-[#006b2c]">Use template</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
