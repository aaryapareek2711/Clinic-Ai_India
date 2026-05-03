import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../lib/apiClient'
import {
  createClinicalTemplate,
  fetchClinicalNoteBlueprint,
  type TemplateContentPayload,
  type TemplateInvestigationPayload,
  type TemplateMedicationPayload,
} from '../services/templatesApi'

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
})

const APPOINTMENT_OPTIONS = ['Consultation', 'Follow-up', 'Procedure', 'Telehealth']

type Props = {
  isOpen: boolean
  onClose: () => void
  /** Called after a successful POST /api/templates */
  onCreated?: () => void
}

export default function CreateTemplateModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [specialty, setSpecialty] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([])
  const [content, setContent] = useState<TemplateContentPayload>(emptyContent)
  const [blueprintDoctorType, setBlueprintDoctorType] = useState('Allopathic')
  const [languageStyle, setLanguageStyle] = useState('English clinical')
  const [region, setRegion] = useState('India OPD')
  const [optionalPreferences, setOptionalPreferences] = useState('')
  const [redFlagsText, setRedFlagsText] = useState('')
  const [dataGapsText, setDataGapsText] = useState('')
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setCategory('General')
    setSpecialty('')
    setTagsInput('')
    setAppointmentTypes([])
    setContent(emptyContent())
    setBlueprintDoctorType('Allopathic')
    setLanguageStyle('English clinical')
    setRegion('India OPD')
    setOptionalPreferences('')
    setRedFlagsText('')
    setDataGapsText('')
    setError(null)
    setBlueprintLoading(false)
    setSaveLoading(false)
  }, [])

  function syncRedFlagsFromContent(c: TemplateContentPayload) {
    setRedFlagsText(c.red_flags.filter(Boolean).join('\n'))
  }

  function syncDataGapsFromContent(c: TemplateContentPayload) {
    setDataGapsText(c.data_gaps.filter(Boolean).join('\n'))
  }

  useEffect(() => {
    if (isOpen) resetAll()
  }, [isOpen, resetAll])

  const toggleAppointment = (label: string) => {
    setAppointmentTypes((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]))
  }

  const applyBlueprint = async () => {
    setError(null)
    setBlueprintLoading(true)
    try {
      const c = await fetchClinicalNoteBlueprint({
        doctor_type: blueprintDoctorType,
        language_style: languageStyle,
        region,
        optional_preferences: optionalPreferences.trim() || null,
      })
      setContent(c)
      syncRedFlagsFromContent(c)
      syncDataGapsFromContent(c)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setBlueprintLoading(false)
    }
  }

  const submit = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Template name is required.')
      return
    }
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
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const bodyContent: TemplateContentPayload = {
      ...content,
      rx: rx.length > 0 ? rx : [],
      investigations,
      red_flags: rf,
      data_gaps: dg,
    }
    setSaveLoading(true)
    try {
      await createClinicalTemplate({
        name: name.trim(),
        description: description.trim(),
        type: 'personal',
        category: category.trim() || 'General',
        specialty: specialty.trim(),
        content: bodyContent,
        tags,
        appointment_types: appointmentTypes,
        is_favorite: false,
      })
      onCreated?.()
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
              Create clinical template
            </h2>
            <p className="mt-1 text-sm text-[#3e4a3d]">
              Matches{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">POST /api/templates</code> and optional
              blueprint from{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">POST /api/notes/clinical-note-template</code>.
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-cat">
                  Category
                </label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id="tmpl-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="General">General</option>
                  <option value="OPD">OPD</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Chronic care">Chronic care</option>
                  <option value="Procedure">Procedure</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-spec">
                  Specialty
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id="tmpl-spec"
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. General medicine"
                  value={specialty}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-tags">
                Tags (comma-separated)
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                id="tmpl-tags"
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="opd, india, hindi"
                value={tagsInput}
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
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#6e7b6c]">
              Suggested structure (clinical note blueprint)
            </legend>
            <p className="text-sm text-[#575e70]">
              Uses the same inputs as{' '}
              <code className="rounded bg-gray-100 px-1 text-[11px]">ClinicalNoteTemplateRequest</code> on the backend.
              Applying fills placeholders you can edit below.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-dr-type">
                  Doctor type
                </label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id="tmpl-dr-type"
                  value={blueprintDoctorType}
                  onChange={(e) => setBlueprintDoctorType(e.target.value)}
                >
                  <option value="Allopathic">Allopathic</option>
                  <option value="Ayurvedic">Ayurvedic</option>
                  <option value="Homeopathic">Homeopathic</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-style">
                  Language style
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id="tmpl-style"
                  value={languageStyle}
                  onChange={(e) => setLanguageStyle(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="tmpl-region">
                Region
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                id="tmpl-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
            <div>
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
            <button
              className="rounded-xl border border-[#006b2c] bg-[#eff6ea] px-4 py-2.5 text-sm font-semibold text-[#006b2c] hover:bg-[#dfead5] disabled:opacity-60"
              disabled={blueprintLoading}
              onClick={() => void applyBlueprint()}
              type="button"
            >
              {blueprintLoading ? 'Applying…' : 'Apply suggested structure'}
            </button>
          </fieldset>

          <fieldset className="mt-6 space-y-4 border-b border-gray-100 pb-6">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#6e7b6c]">Template content</legend>
            {(
              [
                ['chief_complaint', 'Chief complaint', 'chief_complaint'],
                ['assessment', 'Assessment', 'assessment'],
                ['plan', 'Plan', 'plan'],
                ['doctor_notes', 'Doctor notes', 'doctor_notes'],
              ] as const
            ).map(([id, label, key]) => (
              <div key={id}>
                <label className="mb-1 block text-sm font-medium" htmlFor={id}>
                  {label}
                </label>
                <textarea
                  className="min-h-[72px] w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id={id}
                  value={content[key]}
                  onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="fu-in">
                  Follow-up in
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id="fu-in"
                  value={content.follow_up_in}
                  onChange={(e) => setContent({ ...content, follow_up_in: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="fu-date">
                  Follow-up date
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  id="fu-date"
                  value={content.follow_up_date}
                  onChange={(e) => setContent({ ...content, follow_up_date: e.target.value })}
                  placeholder="<yyyy-mm-dd_or_null>"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="red-flags">
                Red flags (one per line → list)
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                id="red-flags"
                value={redFlagsText}
                onChange={(e) => setRedFlagsText(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="data-gaps">
                Data gaps (one per line → list)
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                id="data-gaps"
                value={dataGapsText}
                onChange={(e) => setDataGapsText(e.target.value)}
              />
            </div>
          </fieldset>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#171d16]">Medications (rx)</h3>
              <button
                className="text-sm font-semibold text-[#006b2c] hover:underline"
                onClick={() => setContent({ ...content, rx: [...content.rx, emptyMedication()] })}
                type="button"
              >
                Add row
              </button>
            </div>
            <div className="space-y-3">
              {content.rx.map((row, idx) => (
                <div key={`rx-${idx}`} className="rounded-xl border border-gray-100 bg-[#fafcf8] p-3">
                  <div className="mb-2 flex justify-end">
                    {content.rx.length > 1 && (
                      <button
                        className="text-xs text-red-700 hover:underline"
                        onClick={() =>
                          setContent({
                            ...content,
                            rx: content.rx.filter((_, i) => i !== idx),
                          })
                        }
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(['medicine_name', 'dose', 'frequency', 'duration', 'route', 'food_instruction'] as const).map((k) => (
                      <div key={k} className={k === 'medicine_name' ? 'sm:col-span-2' : ''}>
                        <label className="sr-only" htmlFor={`rx-${idx}-${k}`}>
                          {k}
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                          id={`rx-${idx}-${k}`}
                          placeholder={k.replace('_', ' ')}
                          value={row[k]}
                          onChange={(e) => {
                            const next = [...content.rx]
                            next[idx] = { ...next[idx], [k]: e.target.value }
                            setContent({ ...content, rx: next })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#171d16]">Investigations</h3>
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
            <div className="space-y-3">
              {content.investigations.length === 0 && (
                <p className="text-sm text-[#575e70]">No investigations yet. Use “Add row” or apply the blueprint.</p>
              )}
              {content.investigations.map((row, idx) => (
                <div key={`inv-${idx}`} className="rounded-xl border border-gray-100 bg-[#fafcf8] p-3">
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
            disabled={saveLoading}
            onClick={() => void submit()}
            type="button"
          >
            {saveLoading ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}
