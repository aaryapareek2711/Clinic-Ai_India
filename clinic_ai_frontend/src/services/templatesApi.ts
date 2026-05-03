import { apiClient } from '../lib/apiClient'

/** Mirrors `TemplateMedication` in clinic_ai_backend `schemas/templates.py`. */
export type TemplateMedicationPayload = {
  medicine_name: string
  dose: string
  frequency: string
  duration: string
  route: string
  food_instruction: string
}

/** Mirrors `TemplateInvestigation`. */
export type TemplateInvestigationPayload = {
  test_name: string
  urgency: string
  preparation_instructions: string
}

/** Mirrors `TemplateContent`. */
export type TemplateContentPayload = {
  assessment: string
  plan: string
  rx: TemplateMedicationPayload[]
  investigations: TemplateInvestigationPayload[]
  red_flags: string[]
  follow_up_in: string
  follow_up_date: string
  doctor_notes: string
  chief_complaint: string
  data_gaps: string[]
}

/** Mirrors `CreateTemplateRequest`. Practice/community hidden in UI until enabled. */
export type CreateClinicalTemplatePayload = {
  name: string
  description: string
  type: 'personal' | 'practice' | 'community'
  category: string
  specialty: string
  content: TemplateContentPayload
  tags: string[]
  appointment_types: string[]
  is_favorite: boolean
  author_id?: string | null
  author_name?: string | null
}

export type ClinicalNoteBlueprintRequest = {
  doctor_type: string
  language_style: string
  region: string
  optional_preferences?: string | null
}

function medicationFromUnknown(row: unknown): TemplateMedicationPayload {
  const r = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {}
  const s = (k: string) => String(r[k] ?? '')
  return {
    medicine_name: s('medicine_name'),
    dose: s('dose'),
    frequency: s('frequency'),
    duration: s('duration'),
    route: s('route'),
    food_instruction: s('food_instruction'),
  }
}

function investigationFromUnknown(row: unknown): TemplateInvestigationPayload {
  const r = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {}
  const s = (k: string) => String(r[k] ?? '')
  const prep = s('preparation_instructions')
  const routing = s('routing_note')
  const combined = routing && routing !== '' ? `${prep}${prep ? ' | ' : ''}${routing}` : prep
  return {
    test_name: s('test_name'),
    urgency: s('urgency'),
    preparation_instructions: combined,
  }
}

/** POST /api/notes/clinical-note-template — returns blueprint matching India note shape. */
export async function fetchClinicalNoteBlueprint(
  body: ClinicalNoteBlueprintRequest,
): Promise<TemplateContentPayload> {
  const { data } = await apiClient.post<Record<string, unknown>>('/api/notes/clinical-note-template', {
    doctor_type: body.doctor_type,
    language_style: body.language_style,
    region: body.region,
    optional_preferences: body.optional_preferences ?? null,
  })

  const rxRaw = Array.isArray(data.rx) ? data.rx : []
  const invRaw = Array.isArray(data.investigations) ? data.investigations : []

  const redRaw = Array.isArray(data.red_flags) ? data.red_flags : []
  const gapRaw = Array.isArray(data.data_gaps) ? data.data_gaps : []

  return {
    chief_complaint: String(data.chief_complaint ?? ''),
    assessment: String(data.assessment ?? ''),
    plan: String(data.plan ?? ''),
    doctor_notes: String(data.doctor_notes ?? ''),
    follow_up_in: String(data.follow_up_in ?? ''),
    follow_up_date: String(data.follow_up_date ?? ''),
    rx: rxRaw.map(medicationFromUnknown),
    investigations: invRaw.map(investigationFromUnknown),
    red_flags: redRaw.map((x) => String(x)),
    data_gaps: gapRaw.map((x) => String(x)),
  }
}

export async function createClinicalTemplate(payload: CreateClinicalTemplatePayload): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string } & Record<string, unknown>>('/api/templates', payload)
  return { id: String(data.id) }
}
