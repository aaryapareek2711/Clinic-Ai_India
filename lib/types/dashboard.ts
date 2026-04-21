/**
 * Dashboard type definitions
 */

import type { User } from "@/lib/auth/middleware";

// =================================
// Patient Dashboard Types
// =================================

export interface Appointment {
  id: string;
  providerName: string;
  specialty: string;
  date: Date;
  type: 'Virtual' | 'In-Person';
}

export interface PreVisitTask {
  id: string;
  text: string;
  completed: boolean;
  link: string;
  order: number;
}

export interface SecureMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  timestamp: string;
  read: boolean;
}

// =================================
// Provider Dashboard Types
// =================================

export type CareprepStatus = 'not_sent' | 'pending' | 'completed';

export interface ScheduledAppointment {
  id: string;
  patient: Pick<User, 'name' | 'id'>;
  time: string;
  reason: string;
  isNewPatient: boolean;
  careprepStatus?: CareprepStatus;
}

export type AppointReadyStatus = 'Ready' | 'Pending' | 'Incomplete';

export interface PatientListItem {
  id: string;
  name: string;
  lastSeen: string;
  appointReadyStatus: AppointReadyStatus;
}

export interface ProviderTask {
  id: string;
  description: string;
  patientName: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
}

// =================================
// Visit & Clinical Documentation Types
// =================================

export type TranscriptionStatus = 'processing' | 'completed' | 'failed';

export interface Transcription {
  id: string;
  visit_id: string;
  audio_file_path: string;
  language: string;
  status: TranscriptionStatus;
  transcription_text?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  provider_id: string;
  visit_type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  chief_complaint?: string;
  reason_for_visit?: string;
  scheduled_start?: string;
  actual_start?: string;
  actual_end?: string;
  soap_notes?: SOAPNote;
}
