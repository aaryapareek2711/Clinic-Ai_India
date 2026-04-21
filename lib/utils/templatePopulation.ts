import type { SOAPTemplate } from '@/lib/types/templates';

/**
 * Patient data interface for template population
 */
export interface PatientData {
  name?: string;
  age?: number;
  dob?: string;
  gender?: string;
  mrn?: string;
  chiefComplaint?: string;
  vitals?: {
    bp?: string;
    hr?: number;
    temp?: number;
    rr?: number;
    o2sat?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
}

/**
 * Placeholder mapping configuration
 */
const placeholderMap: Record<string, (data: PatientData) => string> = {
  '[Patient Name]': (data) => data.name || '[Patient Name]',
  '[Age]': (data) => data.age?.toString() || '[Age]',
  '[DOB]': (data) => data.dob || '[DOB]',
  '[Gender]': (data) => data.gender || '[Gender]',
  '[MRN]': (data) => data.mrn || '[MRN]',
  '[Chief Complaint]': (data) => data.chiefComplaint || '[Chief Complaint]',

  // Vitals
  '[BP]': (data) => data.vitals?.bp || '[BP]',
  '[HR]': (data) => data.vitals?.hr?.toString() || '[HR]',
  '[Temp]': (data) => data.vitals?.temp?.toString() || '[Temp]',
  '[RR]': (data) => data.vitals?.rr?.toString() || '[RR]',
  '[O2Sat]': (data) => data.vitals?.o2sat?.toString() || '[O2Sat]',
  '[Weight]': (data) => data.vitals?.weight?.toString() || '[Weight]',
  '[Height]': (data) => data.vitals?.height?.toString() || '[Height]',
  '[BMI]': (data) => data.vitals?.bmi?.toString() || '[BMI]',

  // Lists
  '[Allergies]': (data) => data.allergies?.join(', ') || 'No known allergies',
  '[Current Medications]': (data) => data.medications?.join(', ') || 'None reported',
  '[Medical History]': (data) => data.conditions?.join(', ') || 'None reported',

  // Date/Time
  '[Today]': () => new Date().toLocaleDateString(),
  '[Date]': () => new Date().toLocaleDateString(),
  '[Time]': () => new Date().toLocaleTimeString(),
};

/**
 * Replace placeholders in text with actual patient data
 */
function replacePlaceholders(text: string, patientData: PatientData): string {
  let result = text;

  // Replace each placeholder
  Object.entries(placeholderMap).forEach(([placeholder, getValue]) => {
    const value = getValue(patientData);
    // Use a global regex to replace all occurrences
    result = result.split(placeholder).join(value);
  });

  return result;
}

/**
 * Populate a SOAP template with patient data
 */
export function populateTemplate(
  template: SOAPTemplate,
  patientData: PatientData
): {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} {
  return {
    subjective: replacePlaceholders(template.content.subjective, patientData),
    objective: replacePlaceholders(template.content.objective, patientData),
    assessment: replacePlaceholders(template.content.assessment, patientData),
    plan: replacePlaceholders(template.content.plan, patientData),
  };
}

/**
 * Detect placeholders in text
 */
export function detectPlaceholders(text: string): string[] {
  const placeholderRegex = /\[([^\]]+)\]/g;
  const matches = text.matchAll(placeholderRegex);
  const placeholders = new Set<string>();

  for (const match of matches) {
    placeholders.add(match[0]);
  }

  return Array.from(placeholders);
}

/**
 * Get all placeholders in a template
 */
export function getTemplatePlaceholders(template: SOAPTemplate): string[] {
  const allText = [
    template.content.subjective,
    template.content.objective,
    template.content.assessment,
    template.content.plan,
  ].join(' ');

  return detectPlaceholders(allText);
}

/**
 * Check if text has unpopulated placeholders
 */
export function hasUnpopulatedPlaceholders(text: string): boolean {
  const placeholders = detectPlaceholders(text);
  return placeholders.length > 0;
}

/**
 * Scrub PHI from text for template creation
 * This is a basic implementation - should be enhanced with ML/NER in production
 */
export function scrubPHI(text: string): string {
  let scrubbed = text;

  // Replace common PHI patterns with placeholders

  // Names (basic pattern - this should use NER in production)
  // Looking for capitalized words that might be names
  // This is a simplified version - production should use proper NER

  // Dates
  scrubbed = scrubbed.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[Date]');
  scrubbed = scrubbed.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[Date]');

  // Phone numbers
  scrubbed = scrubbed.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[Phone]');

  // Email addresses
  scrubbed = scrubbed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[Email]');

  // SSN
  scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  // MRN (Medical Record Number) - assuming 6-10 digits
  scrubbed = scrubbed.replace(/\bMRN:?\s*\d{6,10}\b/gi, 'MRN: [MRN]');

  // Specific ages (replace with [Age] placeholder)
  scrubbed = scrubbed.replace(/\b(\d{1,3})\s*(?:year|yr|y\/o)(?:s)?(?:\s+old)?/gi, '[Age] year old');

  // Blood pressure readings
  scrubbed = scrubbed.replace(/\b\d{2,3}\/\d{2,3}\s*mmHg\b/g, '[BP] mmHg');

  // Weight
  scrubbed = scrubbed.replace(/\b\d{2,3}(?:\.\d)?\s*(?:kg|lbs?)\b/g, '[Weight]');

  // Temperature
  scrubbed = scrubbed.replace(/\b\d{2}(?:\.\d)?\s*°?[FC]\b/g, '[Temp]');

  // Heart rate
  scrubbed = scrubbed.replace(/\b(?:HR|heart rate):?\s*\d{2,3}\s*(?:bpm)?\b/gi, 'HR: [HR] bpm');

  return scrubbed;
}

/**
 * Validate if text is safe to save as template (no obvious PHI)
 */
export function validateTemplateText(text: string): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for dates
  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text)) {
    warnings.push('Text contains dates that should be replaced with [Date] placeholder');
  }

  // Check for phone numbers
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
    warnings.push('Text contains phone numbers that should be removed');
  }

  // Check for email addresses
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
    warnings.push('Text contains email addresses that should be removed');
  }

  // Check for SSN
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    warnings.push('Text contains Social Security Numbers that must be removed');
  }

  // Check for specific numeric vitals (should use placeholders)
  if (/\b\d{2,3}\/\d{2,3}\s*mmHg\b/.test(text) && !/\[BP\]/.test(text)) {
    warnings.push('Text contains specific blood pressure readings - consider using [BP] placeholder');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
