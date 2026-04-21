/**
 * TypeScript types for Unified Patient Summary
 *
 * These types correspond to the backend Pydantic models in:
 * backend/src/api/schemas/unified_schemas.py
 */

export interface PatientBasicInfo {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  age?: number | null;
}

export interface PatientSymptomSummary {
  chief_complaint: string;
  urgency_message: string;
  next_steps: string[];
}

export interface DiscussionTopic {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  icon?: string | null;
}

export interface MedicationToConfirm {
  id: string;
  name: string;
  instructions?: string | null;
}

export interface AllergyInfo {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface AppointmentPrepItem {
  id: string;
  category: 'screening' | 'vaccination' | 'document';
  text: string;
  completed: boolean;
  due_date?: string | null;
}

/**
 * Main patient-facing appointment summary response.
 *
 * This implements the "API firewall" pattern where clinical metrics
 * like risk scores and triage levels are hidden from patients.
 */
export interface PatientSummaryResponse {
  patient_id: string;
  generated_at: string;
  appointment_date?: string | null;

  // Patient basic info
  patient_info: PatientBasicInfo;

  // Symptom analysis (patient-friendly)
  symptoms?: PatientSymptomSummary | null;

  // Topics to discuss (risk scores hidden!)
  topics_to_discuss: DiscussionTopic[];

  // Medications to confirm
  medications_to_confirm: MedicationToConfirm[];

  // Allergies (always shown for safety)
  allergies: AllergyInfo[];

  // Appointment preparation checklist
  appointment_prep: AppointmentPrepItem[];

  // Message from care team
  message_from_team?: string | null;
}

// Helper type for component props
export interface PatientSummaryProps {
  patientId: string;
  onRefresh?: () => void;
}
