/**
 * MonthView Component
 * Displays calendar in monthly grid format
 */

import React from 'react';
import { format } from 'date-fns';
import { Appointment } from '@/lib/types/calendar';
import {
  getDaysInMonthGrid,
  getDayNames,
  isCurrentMonth,
  isToday,
  getAppointmentsForDate,
} from '@/lib/utils/calendar';
import { AppointmentCard } from './AppointmentCard';

interface MonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onDayClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  weekStartsOn?: 0 | 1 | 6;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick,
  weekStartsOn = 1,
}) => {
  const days = getDaysInMonthGrid(currentDate, weekStartsOn);
  const dayNames = getDayNames(weekStartsOn);

  const handleDayClick = (date: Date) => {
    if (onDayClick) {
      onDayClick(date);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="px-2 py-3 text-center text-sm font-semibold text-gray-600 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayAppointments = getAppointmentsForDate(appointments, day);
          const isCurrentMonthDay = isCurrentMonth(day, currentDate);
          const isTodayDay = isToday(day);
          const hasAppointments = dayAppointments.length > 0;

          return (
            <div
              key={index}
              className={`min-h-[120px] border-b border-r border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors
                ${!isCurrentMonthDay ? 'bg-gray-50/50' : ''}
                ${isTodayDay ? 'bg-blue-50' : ''}
              `}
              onClick={() => handleDayClick(day)}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                    ${!isCurrentMonthDay ? 'text-gray-400' : 'text-gray-700'}
                    ${isTodayDay ? 'bg-blue-600 text-white' : ''}
                  `}
                >
                  {format(day, 'd')}
                </span>
                {hasAppointments && (
                  <span className="text-xs text-gray-500 font-medium">
                    {dayAppointments.length}
                  </span>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    variant="mini"
                    showTime={true}
                    showPatient={true}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAppointmentClick) {
                        onAppointmentClick(appointment);
                      }
                    }}
                  />
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium px-2">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
