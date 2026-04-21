/**
 * TimeGrid Component
 * Displays time slots with appointments for week/day views
 */

import React from 'react';
import { format } from 'date-fns';
import { Appointment } from '@/lib/types/calendar';
import {
  generateTimeSlots,
  getAppointmentsForDate,
  calculateGridPosition,
} from '@/lib/utils/calendar';
import { AppointmentCard } from './AppointmentCard';

interface TimeGridProps {
  date: Date;
  appointments: Appointment[];
  startHour?: number;
  endHour?: number;
  onSlotClick?: (date: Date, hour: number) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  showHeader?: boolean;
}

export const TimeGrid: React.FC<TimeGridProps> = ({
  date,
  appointments,
  startHour = 7,
  endHour = 20,
  onSlotClick,
  onAppointmentClick,
  showHeader = true,
}) => {
  const timeSlots = generateTimeSlots(date, startHour, endHour, 60);
  const dayAppointments = getAppointmentsForDate(appointments, date);

  const handleSlotClick = (hour: number) => {
    if (onSlotClick) {
      onSlotClick(date, hour);
    }
  };

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="text-sm font-medium text-gray-600">
            {format(date, 'EEE')}
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {format(date, 'd')}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 relative">
        {/* Time labels and slots */}
        <div className="absolute inset-0 overflow-y-auto">
          {timeSlots.map((slot, index) => {
            const hour = slot.getHours();
            return (
              <div
                key={index}
                className="relative border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                style={{ height: '60px' }}
                onClick={() => handleSlotClick(hour)}
              >
                {/* Time label */}
                <div className="absolute left-0 top-0 px-2 py-1 text-xs text-gray-500 font-medium">
                  {format(slot, 'h:mm a')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Appointments overlay */}
        <div className="absolute inset-0 left-16 pointer-events-none">
          {dayAppointments.map((appointment) => {
            const position = calculateGridPosition(
              appointment.start,
              appointment.end,
              startHour,
              endHour
            );

            return (
              <div
                key={appointment.id}
                className="absolute left-1 right-1 pointer-events-auto"
                style={{
                  top: `${position.top}%`,
                  height: `${position.height}%`,
                }}
              >
                <AppointmentCard
                  appointment={appointment}
                  variant="full"
                  showTime={true}
                  showPatient={true}
                  onClick={onAppointmentClick}
                  className="h-full overflow-hidden"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimeGrid;
