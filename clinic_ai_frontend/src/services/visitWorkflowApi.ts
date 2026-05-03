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
    throw new Error(getApiErrorMessage(err))
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
