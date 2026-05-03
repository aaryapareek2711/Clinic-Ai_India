import { apiClient } from '../lib/apiClient'

export type PatientSummary = {
  id: string
  patient_id: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string
  mrn: string
  age?: number | null
  gender?: string | null
  phone_number?: string | null
  latest_visit_id?: string | null
  latest_visit_scheduled_start?: string | null
}

export type PatientVisit = {
  id: string
  visit_id: string
  patient_id: string
  status: string
  scheduled_start?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export async function fetchPatients(): Promise<PatientSummary[]> {
  const { data } = await apiClient.get<PatientSummary[]>('/api/patients')
  return data
}

export async function fetchPatientVisits(patientId: string): Promise<PatientVisit[]> {
  const { data } = await apiClient.get<PatientVisit[]>(`/api/visits/patient/${encodeURIComponent(patientId)}`)
  return data
}

export type RegisterPatientPayload = {
  name: string
  phone_number: string
  age: number
  gender: string
  preferred_language: string
  travelled_recently: boolean
  consent: boolean
  workflow_type?: string | null
  country?: string | null
  emergency_contact?: string | null
  address?: string | null
  appointment_date?: string | null
  appointment_time?: string | null
  visit_type?: string | null
}

export type RegisterPatientResponse = {
  patient_id: string
  visit_id: string
  whatsapp_triggered: boolean
  existing_patient: boolean
  pending_schedule_for_intake: boolean
}

export async function registerPatient(payload: RegisterPatientPayload): Promise<RegisterPatientResponse> {
  const { data } = await apiClient.post<RegisterPatientResponse>('/api/patients/register', payload)
  return data
}

export type CreateVisitFromPatientPayload = {
  provider_id?: string | null
  scheduled_start?: string | null
}

export type CreateVisitFromPatientResponse = {
  patient_id: string
  visit_id: string
  status: string
  scheduled_start?: string | null
  intake_triggered: boolean
  pending_schedule_for_intake: boolean
}

export async function createVisitFromPatient(
  patientId: string,
  body: CreateVisitFromPatientPayload,
): Promise<CreateVisitFromPatientResponse> {
  const { data } = await apiClient.post<CreateVisitFromPatientResponse>(
    `/api/patients/${encodeURIComponent(patientId)}/visits`,
    body,
  )
  return data
}
