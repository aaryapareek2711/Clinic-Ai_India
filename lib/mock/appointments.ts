/**
 * Mock Appointment Data
 * Sample appointments for development and testing
 */

import { addDays, addHours, setHours, setMinutes } from 'date-fns';
import { Appointment } from '@/lib/types/calendar';

const today = new Date();
const tomorrow = addDays(today, 1);
const nextWeek = addDays(today, 7);

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientId: 'p1',
    patientName: 'Jamie D. Appleseed',
    type: 'new-patient',
    title: 'Initial Consultation',
    start: setMinutes(setHours(tomorrow, 7), 0),
    end: setMinutes(setHours(tomorrow, 8), 0),
    status: 'scheduled',
    location: 'Room 101',
    notes: 'First time patient, referral from Dr. Smith',
  },
  {
    id: '2',
    patientId: 'p2',
    patientName: 'John Smith',
    type: 'follow-up',
    start: setMinutes(setHours(today, 10), 0),
    end: setMinutes(setHours(today, 11), 0),
    status: 'scheduled',
    location: 'Room 102',
  },
  {
    id: '3',
    patientId: 'p3',
    patientName: 'Sarah Johnson',
    type: 'therapy',
    start: setMinutes(setHours(today, 13), 0),
    end: setMinutes(setHours(today, 14), 0),
    status: 'scheduled',
    location: 'Room 103',
  },
  {
    id: '4',
    patientId: 'p4',
    patientName: 'Michael Brown',
    type: 'telehealth',
    start: setMinutes(setHours(today, 15), 0),
    end: setMinutes(setHours(today, 16), 0),
    status: 'scheduled',
    location: 'Virtual',
  },
  {
    id: '5',
    patientId: 'p5',
    patientName: 'Emily Davis',
    type: 'consultation',
    start: setMinutes(setHours(tomorrow, 9), 0),
    end: setMinutes(setHours(tomorrow, 10), 0),
    status: 'scheduled',
    location: 'Room 101',
  },
  {
    id: '6',
    patientId: 'p6',
    patientName: 'Robert Wilson',
    type: 'lab-review',
    start: setMinutes(setHours(tomorrow, 11), 0),
    end: setMinutes(setHours(tomorrow, 12), 0),
    status: 'scheduled',
    location: 'Room 102',
  },
  {
    id: '7',
    patientId: 'p7',
    patientName: 'Jennifer Martinez',
    type: 'follow-up',
    start: setMinutes(setHours(tomorrow, 14), 0),
    end: setMinutes(setHours(tomorrow, 15), 0),
    status: 'scheduled',
    location: 'Room 103',
  },
  {
    id: '8',
    patientId: 'p8',
    patientName: 'David Garcia',
    type: 'therapy',
    start: setMinutes(setHours(nextWeek, 9), 0),
    end: setMinutes(setHours(nextWeek, 10), 30),
    status: 'scheduled',
    location: 'Room 101',
  },
  {
    id: '9',
    patientId: 'p9',
    patientName: 'Lisa Anderson',
    type: 'new-patient',
    start: setMinutes(setHours(nextWeek, 11), 0),
    end: setMinutes(setHours(nextWeek, 12), 0),
    status: 'scheduled',
    location: 'Room 102',
  },
  {
    id: '10',
    patientId: 'p10',
    patientName: 'Christopher Lee',
    type: 'telehealth',
    start: setMinutes(setHours(nextWeek, 14), 0),
    end: setMinutes(setHours(nextWeek, 15), 0),
    status: 'scheduled',
    location: 'Virtual',
  },
  {
    id: '11',
    patientId: 'p1',
    patientName: 'Jamie D. Appleseed',
    type: 'follow-up',
    start: setMinutes(setHours(tomorrow, 13), 0),
    end: setMinutes(setHours(tomorrow, 14), 0),
    status: 'scheduled',
    location: 'Room 101',
  },
  {
    id: '12',
    patientId: 'p2',
    patientName: 'John Smith',
    type: 'therapy',
    start: setMinutes(setHours(addDays(today, 2), 10), 0),
    end: setMinutes(setHours(addDays(today, 2), 11), 30),
    status: 'scheduled',
    location: 'Room 103',
  },
];

/**
 * Mock API function to fetch appointments
 */
export const fetchAppointments = async (): Promise<Appointment[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockAppointments;
};

/**
 * Mock API function to create appointment
 */
export const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newAppointment: Appointment = {
    ...appointment,
    id: Math.random().toString(36).substring(7),
  };
  return newAppointment;
};

/**
 * Mock API function to update appointment
 */
export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const appointment = mockAppointments.find(a => a.id === id);
  if (!appointment) {
    throw new Error('Appointment not found');
  }
  return { ...appointment, ...updates };
};

/**
 * Mock API function to delete appointment
 */
export const deleteAppointment = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = mockAppointments.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error('Appointment not found');
  }
};
