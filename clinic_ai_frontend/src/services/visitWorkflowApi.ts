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

export type VisitWorkspaceSummaryResponse = {
  visit: VisitDetailResponse
  intake_session: IntakeSessionResponse | null
  pre_visit_summary: PreVisitSummaryResponse | null
  latest_vitals_form?: VitalsFormResponse | null
  latest_vitals?: LatestVitalsResponse | null
  clinical_note?: ClinicalNoteLatest | null
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
  language?: string | null
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
  additional_doctor_note?: string | null
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
  /** From patients.created_at — not visit created time. */
  patient_created_at?: string | null
  /** Most recent known visit datetime for this patient. */
  patient_last_visit_at?: string | null
  visit_type?: string
  status: string
  previous_workflow_stage?: string | null
  current_workflow_stage?: string | null
  next_workflow_stage?: string | null
  scheduled_start?: string | null
  actual_start?: string | null
  actual_end?: string | null
  duration_minutes?: number | null
  chief_complaint?: string | null
  intake_status?: string | null
  intake_question_count?: number | null
  intake_last_updated_at?: string | null
  /** From visit.transcription_session — drives Kanban when workflow stage lags upload. */
  transcription_status?: string | null
  created_at?: string
  updated_at?: string
}

export type PagedVisitResponse = {
  items: ProviderVisitListItem[]
  total: number
  page: number
  page_size: number
}

export type CarePrepItem = {
  visit_id: string
  patient_id: string
  patient_name: string
  mobile_number?: string | null
  patient_created_at?: string | null
  patient_last_visit_at?: string | null
  scheduled_start?: string | null
  intake_status: string
  intake_question_count: number
  touched_at?: string | null
  status_kind: 'ready' | 'progress'
}

export type CarePrepResponse = {
  items: CarePrepItem[]
  total: number
  page: number
  page_size: number
}

export const DEFAULT_PROVIDER_ID =
  (import.meta.env.VITE_PROVIDER_ID as string | undefined)?.trim() || 'default'

export async function fetchProviderVisits(providerId: string): Promise<ProviderVisitListItem[]> {
  const { data } = await apiClient.get<ProviderVisitListItem[]>(
    `/api/visits/provider/${encodeURIComponent(providerId)}`,
  )
  return data
}

export async function fetchProviderVisitsPaged(
  providerId: string,
  opts: {
    page: number
    pageSize: number
    statusFilter?: string
    search?: string
    sort?:
      | 'patient_newest'
      | 'patient_oldest'
      | 'visit_latest'
      | 'visit_oldest'
      | 'time_newest'
      | 'time_oldest'
      | 'name_az'
      | 'name_za'
      | 'visit_id'
  },
): Promise<PagedVisitResponse> {
  const { data } = await apiClient.get<PagedVisitResponse>(
    `/api/visits/provider/${encodeURIComponent(providerId)}/paged`,
    {
      params: {
        page: opts.page,
        page_size: opts.pageSize,
        status_filter: opts.statusFilter || undefined,
        search: opts.search || undefined,
        sort: opts.sort || 'patient_newest',
      },
    },
  )
  return data
}

export async function fetchProviderCarePrep(
  providerId: string,
  opts: {
    page: number
    pageSize: number
    filter?: 'all' | 'ready' | 'in_progress'
    search?: string
    sort?:
      | 'patient_newest'
      | 'patient_oldest'
      | 'visit_latest'
      | 'visit_oldest'
      | 'time_newest'
      | 'time_oldest'
      | 'name_az'
      | 'name_za'
      | 'visit_id'
  },
): Promise<CarePrepResponse> {
  const { data } = await apiClient.get<CarePrepResponse>(
    `/api/visits/provider/${encodeURIComponent(providerId)}/careprep`,
    {
      params: {
        page: opts.page,
        page_size: opts.pageSize,
        filter: opts.filter || 'all',
        search: opts.search || undefined,
        sort: opts.sort || 'patient_newest',
      },
    },
  )
  return data
}

/** Scheduled board-style appointments from GET /api/visits/provider/{id}/upcoming */
export type ProviderUpcomingAppointment = {
  appointment_id: string
  patient_id: string
  patient_name: string
  /** Enriched from visit list when available — used for display id (name_mobile). */
  mobile_number?: string | null
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

export async function fetchProviderUpcoming(
  providerId: string,
  opts?: { fromDate?: string; toDate?: string },
): Promise<ProviderUpcomingAppointment[]> {
  const params: Record<string, string> = {}
  if (opts?.fromDate?.trim()) params.from_date = opts.fromDate.trim()
  if (opts?.toDate?.trim()) params.to_date = opts.toDate.trim()
  const { data } = await apiClient.get<ProviderUpcomingResponse>(
    `/api/visits/provider/${encodeURIComponent(providerId)}/upcoming`,
    { params },
  )
  return data.appointments ?? []
}

export async function fetchVisitDetail(visitId: string): Promise<VisitDetailResponse> {
  const { data } = await apiClient.get<VisitDetailResponse>(`/api/visits/${encodeURIComponent(visitId)}`)
  return data
}

export async function fetchVisitWorkspaceSummary(visitId: string): Promise<VisitWorkspaceSummaryResponse> {
  const { data } = await apiClient.get<VisitWorkspaceSummaryResponse>(
    `/api/visits/${encodeURIComponent(visitId)}/summary`,
  )
  return data
}

export async function scheduleVisitIntake(
  visitId: string,
  payload: { appointment_date: string; appointment_time: string },
): Promise<{ visit_id: string; patient_id: string; scheduled_start: string; whatsapp_triggered: boolean }> {
  const { data } = await apiClient.post<{
    visit_id: string
    patient_id: string
    scheduled_start: string
    whatsapp_triggered: boolean
  }>(`/api/visits/${encodeURIComponent(visitId)}/schedule-intake`, payload)
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

export async function savePreVisitAdditionalDoctorNote(
  patientId: string,
  visitId: string,
  note: string | null,
): Promise<PreVisitSummaryResponse> {
  const { data } = await apiClient.patch<PreVisitSummaryResponse>(
    `/api/workflow/pre-visit-summary/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}/additional-doctor-note`,
    { note },
  )
  return data
}

/** India OPD clinical note payload — matches backend `IndiaClinicalNotePayload`. */
export type IndiaClinicalMedicationItem = {
  medicine_name: string
  dose: string
  frequency: string
  duration: string
  route: string
  food_instruction: string
  generic_available?: boolean | null
}

export type IndiaClinicalInvestigationItem = {
  test_name: string
  urgency: string
  preparation_instructions?: string | null
  routing_note?: string | null
}

export type IndiaClinicalNotePayload = {
  assessment: string
  plan: string
  rx: IndiaClinicalMedicationItem[]
  investigations: IndiaClinicalInvestigationItem[]
  red_flags: string[]
  follow_up_in?: string | null
  follow_up_date?: string | null
  follow_up_time?: string | null
  doctor_notes?: string | null
  chief_complaint?: string | null
  data_gaps: string[]
}

/** Latest or freshly generated clinical note — aligns with `NoteGenerateResponse`. */
export type ClinicalNoteLatest = {
  note_id: string
  patient_id?: string
  visit_id?: string | null
  note_type?: string
  source_job_id?: string | null
  status?: string
  version?: number
  created_at: string
  payload?: IndiaClinicalNotePayload | Record<string, unknown>
  whatsapp_payload?: string | null
}

export type ClinicalNoteGenerateOptions = {
  transcription_job_id?: string
  /** ISO date YYYY-MM-DD — when set, backend stores follow-up and may force regenerate. */
  follow_up_date?: string
  follow_up_time?: string
  template_id?: string
  force_regenerate?: boolean
  note_type?: 'india_clinical' | 'soap' | 'post_visit_summary'
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
  error_message?: string | null
  transcript_available?: boolean
  word_count?: number | null
  duration?: number | null
  audio_duration_seconds?: number | null
}

/** Full transcript when ready; backend returns HTTP 202 while still processing */
export type TranscriptionDialogueResponse = {
  audio_file_path?: string | null
  transcript?: string | null
  transcription_status: string
  started_at?: string | null
  completed_at?: string | null
  error_message?: string | null
  audio_duration_seconds?: number | null
  word_count?: number | null
  structured_dialogue?: Array<Record<string, unknown>> | null
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
    throw new Error(getApiErrorMessage(err), { cause: err })
  }
}

/** POST /api/notes/clinical-note — generate and persist default clinical note for the visit. */
export async function generateClinicalNote(
  patientId: string,
  visitId: string,
  options?: ClinicalNoteGenerateOptions,
): Promise<ClinicalNoteLatest> {
  const body: Record<string, string | boolean | undefined> = {
    patient_id: patientId,
    visit_id: visitId,
  }
  if (options?.transcription_job_id?.trim()) body.transcription_job_id = options.transcription_job_id.trim()
  if (options?.follow_up_date?.trim()) body.follow_up_date = options.follow_up_date.trim()
  if (options?.follow_up_time?.trim()) body.follow_up_time = options.follow_up_time.trim()
  if (options?.template_id?.trim()) body.template_id = options.template_id.trim()
  if (options?.force_regenerate) body.force_regenerate = true
  if (options?.note_type) body.note_type = options.note_type
  const { data } = await apiClient.post<ClinicalNoteLatest>('/api/notes/clinical-note', body)
  return data
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
  languageMix: string = 'auto',
): Promise<TranscriptionUploadAccepted> {
  const formData = new FormData()
  formData.set('patient_id', patientId)
  formData.set('visit_id', visitId)
  formData.set('audio_file', file)
  formData.set('language_mix', languageMix || 'auto')
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

/** POST /api/notes/{patient_id}/visits/{visit_id}/dialogue/structure — LLM Doctor/Patient turns from raw transcript */
export async function structureVisitDialogue(
  patientId: string,
  visitId: string,
): Promise<Array<Record<string, string>>> {
  const { data } = await apiClient.post<{ dialogue: Array<Record<string, string>>; message?: string }>(
    `/api/notes/${encodeURIComponent(patientId)}/visits/${encodeURIComponent(visitId)}/dialogue/structure`,
  )
  return Array.isArray(data.dialogue) ? data.dialogue : []
}

/** GET /api/notes/{patient_id}/visits/{visit_id}/dialogue — 202 while queued/processing */
export async function fetchVisitTranscriptionDialogue(
  patientId: string,
  visitId: string,
): Promise<TranscriptionDialogueResponse | null> {
  try {
    const res = await apiClient.get<TranscriptionDialogueResponse>(
      `/api/notes/${encodeURIComponent(patientId)}/visits/${encodeURIComponent(visitId)}/dialogue`,
      { validateStatus: (status) => status === 200 || status === 202 },
    )
    if (res.status === 202) return null
    return res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 202) return null
    throw new Error(getApiErrorMessage(err), { cause: err })
  }
}

export async function translateDisplayPayload<T extends Record<string, unknown>>(
  payload: T,
  targetLanguage = 'English',
): Promise<T> {
  const { data } = await apiClient.post<{ payload: T }>('/api/notes/translate-display', {
    payload,
    target_language: targetLanguage,
  })
  return data.payload
}

export type PostVisitPatientLanguage = 'hi' | 'en' | 'hi-eng'

export async function generatePostVisitSummary(
  patientId: string,
  visitId: string,
  options?: {
    preferred_language?: PostVisitPatientLanguage
    follow_up_in?: string
    follow_up_date?: string
    follow_up_time?: string
  },
): Promise<PostVisitSummaryResponse> {
  const body: Record<string, string> = {
    patient_id: patientId,
    visit_id: visitId,
  }
  if (options?.preferred_language) body.preferred_language = options.preferred_language
  if (options?.follow_up_in?.trim()) body.follow_up_in = options.follow_up_in.trim()
  if (options?.follow_up_date?.trim()) body.follow_up_date = options.follow_up_date.trim()
  if (options?.follow_up_time?.trim()) body.follow_up_time = options.follow_up_time.trim()
  const { data } = await apiClient.post<PostVisitSummaryResponse>('/api/notes/post-visit-summary', {
    ...body,
  })
  return data
}

export async function fetchLatestPostVisitSummary(
  patientId: string,
  visitId: string,
): Promise<PostVisitSummaryResponse | null> {
  try {
    const { data } = await apiClient.get<PostVisitSummaryResponse>('/api/notes/post-visit-summary', {
      params: {
        patient_id: patientId,
        visit_id: visitId,
      },
    })
    return data
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw new Error(getApiErrorMessage(err), { cause: err })
  }
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

export type LabRecordPublic = {
  record_id: string
  visit_id: string
  patient_id: string
  source: string
  status: string
  raw_text: string
  ocr_text?: string
  image_count: number
  extracted_values?: unknown[]
  flags?: unknown[]
  created_at?: string | null
  updated_at?: string | null
}

/** Typed lab line item (no images) — POST /api/follow-through/lab-records */
export async function createLabRecordText(
  visitId: string,
  rawText: string,
  source = 'provider_portal',
): Promise<LabRecordPublic> {
  const { data } = await apiClient.post<LabRecordPublic>('/api/follow-through/lab-records', {
    visit_id: visitId,
    source: source.slice(0, 50),
    raw_text: rawText.trim(),
  })
  return data
}

/** Images (+ optional caption) — POST /api/follow-through/lab-records/with-images */
export async function uploadLabRecordWithImages(
  visitId: string,
  options: { rawText?: string; source?: string; imageFiles: File[] },
): Promise<LabRecordPublic> {
  const formData = new FormData()
  formData.set('visit_id', visitId)
  formData.set('source', (options.source?.trim() || 'provider_portal').slice(0, 50))
  formData.set('raw_text', options.rawText?.trim() ?? '')
  for (const file of options.imageFiles) {
    formData.append('image_files', file)
  }
  const { data } = await apiClient.post<LabRecordPublic>('/api/follow-through/lab-records/with-images', formData)
  return data
}
