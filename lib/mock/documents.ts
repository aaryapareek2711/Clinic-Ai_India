/**
 * Mock data for documents and settings
 */

import { Document } from '@/lib/types/document';

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Automobile Accident Intake',
    category: 'Intake Forms',
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    name: 'Consent for Minor Usage of Software Services',
    category: 'Intake Forms',
    lastUpdated: '2024-01-10',
  },
  {
    id: '3',
    name: 'COVID-19 Pre-Appointment Screening Questionnaire',
    category: 'Assessments',
    lastUpdated: '2024-01-08',
  },
  {
    id: '4',
    name: 'GAD',
    category: 'Assessments',
    lastUpdated: '2024-01-05',
  },
  {
    id: '5',
    name: 'Release of Information',
    category: 'Intake Forms',
    lastUpdated: '2024-01-03',
  },
  {
    id: '6',
    name: 'Standard Intake Questionnaire Template',
    category: 'Intake Forms',
    lastUpdated: '2023-12-28',
  },
  {
    id: '7',
    name: 'Third Party Financial Responsibility Form',
    category: 'Intake Forms',
    lastUpdated: '2023-12-20',
  },
  {
    id: '8',
    name: 'SOAP Note',
    category: 'Progress Notes',
    lastUpdated: '2024-01-20',
  },
  {
    id: '9',
    name: 'Standard Progress Note',
    category: 'Progress Notes',
    lastUpdated: '2024-01-18',
  },
];

export const practiceTypes = [
  'Solo Practitioner',
  'Group Practice',
  'Mental Health Clinic',
  'Hospital',
  'Counseling Center',
  'Private Practice',
  'Non-Profit Organization',
  'Other',
];

export const timezones = [
  'Pacific Time (US & Canada) UTC-08:00',
  'Mountain Time (US & Canada) UTC-07:00',
  'Central Time (US & Canada) UTC-06:00',
  'Eastern Time (US & Canada) UTC-05:00',
  'Alaska UTC-09:00',
  'Hawaii UTC-10:00',
];

export const cancellationPolicies = [
  'At least 24 hours',
  'At least 48 hours',
  'At least 72 hours',
  'At least 1 week',
];
