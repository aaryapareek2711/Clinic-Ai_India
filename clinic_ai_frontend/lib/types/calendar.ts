/**
 * Calendar and Appointment Type Definitions
 */

export type CalendarViewType = 'month' | 'week' | 'day';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

export type AppointmentType =
  | 'new-patient'
  | 'follow-up'
  | 'therapy'
  | 'consultation'
  | 'telehealth'
  | 'lab-review';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  type: AppointmentType;
  title?: string;
  description?: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  location?: string;
  notes?: string;
  isRecurring?: boolean;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  type: 'appointment' | 'reminder' | 'task' | 'blocked-time';
}

export interface TimeSlot {
  time: string;
  hour: number;
  appointments: Appointment[];
}

export interface CalendarSettings {
  startTime: number; // hour (0-23)
  endTime: number; // hour (0-23)
  slotDuration: number; // minutes
  weekStartsOn: 0 | 1 | 6; // 0=Sunday, 1=Monday, 6=Saturday
  workingDays: number[]; // 0-6
  defaultAppointmentDuration: number; // minutes
  allowDoubleBooking: boolean;
  showWeekends: boolean;
}

/**
 * Get color class for appointment type
 */
export const getAppointmentColor = (type: AppointmentType): string => {
  const colors: Record<AppointmentType, string> = {
    'new-patient': 'bg-blue-100 text-blue-700 border-blue-300',
    'follow-up': 'bg-green-100 text-green-700 border-green-300',
    'therapy': 'bg-purple-100 text-purple-700 border-purple-300',
    'consultation': 'bg-orange-100 text-orange-700 border-orange-300',
    'telehealth': 'bg-cyan-100 text-cyan-700 border-cyan-300',
    'lab-review': 'bg-pink-100 text-pink-700 border-pink-300',
  };
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
};

/**
 * Get color for appointment status
 */
export const getStatusColor = (status: AppointmentStatus): string => {
  const colors: Record<AppointmentStatus, string> = {
    'scheduled': 'bg-blue-500',
    'completed': 'bg-green-500',
    'cancelled': 'bg-red-500',
    'no-show': 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-500';
};

/**
 * Get display label for appointment type
 */
export const getAppointmentTypeLabel = (type: AppointmentType): string => {
  const labels: Record<AppointmentType, string> = {
    'new-patient': 'New Patient',
    'follow-up': 'Follow-up',
    'therapy': 'Therapy Session',
    'consultation': 'Consultation',
    'telehealth': 'Telehealth',
    'lab-review': 'Lab Review',
  };
  return labels[type] || type;
};
