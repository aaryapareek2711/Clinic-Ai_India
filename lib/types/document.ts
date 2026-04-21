/**
 * Document type definitions
 */

export type DocumentCategory =
  | 'Progress Notes'
  | 'Assessments'
  | 'Intake Forms'
  | 'Treatment Plans';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  lastUpdated: string;
}

export interface PracticeType {
  value: string;
  label: string;
}
