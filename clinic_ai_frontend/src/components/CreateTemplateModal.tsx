import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../lib/apiClient'
import {
  updateClinicalTemplate,
  type ClinicalTemplateListItem,
  createClinicalTemplate,
  type TemplateContentPayload,
  type TemplateInvestigationPayload,
  type TemplateMedicationPayload,
} from '../services/templatesApi'

/** Default order aligns with typical clinical-note flow; users may still reorder sections. */
const CLINICAL_CONTENT_SECTIONS = [
  'chief_complaint',
  'assessment',
  'plan',
  'investigations',
  'red_flags',
  'data_gaps',
  'follow_up_date',
  'rx',
  'doctor_notes',
] as const

type ClinicalContentSection = (typeof CLINICAL_CONTENT_SECTIONS)[number]

const ELIMINATABLE_SECTIONS = ['rx', 'doctor_notes'] as const
type EliminatableSection = (typeof ELIMINATABLE_SECTIONS)[number]

function isEliminatableSection(section: ClinicalContentSection): section is EliminatableSection {
  return (ELIMINATABLE_SECTIONS as readonly string[]).includes(section)
}

/** Re-insert eliminated optional blocks using default clinical-note proximity. */
function insertEliminatableSectionBack(
  currentOrder: ClinicalContentSection[],
  section: EliminatableSection,
): ClinicalContentSection[] {
  if (currentOrder.includes(section)) return currentOrder
  const defaultOrder = [...CLINICAL_CONTENT_SECTIONS]
  const targetIdx = defaultOrder.indexOf(section)

  let insertAt = currentOrder.length
  for (let i = targetIdx - 1; i >= 0; i--) {
    const predecessor = defaultOrder[i] as ClinicalContentSection
    const idx = currentOrder.lastIndexOf(predecessor)
    if (idx !== -1) {
      insertAt = idx + 1
      break
    }
  }
  if (insertAt === currentOrder.length) {
    for (let i = targetIdx + 1; i < defaultOrder.length; i++) {
      const successor = defaultOrder[i] as ClinicalContentSection
      const idx = currentOrder.indexOf(successor)
      if (idx !== -1) {
        insertAt = idx
        break
      }
    }
  }
  const next = [...currentOrder]
  next.splice(insertAt, 0, section)
  return next
}

/** Narrative sections shown without free-text boxes; Brief/Detail will drive generation once wired to the backend. */
const NARRATIVE_SECTIONS = [
  'chief_complaint',
  'assessment',
  'plan',
  'doctor_notes',
  'red_flags',
  'data_gaps',
] as const
type NarrativeSection = (typeof NARRATIVE_SECTIONS)[number]

function isNarrativeSection(section: ClinicalContentSection): section is NarrativeSection {
  return (NARRATIVE_SECTIONS as readonly string[]).includes(section)
}

function isClinicalContentSection(value: string): value is ClinicalContentSection {
  return (CLINICAL_CONTENT_SECTIONS as readonly string[]).includes(value)
}

const defaultNarrativeDepth = (): Record<NarrativeSection, 'brief' | 'detail'> => ({
  chief_complaint: 'brief',
  assessment: 'brief',
  plan: 'brief',
  doctor_notes: 'brief',
  red_flags: 'brief',
  data_gaps: 'brief',
})

const emptyMedication = (): TemplateMedicationPayload => ({
  medicine_name: '',
  dose: '',
  frequency: '',
  duration: '',
  route: '',
  food_instruction: '',
})

const emptyInvestigation = (): TemplateInvestigationPayload => ({
  test_name: '',
  urgency: '',
  preparation_instructions: '',
})

const emptyContent = (): TemplateContentPayload => ({
  chief_complaint: '',
  assessment: '',
  plan: '',
  doctor_notes: '',
  follow_up_in: '',
  follow_up_date: '',
  rx: [emptyMedication()],
  investigations: [],
  red_flags: [],
  data_gaps: [],
  optional_preferences: '',
  included_sections: [...CLINICAL_CONTENT_SECTIONS],
  section_detail_level: defaultNarrativeDepth(),
  section_order: [...CLINICAL_CONTENT_SECTIONS],
})

const APPOINTMENT_OPTIONS = ['Consultation', 'Follow-up', 'Procedure', 'Telehealth']
const QUICK_ADD_SECTIONS = [
  'Family history',
  'Present illness history',
  'General history',
  'General examination',
  'Advice',
  'Menstrual history',
  'Obstetric history',
] as const

function parseTagsInput(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function buildBodyContent(content: TemplateContentPayload, redFlagsText: string, dataGapsText: string): TemplateContentPayload {
  const rf = redFlagsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const dg = dataGapsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const rx = content.rx.filter(
    (m) =>
      m.medicine_name.trim() ||
      m.dose.trim() ||
      m.frequency.trim() ||
      m.duration.trim() ||
      m.route.trim() ||
      m.food_instruction.trim(),
  )
  const investigations = content.investigations.filter(
    (i) => i.test_name.trim() || i.urgency.trim() || i.preparation_instructions.trim(),
  )
  return {
    ...content,
    rx: rx.length > 0 ? rx : [],
    investigations,
    red_flags: rf,
    data_gaps: dg,
  }
}

function buildTemplateControlledContent(
  content: TemplateContentPayload,
  redFlagsText: string,
  dataGapsText: string,
  optionalPreferences: string,
  sectionOrder: ClinicalContentSection[],
  narrativeDepth: Record<NarrativeSection, 'brief' | 'detail'>,
): TemplateContentPayload {
  const base = buildBodyContent(content, redFlagsText, dataGapsText)
  const included = [...sectionOrder]
  const detailEntries = included
    .filter(isNarrativeSection)
    .map((section) => [section, narrativeDepth[section]] as const)
  return {
    ...base,
    optional_preferences: optionalPreferences.trim(),
    included_sections: included,
    section_order: included,
    section_detail_level: Object.fromEntries(detailEntries),
  }
}

function deriveSectionOrderFromTemplateContent(content?: TemplateContentPayload): ClinicalContentSection[] {
  if (!content) return [...CLINICAL_CONTENT_SECTIONS]
  const includedRaw = Array.isArray(content.included_sections) ? content.included_sections : []
  const orderRaw = Array.isArray(content.section_order) ? content.section_order : []
  const included = includedRaw.map(String).filter(isClinicalContentSection)
  const order = orderRaw.map(String).filter(isClinicalContentSection)
  const includeSet = new Set(included)
  if (includeSet.size === 0) return [...CLINICAL_CONTENT_SECTIONS]
  const next: ClinicalContentSection[] = []
  for (const section of order) {
    if (includeSet.has(section) && !next.includes(section)) next.push(section)
  }
  for (const section of CLINICAL_CONTENT_SECTIONS) {
    if (includeSet.has(section) && !next.includes(section)) next.push(section)
  }
  return next
}

function deriveNarrativeDepthFromTemplateContent(content?: TemplateContentPayload): Record<NarrativeSection, 'brief' | 'detail'> {
  const base = defaultNarrativeDepth()
  if (!content?.section_detail_level) return base
  const entries = Object.entries(content.section_detail_level)
  for (const [k, v] of entries) {
    if (!isNarrativeSection(k as ClinicalContentSection)) continue
    if (v === 'brief' || v === 'detail') {
      base[k as NarrativeSection] = v
    }
  }
  return base
}

function stableEditFingerprint(input: {
  name: string
  description: string
  tags: string[]
  appointmentTypes: string[]
  content: TemplateContentPayload
}): string {
  return JSON.stringify({
    name: input.name.trim(),
    description: input.description.trim(),
    tags: input.tags,
    appointmentTypes: [...input.appointmentTypes].sort(),
    content: input.content,
  })
}

type Props = {
  isOpen: boolean
  onClose: () => void
  /** Called after a successful template save. */
  onCreated?: () => void
  onUpdated?: () => void
  templateToEdit?: ClinicalTemplateListItem | null
}

export default function CreateTemplateModal({ isOpen, onClose, onCreated, onUpdated, templateToEdit }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([])
  const [content, setContent] = useState<TemplateContentPayload>(emptyContent)
  const [optionalPreferences, setOptionalPreferences] = useState('')
  const [redFlagsText, setRedFlagsText] = useState('')
  const [dataGapsText, setDataGapsText] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentSectionOrder, setContentSectionOrder] = useState<ClinicalContentSection[]>([
    ...CLINICAL_CONTENT_SECTIONS,
  ])
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null)
  const [hiddenMedicationFields, setHiddenMedicationFields] = useState<Record<string, boolean>>({})
  /** UI-only until post-visit generation reads this from the API. */
  const [narrativeDepth, setNarrativeDepth] = useState(defaultNarrativeDepth)
  const isEditMode = Boolean(templateToEdit)

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const resetAll = useCallback(() => {
    setName('')
    setDescription('')
    setTagsInput('')
    setAppointmentTypes([])
    setContent(emptyContent())
    setOptionalPreferences('')
    setRedFlagsText('')
    setDataGapsText('')
    setError(null)
    setSaveLoading(false)
    setContentSectionOrder([...CLINICAL_CONTENT_SECTIONS])
    setDraggingSectionIndex(null)
    setHiddenMedicationFields({})
    setNarrativeDepth(defaultNarrativeDepth())
  }, [])

  const moveContentSection = (fromIndex: number, toIndex: number) => {
    setContentSectionOrder((previousOrder) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= previousOrder.length || toIndex >= previousOrder.length) {
        return previousOrder
      }
      if (fromIndex === toIndex) return previousOrder
      const nextOrder = [...previousOrder]
      const [movedSection] = nextOrder.splice(fromIndex, 1)
      nextOrder.splice(toIndex, 0, movedSection)
      return nextOrder
    })
  }

  const eliminateSection = useCallback((section: EliminatableSection) => {
    setContentSectionOrder((previous) => previous.filter((s) => s !== section))
    if (section === 'rx') {
      setContent((c) => ({ ...c, rx: [] }))
      setHiddenMedicationFields({})
      return
    }
    setContent((c) => ({ ...c, doctor_notes: '' }))
  }, [])

  const restoreEliminatedSection = useCallback((section: EliminatableSection) => {
    setContentSectionOrder((previous) => insertEliminatableSectionBack(previous, section))
    if (section === 'rx') {
      setContent((c) => ({ ...c, rx: c.rx.length === 0 ? [emptyMedication()] : c.rx }))
    }
  }, [])

  function syncRedFlagsFromContent(c: TemplateContentPayload) {
    setRedFlagsText(c.red_flags.filter(Boolean).join('\n'))
  }

  function syncDataGapsFromContent(c: TemplateContentPayload) {
    setDataGapsText(c.data_gaps.filter(Boolean).join('\n'))
  }

  useEffect(() => {
    if (!isOpen) return
    if (!templateToEdit) {
      resetAll()
      return
    }

    setName(templateToEdit.name || '')
    setDescription(templateToEdit.description || '')
    setTagsInput((templateToEdit.tags || []).join(', '))
    setAppointmentTypes(templateToEdit.appointment_types || [])

    const contentFromTemplate = templateToEdit.content
      ? {
          ...emptyContent(),
          ...templateToEdit.content,
          rx:
            templateToEdit.content.rx && templateToEdit.content.rx.length > 0
              ? templateToEdit.content.rx
              : [emptyMedication()],
          investigations: templateToEdit.content.investigations || [],
        }
      : emptyContent()
    setContent(contentFromTemplate)
    syncRedFlagsFromContent(contentFromTemplate)
    syncDataGapsFromContent(contentFromTemplate)
    setOptionalPreferences(String(contentFromTemplate.optional_preferences || ''))
    setError(null)
    setSaveLoading(false)
    setContentSectionOrder(deriveSectionOrderFromTemplateContent(contentFromTemplate))
    setDraggingSectionIndex(null)
    setHiddenMedicationFields({})
    setNarrativeDepth(deriveNarrativeDepthFromTemplateContent(contentFromTemplate))
  }, [isOpen, resetAll, templateToEdit])

  const hasEditChanges = useMemo(() => {
    if (!templateToEdit) return true
    const currentFingerprint = stableEditFingerprint({
      name,
      description,
      tags: parseTagsInput(tagsInput),
      appointmentTypes,
      content: buildTemplateControlledContent(
        content,
        redFlagsText,
        dataGapsText,
        optionalPreferences,
        contentSectionOrder,
        narrativeDepth,
      ),
    })

    const baselineContent = templateToEdit.content
      ? {
          ...emptyContent(),
          ...templateToEdit.content,
          rx:
            templateToEdit.content.rx && templateToEdit.content.rx.length > 0
              ? templateToEdit.content.rx
              : [emptyMedication()],
          investigations: templateToEdit.content.investigations || [],
        }
      : emptyContent()

    const baselineFingerprint = stableEditFingerprint({
      name: templateToEdit.name || '',
      description: templateToEdit.description || '',
      tags: templateToEdit.tags || [],
      appointmentTypes: templateToEdit.appointment_types || [],
      content: buildTemplateControlledContent(
        baselineContent,
        (baselineContent.red_flags || []).filter(Boolean).join('\n'),
        (baselineContent.data_gaps || []).filter(Boolean).join('\n'),
        String(baselineContent.optional_preferences || ''),
        deriveSectionOrderFromTemplateContent(baselineContent),
        deriveNarrativeDepthFromTemplateContent(baselineContent),
      ),
    })

    return currentFingerprint !== baselineFingerprint
  }, [
    templateToEdit,
    name,
    description,
    tagsInput,
    appointmentTypes,
    content,
    redFlagsText,
    dataGapsText,
    optionalPreferences,
    contentSectionOrder,
    narrativeDepth,
  ])

  const toggleAppointment = (label: string) => {
    setAppointmentTypes((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]))
  }

  const addSectionToOptionalPreferences = (sectionLabel: (typeof QUICK_ADD_SECTIONS)[number]) => {
    setOptionalPreferences((previousValue) => {
      const trimmed = previousValue.trim()
      const line = `${sectionLabel}:`
      if (trimmed.toLowerCase().includes(line.toLowerCase())) return previousValue
      return trimmed ? `${previousValue.replace(/\s*$/, '')}\n${line}` : line
    })
  }

  const submit = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Template name is required.')
      return
    }
    const tags = parseTagsInput(tagsInput)
    const bodyContent = buildTemplateControlledContent(
      content,
      redFlagsText,
      dataGapsText,
      optionalPreferences,
      contentSectionOrder,
      narrativeDepth,
    )
    setSaveLoading(true)
    try {
      if (templateToEdit?.id) {
        await updateClinicalTemplate(templateToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          content: bodyContent,
          tags,
          appointment_types: appointmentTypes,
        })
        onUpdated?.()
      } else {
        await createClinicalTemplate({
          name: name.trim(),
          description: description.trim(),
          type: 'personal',
          category: 'General',
          specialty: '',
          content: bodyContent,
          tags,
          appointment_types: appointmentTypes,
          is_favorite: false,
        })
        onCreated?.()
      }
      onClose()
      resetAll()
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaveLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        type="button"
      />
      <div
        className="relative z-[61] flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#bdcaba] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-template-title"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[#171d16]" id="create-template-title">
              {isEditMode ? 'View or edit clinical template' : 'Create clinical template'}
            </h2>
            <p className="mt-1 text-sm text-[#3e4a3d]">
              Save a reusable template and optionally generate a clinical-note blueprint.
            </p>
          </div>
          <button
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <fieldset className="space-y-4 border-b border-gray-100 pb-6">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#6e7b6c]">Template metadata</legend>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-name">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                id="tmpl-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General OPD scratch template"
                value={name}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-desc">
                Description
              </label>
              <textarea
                className="min-h-[72px] w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                id="tmpl-desc"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="When to use this template…"
                value={description}
              />
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium">Appointment types</span>
              <div className="flex flex-wrap gap-2">
                {APPOINTMENT_OPTIONS.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm hover:bg-[#eff6ea]">
                    <input
                      checked={appointmentTypes.includes(opt)}
                      className="rounded border-gray-300 text-[#006b2c] focus:ring-[#006b2c]"
                      onChange={() => toggleAppointment(opt)}
                      type="checkbox"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="mt-6 space-y-4 border-b border-gray-100 pb-6">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#6e7b6c]">Template content</legend>
            <p className="text-sm text-[#575e70]">
              Drag and drop these sections to adjust the content order. Use “Remove section” on medications or doctor notes
              to drop them from this template; restore them below if needed. For narrative blocks, Brief or Detail will guide
              generated note length once wired to the backend.
            </p>
            <div className="space-y-3">
              {contentSectionOrder.map((section, index) => (
                <div
                  key={section}
                  className={`rounded-xl border bg-[#f9fbf8] p-3 ${
                    draggingSectionIndex === index ? 'border-[#16a34a] ring-2 ring-[#16a34a]/30' : 'border-[#dce5d8]'
                  }`}
                  draggable
                  onDragStart={() => setDraggingSectionIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingSectionIndex === null) return
                    moveContentSection(draggingSectionIndex, index)
                    setDraggingSectionIndex(null)
                  }}
                  onDragEnd={() => setDraggingSectionIndex(null)}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                    <span className="material-symbols-outlined shrink-0 text-[#6e7b6c]">drag_indicator</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-[#171d16]">
                      {section === 'assessment'
                        ? 'Assessment'
                        : section === 'plan'
                          ? 'Plan'
                          : section === 'chief_complaint'
                            ? 'Chief complaint'
                            : section === 'doctor_notes'
                              ? 'Doctor notes'
                              : section === 'rx'
                                ? 'Medications (rx)'
                              : section === 'follow_up_date'
                                ? 'Follow-up date'
                                : section === 'red_flags'
                                  ? 'Red flags'
                                  : section === 'data_gaps'
                                    ? 'Data gaps'
                                    : 'Investigations'}
                    </span>
                    {isNarrativeSection(section) && (
                      <div className="flex shrink-0 items-center gap-4 rounded-lg border border-[#e3ebe0] bg-white/80 px-3 py-1.5 text-xs text-[#3e4a3d]">
                        <label className="flex cursor-pointer items-center gap-1.5 font-medium">
                          <input
                            checked={narrativeDepth[section] === 'brief'}
                            className="rounded border-gray-300 text-[#006b2c] focus:ring-[#006b2c]"
                            onChange={(e) =>
                              setNarrativeDepth((d) => ({ ...d, [section]: e.target.checked ? 'brief' : 'detail' }))
                            }
                            type="checkbox"
                          />
                          Brief
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5 font-medium">
                          <input
                            checked={narrativeDepth[section] === 'detail'}
                            className="rounded border-gray-300 text-[#006b2c] focus:ring-[#006b2c]"
                            onChange={(e) =>
                              setNarrativeDepth((d) => ({ ...d, [section]: e.target.checked ? 'detail' : 'brief' }))
                            }
                            type="checkbox"
                          />
                          Detail
                        </label>
                      </div>
                    )}
                    {isEliminatableSection(section) && (
                      <button
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#575e70] underline-offset-2 hover:bg-[#ecefe9] hover:underline"
                        onClick={() => eliminateSection(section)}
                        type="button"
                      >
                        Remove section
                      </button>
                    )}
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        aria-label={`Move section up`}
                        className="rounded-md border border-[#d3ddd0] p-1.5 text-[#3e4a3d] hover:bg-[#ecf3e8] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() => moveContentSection(index, index - 1)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-base">arrow_upward</span>
                      </button>
                      <button
                        aria-label={`Move section down`}
                        className="rounded-md border border-[#d3ddd0] p-1.5 text-[#3e4a3d] hover:bg-[#ecf3e8] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={index === contentSectionOrder.length - 1}
                        onClick={() => moveContentSection(index, index + 1)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-base">arrow_downward</span>
                      </button>
                    </div>
                  </div>

                  {section === 'investigations' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#575e70]">Manage investigation rows for this template.</p>
                        <button
                          className="text-sm font-semibold text-[#006b2c] hover:underline"
                          onClick={() =>
                            setContent({
                              ...content,
                              investigations: [...content.investigations, emptyInvestigation()],
                            })
                          }
                          type="button"
                        >
                          Add row
                        </button>
                      </div>
                      {content.investigations.length === 0 && (
                        <p className="text-sm text-[#575e70]">No investigations yet. Use “Add row” or apply the blueprint.</p>
                      )}
                      {content.investigations.map((row, idx) => (
                        <div key={`inv-${idx}`} className="rounded-xl border border-gray-100 bg-white p-3">
                          <div className="mb-2 flex justify-end">
                            <button
                              className="text-xs text-red-700 hover:underline"
                              onClick={() =>
                                setContent({
                                  ...content,
                                  investigations: content.investigations.filter((_, i) => i !== idx),
                                })
                              }
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <input
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                                placeholder="test name"
                                value={row.test_name}
                                onChange={(e) => {
                                  const next = [...content.investigations]
                                  next[idx] = { ...next[idx], test_name: e.target.value }
                                  setContent({ ...content, investigations: next })
                                }}
                              />
                            </div>
                            <input
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                              placeholder="urgency"
                              value={row.urgency}
                              onChange={(e) => {
                                const next = [...content.investigations]
                                next[idx] = { ...next[idx], urgency: e.target.value }
                                setContent({ ...content, investigations: next })
                              }}
                            />
                            <input
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                              placeholder="preparation instructions"
                              value={row.preparation_instructions}
                              onChange={(e) => {
                                const next = [...content.investigations]
                                next[idx] = { ...next[idx], preparation_instructions: e.target.value }
                                setContent({ ...content, investigations: next })
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {section === 'rx' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#575e70]">Add medicines for this template.</p>
                        <button
                          className="text-sm font-semibold text-[#006b2c] hover:underline"
                          onClick={() => setContent({ ...content, rx: [...content.rx, emptyMedication()] })}
                          type="button"
                        >
                          Add row
                        </button>
                      </div>
                      {content.rx.map((row, idx) => (
                        <div key={`rx-${idx}`} className="rounded-xl border border-gray-100 bg-white p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(['medicine_name', 'dose', 'frequency', 'duration', 'route', 'food_instruction'] as const).map((k) => (
                              hiddenMedicationFields[`${idx}-${k}`] ? null : (
                                <div key={k} className={k === 'medicine_name' ? 'sm:col-span-2' : ''}>
                                  <label className="sr-only" htmlFor={`rx-${idx}-${k}`}>
                                    {k}
                                  </label>
                                  <div className="relative">
                                    <input
                                      className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
                                        k !== 'medicine_name' ? 'pr-8' : ''
                                      }`}
                                      id={`rx-${idx}-${k}`}
                                      placeholder={k.replace('_', ' ')}
                                      value={row[k]}
                                      onChange={(e) => {
                                        const next = [...content.rx]
                                        next[idx] = { ...next[idx], [k]: e.target.value }
                                        setContent({ ...content, rx: next })
                                      }}
                                    />
                                    {k !== 'medicine_name' && (
                                      <button
                                        aria-label={`Remove ${k.replace('_', ' ')}`}
                                        className="absolute right-1.5 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          const next = [...content.rx]
                                          next[idx] = { ...next[idx], [k]: '' }
                                          setContent({ ...content, rx: next })
                                          setHiddenMedicationFields((previous) => ({ ...previous, [`${idx}-${k}`]: true }))
                                        }}
                                        type="button"
                                      >
                                        <span className="material-symbols-outlined text-sm leading-none">close</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))}
              {(!contentSectionOrder.includes('rx') || !contentSectionOrder.includes('doctor_notes')) && (
                <div className="rounded-xl border border-dashed border-[#bdcaba] bg-[#f6faf4] px-4 py-3 text-sm text-[#575e70]">
                  <p className="mb-2 font-medium text-[#3e4a3d]">Optional sections omitted</p>
                  <p className="mb-3 text-xs">Add them again if this template should include medications or doctor notes.</p>
                  <div className="flex flex-wrap gap-2">
                    {!contentSectionOrder.includes('rx') && (
                      <button
                        className="rounded-lg border border-[#d3ddd0] bg-white px-3 py-2 text-xs font-semibold text-[#006b2c] hover:bg-[#eff6ea]"
                        onClick={() => restoreEliminatedSection('rx')}
                        type="button"
                      >
                        Include medications
                      </button>
                    )}
                    {!contentSectionOrder.includes('doctor_notes') && (
                      <button
                        className="rounded-lg border border-[#d3ddd0] bg-white px-3 py-2 text-xs font-semibold text-[#006b2c] hover:bg-[#eff6ea]"
                        onClick={() => restoreEliminatedSection('doctor_notes')}
                        type="button"
                      >
                        Include doctor notes
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <div className="pb-4">
            <p className="mb-2 text-sm font-medium text-[#171d16]">Quick add sections</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ADD_SECTIONS.map((section) => (
                <button
                  key={section}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#d3ddd0] bg-white px-3 py-1.5 text-xs font-medium text-[#2f3b2f] transition-colors hover:bg-[#eff6ea] active:scale-[0.98]"
                  onClick={() => addSectionToOptionalPreferences(section)}
                  type="button"
                >
                  <span>{section}</span>
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-prefs">
              Optional preferences
            </label>
            <textarea
              className="min-h-[64px] w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              id="tmpl-prefs"
              placeholder="Additional instructions baked into doctor_notes hint…"
              value={optionalPreferences}
              onChange={(e) => setOptionalPreferences(e.target.value)}
            />
          </div>

        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-[#fafcf8] px-6 py-4">
          <button
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[#575e70] hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[#16a34a] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#00873a] disabled:opacity-60"
            disabled={saveLoading || (isEditMode && !hasEditChanges)}
            onClick={() => void submit()}
            type="button"
          >
            {saveLoading ? 'Saving…' : isEditMode ? 'Update template' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}
