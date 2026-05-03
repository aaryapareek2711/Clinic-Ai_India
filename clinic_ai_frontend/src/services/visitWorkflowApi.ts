import axios from 'axios'

import { apiClient, getApiErrorMessage } from '../lib/apiClient'

export type VisitDetailResponse = {
  id: string
  visit_id?: string
  patient_id: string
  visit_type?: string
  status?: string
  chief_complaint?: string | null
  scheduled_start?: string | null
  patient?: {
    id: string
    first_name?: string
    last_name?: string
    date_of_birth?: string
    gender?: string
    phone_number?: string | null
  }
}

export type IntakeQaItem = {
  question: string
  answer: string
  topic?: string | null
  asked_at?: string | null
  answered_at?: string | null
}

export type IntakeSessionResponse = {
  visit_id: string
  patient_id?: string
  status: string
  illness?: string | null
  question_answers: IntakeQaItem[]
  updated_at?: string | null
}

export type PreVisitSections = {
  chief_complaint: {
    reason_for_visit: string
    symptom_duration_or_onset: string
  }
  hpi: {
    associated_symptoms: string[]
    symptom_severity_or_progression: string
    impact_on_daily_life: string
  }
  current_medication: {
    medications_or_home_remedies: string
  }
  past_medical_history_allergies: {
    past_medical_history: string
    allergies: string
  }
  red_flag_indicators: string[]
}

export type PreVisitSummaryResponse = {
  patient_id: string
  visit_id?: string | null
  intake_session_id: string
  language: string
  status: string
  sections: PreVisitSections
}

/** Workspace list from GET /api/visits/provider/{provider_id} */
export type ProviderVisitListItem = {
  id: string
  visit_id: string
  patient_id: string
  patient_name: string
  mobile_number?: string | null
  visit_type?: string
  status: string
  scheduled_start?: string | null
  actual_start?: string | null
  actual_end?: string | null
  duration_minutes?: number | null
  chief_complaint?: string | null
  created_at?: string
}

export const DEFAULT_PROVIDER_ID =
  (import.meta.env.VITE_PROVIDER_ID as string | undefined)?.trim() || 'default'

export async function fetchProviderVisits(providerId: string): Promise<ProviderVisitListItem[]> {
  const { data } = await apiClient.get<ProviderVisitListItem[]>(
    `/api/visits/provider/${encodeURIComponent(providerId)}`,
  )
  return data
}

/** Scheduled board-style appointments from GET /api/visits/provider/{id}/upcoming */
export type ProviderUpcomingAppointment = {
  appointment_id: string
  patient_id: string
  patient_name: string
  scheduled_start: string
  chief_complaint: string
  appointment_type: string
  previsit_completed: boolean
  visit_id: string
  status: string
}

export type ProviderUpcomingResponse = {
  appointments: ProviderUpcomingAppointment[]
}

export async function fetchProviderUpcoming(providerId: string): Promise<ProviderUpcomingAppointment[]> {
  const { data } = await apiClient.get<ProviderUpcomingResponse>(
    `/api/visits/provider/${encodeURIComponent(providerId)}/upcoming`,
  )
  return data.appointments ?? []
}

export async function fetchVisitDetail(visitId: string): Promise<VisitDetailResponse> {
  const { data } = await apiClient.get<VisitDetailResponse>(`/api/visits/${encodeURIComponent(visitId)}`)
  return data
}

export async function fetchIntakeSession(visitId: string): Promise<IntakeSessionResponse> {
  const { data } = await apiClient.get<IntakeSessionResponse>(
    `/api/visits/${encodeURIComponent(visitId)}/intake-session`,
  )
  return data
}

export async function fetchPreVisitSummary(
  patientId: string,
  visitId: string,
): Promise<PreVisitSummaryResponse | null> {
  try {
    const { data } = await apiClient.get<PreVisitSummaryResponse>(
      `/api/workflow/pre-visit-summary/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}`,
    )
    return data
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw new Error(getApiErrorMessage(err), { cause: err })
  }
}

export async function generatePreVisitSummary(
  patientId: string,
  visitId: string,
): Promise<PreVisitSummaryResponse> {
  const { data } = await apiClient.post<PreVisitSummaryResponse>(
    `/api/workflow/pre-visit-summary/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}`,
  )
  return data
}

/** Latest persisted India-style clinical note (OPD); 404 → null */
export type ClinicalNoteLatest = {
  note_id: string
  created_at: string
  payload?: {
    assessment?: string
    plan?: string
    rx?: Array<{
      medicine_name?: string
      dose?: string
      frequency?: string
      duration?: string
    }>
    red_flags?: string[]
  }
}

export type VitalsField = {
  key: string
  label: string
  field_type: string
  unit?: string | null
  required: boolean
  reason: string
}

export type VitalsFormResponse = {
  form_id: string
  patient_id: string
  visit_id?: string | null
  needs_vitals: boolean
  reason: string
  fields: VitalsField[]
  generated_at: string
}

export type VitalsSubmitValue = {
  key: string
  value: string | number | boolean | null
}

export type VitalsSubmitResponse = {
  vitals_id: string
  patient_id: string
  visit_id?: string | null
  submitted_at: string
}

export type TranscriptionUploadAccepted = {
  job_id: string
  patient_id: string
  visit_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message?: string | null
}

export type TranscriptionStatusResponse = {
  status: string
  message?: string | null
  error?: string | null
}

export type PostVisitSummaryPayload = {
  visit_reason?: string
  what_doctor_found?: string
  medicines_to_take?: string[]
  tests_recommended?: string[]
  self_care?: string[]
  warning_signs?: string[]
  follow_up?: string
  next_visit_date?: string | null
}

export type PostVisitSummaryResponse = {
  note_id: string
  patient_id: string
  visit_id?: string | null
  note_type: string
  payload: PostVisitSummaryPayload
  whatsapp_payload?: string | null
}

export type PostVisitWhatsAppSendResponse = {
  patient_id: string
  visit_id: string
  summary_template_sent: boolean
  follow_up_template_sent: boolean
  message: string
}

export async function fetchLatestClinicalNote(
  patientId: string,
  visitId: string,
): Promise<ClinicalNoteLatest | null> {
  try {
    const { data } = await apiClient.get<ClinicalNoteLatest>('/api/notes/clinical-note', {
      params: {
        patient_id: patientId,
        visit_id: visitId,
      },
    })
    return data
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    return null
  }
}

export async function generateVitalsForm(patientId: string, visitId: string): Promise<VitalsFormResponse> {
  const { data } = await apiClient.post<VitalsFormResponse>(
    `/api/vitals/generate-form/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}`,
  )
  return data
}

export async function submitVitals(
  patientId: string,
  visitId: string,
  formId: string | null,
  staffName: string,
  values: VitalsSubmitValue[],
): Promise<VitalsSubmitResponse> {
  const { data } = await apiClient.post<VitalsSubmitResponse>('/api/vitals/submit', {
    patient_id: patientId,
    visit_id: visitId,
    form_id: formId,
    staff_name: staffName,
    values,
  })
  return data
}

export type LatestVitalsResponse = {
  vitals_id: string
  patient_id: string
  visit_id?: string | null
  form_id?: string | null
  staff_name: string
  submitted_at: string
  values: Record<string, string | number | boolean | null>
}

/** Latest persisted vitals; 404 → null */
export async function fetchLatestVitalsForVisit(
  patientId: string,
  visitId: string,
): Promise<LatestVitalsResponse | null> {
  try {
    const { data } = await apiClient.get<LatestVitalsResponse>(
      `/api/vitals/latest/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}`,
    )
    return data
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    return null
  }
}

export async function uploadTranscriptionAudio(
  patientId: string,
  visitId: string,
  file: File,
): Promise<TranscriptionUploadAccepted> {
  const formData = new FormData()
  formData.set('patient_id', patientId)
  formData.set('visit_id', visitId)
  formData.set('audio_file', file)
  formData.set('language_mix', 'en')
  formData.set('speaker_mode', 'two_speakers')
  const { data } = await apiClient.post<TranscriptionUploadAccepted>('/api/notes/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchTranscriptionStatus(
  patientId: string,
  visitId: string,
): Promise<TranscriptionStatusResponse> {
  const { data } = await apiClient.get<TranscriptionStatusResponse>(
    `/api/notes/transcribe/status/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}`,
  )
  return data
}

export type PostVisitPatientLanguage = 'hi' | 'en' | 'hi-eng'

export async function generatePostVisitSummary(
  patientId: string,
  visitId: string,
  options?: { preferred_language?: PostVisitPatientLanguage },
): Promise<PostVisitSummaryResponse> {
  const { data } = await apiClient.post<PostVisitSummaryResponse>('/api/notes/post-visit-summary', {
    patient_id: patientId,
    visit_id: visitId,
    ...(options?.preferred_language ? { preferred_language: options.preferred_language } : {}),
  })
  return data
}

export async function sendPostVisitSummaryWhatsApp(
  patientId: string,
  visitId: string,
  options?: { phone_number?: string; preferred_language?: PostVisitPatientLanguage },
): Promise<PostVisitWhatsAppSendResponse> {
  const body: Record<string, string> = {
    patient_id: patientId,
    visit_id: visitId,
  }
  if (options?.phone_number?.trim()) body.phone_number = options.phone_number.trim()
  if (options?.preferred_language) body.preferred_language = options.preferred_language
  const { data } = await apiClient.post<PostVisitWhatsAppSendResponse>(
    '/api/notes/post-visit-summary/send-whatsapp',
    body,
  )
  return data
}
