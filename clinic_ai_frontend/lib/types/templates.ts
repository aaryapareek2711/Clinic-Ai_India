// Template types for SOAP note templates

export type TemplateCategory =
  | 'General'
  | 'Cardiology'
  | 'Pediatrics'
  | 'Dermatology'
  | 'Mental Health'
  | 'Orthopedics'
  | 'Other';

export type TemplateType = 'personal' | 'practice' | 'community';

export type AppointmentType =
  | 'Follow-up'
  | 'Annual Physical'
  | 'New Patient'
  | 'Acute Visit'
  | 'Chronic Care'
  | 'Preventive';

export interface TemplateMetadata {
  category: TemplateCategory;
  specialty?: string;
  appointmentTypes: AppointmentType[];
  tags: string[];
  version: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsed?: string;
  isFavorite?: boolean;
}

export interface SOAPTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  content: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  metadata: TemplateMetadata;
}

export interface TemplateFilters {
  search: string;
  category: TemplateCategory | 'All';
  appointmentType: AppointmentType | 'All';
  sortBy: 'recent' | 'popular' | 'name';
}
