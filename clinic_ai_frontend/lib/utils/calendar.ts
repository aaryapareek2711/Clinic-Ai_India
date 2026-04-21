/**
 * Calendar Utility Functions
 */

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  differenceInMinutes,
  parseISO,
} from 'date-fns';
import { Appointment } from '@/lib/types/calendar';

/**
 * Get array of dates for month view (including padding from prev/next months)
 */
export const getDaysInMonthGrid = (date: Date, weekStartsOn: 0 | 1 | 6 = 1): Date[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  const days: Date[] = [];
  let currentDay = startDate;

  while (currentDay <= endDate) {
    days.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  return days;
};

/**
 * Get array of dates for week view
 */
export const getDaysInWeek = (date: Date, weekStartsOn: 0 | 1 | 6 = 1): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn });
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }

  return days;
};

/**
 * Get day names for calendar header
 */
export const getDayNames = (weekStartsOn: 0 | 1 | 6 = 1, short: boolean = true): string[] => {
  const days = getDaysInWeek(new Date(), weekStartsOn);
  return days.map(day => format(day, short ? 'EEE' : 'EEEE'));
};

/**
 * Format time for display (e.g., "9:00 AM")
 */
export const formatTime = (date: Date): string => {
  return format(date, 'h:mm a');
};

/**
 * Format time range (e.g., "9:00 AM - 10:00 AM")
 */
export const formatTimeRange = (start: Date, end: Date): string => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

/**
 * Format date for display (e.g., "January 2024")
 */
export const formatMonthYear = (date: Date): string => {
  return format(date, 'MMMM yyyy');
};

/**
 * Format date for week view header (e.g., "Jan 15 - 21, 2024")
 */
export const formatWeekRange = (date: Date, weekStartsOn: 0 | 1 | 6 = 1): string => {
  const weekStart = startOfWeek(date, { weekStartsOn });
  const weekEnd = endOfWeek(date, { weekStartsOn });

  if (isSameMonth(weekStart, weekEnd)) {
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
  } else {
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  }
};

/**
 * Format date for day view header (e.g., "Monday, January 15, 2024")
 */
export const formatDayHeader = (date: Date): string => {
  return format(date, 'EEEE, MMMM d, yyyy');
};

/**
 * Check if two dates are the same day
 */
export const isSameDayFn = (date1: Date, date2: Date): boolean => {
  return isSameDay(date1, date2);
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  return isTodayFn(date);
};

/**
 * Check if date is in current month
 */
export const isCurrentMonth = (date: Date, currentDate: Date): boolean => {
  return isSameMonth(date, currentDate);
};

/**
 * Navigate to previous period
 */
export const navigatePrevious = (date: Date, viewType: 'month' | 'week' | 'day'): Date => {
  switch (viewType) {
    case 'month':
      return subMonths(date, 1);
    case 'week':
      return subWeeks(date, 1);
    case 'day':
      return subDays(date, 1);
  }
};

/**
 * Navigate to next period
 */
export const navigateNext = (date: Date, viewType: 'month' | 'week' | 'day'): Date => {
  switch (viewType) {
    case 'month':
      return addMonths(date, 1);
    case 'week':
      return addWeeks(date, 1);
    case 'day':
      return addDays(date, 1);
  }
};

/**
 * Generate time slots for a day (e.g., 7 AM - 8 PM)
 */
export const generateTimeSlots = (
  date: Date,
  startHour: number = 7,
  endHour: number = 20,
  intervalMinutes: number = 60
): Date[] => {
  const slots: Date[] = [];
  let currentTime = setMinutes(setHours(startOfDay(date), startHour), 0);
  const endTime = setMinutes(setHours(startOfDay(date), endHour), 0);

  while (currentTime < endTime) {
    slots.push(currentTime);
    currentTime = addDays(currentTime, intervalMinutes / (24 * 60));
  }

  return slots;
};

/**
 * Filter appointments for a specific date
 */
export const getAppointmentsForDate = (appointments: Appointment[], date: Date): Appointment[] => {
  return appointments.filter(apt => isSameDay(apt.start, date));
};

/**
 * Filter appointments for a date range
 */
export const getAppointmentsForRange = (
  appointments: Appointment[],
  startDate: Date,
  endDate: Date
): Appointment[] => {
  return appointments.filter(apt => {
    return apt.start >= startDate && apt.start <= endDate;
  });
};

/**
 * Check if appointments overlap
 */
export const appointmentsOverlap = (apt1: Appointment, apt2: Appointment): boolean => {
  return (
    (apt1.start >= apt2.start && apt1.start < apt2.end) ||
    (apt2.start >= apt1.start && apt2.start < apt1.end)
  );
};

/**
 * Detect appointment conflicts
 */
export const detectConflicts = (
  newAppointment: Appointment,
  existingAppointments: Appointment[]
): Appointment[] => {
  return existingAppointments.filter(apt => appointmentsOverlap(newAppointment, apt));
};

/**
 * Calculate appointment duration in minutes
 */
export const getAppointmentDuration = (appointment: Appointment): number => {
  return differenceInMinutes(appointment.end, appointment.start);
};

/**
 * Calculate position and height for time grid
 * Returns percentage values for CSS positioning
 */
export const calculateGridPosition = (
  start: Date,
  end: Date,
  dayStartHour: number = 7,
  dayEndHour: number = 20
): { top: number; height: number } => {
  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  const startMinutes = (start.getHours() - dayStartHour) * 60 + start.getMinutes();
  const duration = differenceInMinutes(end, start);

  return {
    top: (startMinutes / totalMinutes) * 100,
    height: (duration / totalMinutes) * 100,
  };
};

/**
 * Sort appointments by start time
 */
export const sortAppointments = (appointments: Appointment[]): Appointment[] => {
  return [...appointments].sort((a, b) => a.start.getTime() - b.start.getTime());
};

/**
 * Get upcoming appointments (future from now)
 */
export const getUpcomingAppointments = (
  appointments: Appointment[],
  limit?: number
): Appointment[] => {
  const now = new Date();
  const upcoming = appointments
    .filter(apt => apt.start >= now && apt.status === 'scheduled')
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return limit ? upcoming.slice(0, limit) : upcoming;
};

/**
 * Get today's appointments
 */
export const getTodaysAppointments = (appointments: Appointment[]): Appointment[] => {
  const today = new Date();
  return getAppointmentsForDate(appointments, today);
};

/**
 * Format relative date (e.g., "Today", "Tomorrow", "Jan 15")
 */
export const formatRelativeDate = (date: Date): string => {
  if (isToday(date)) return 'Today';

  const tomorrow = addDays(new Date(), 1);
  if (isSameDay(date, tomorrow)) return 'Tomorrow';

  const yesterday = subDays(new Date(), 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return format(date, 'MMM d');
};
