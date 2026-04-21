/**
 * WeekView Component
 * Displays calendar in weekly format with time grid
 */

import React from 'react';
import { Appointment } from '@/lib/types/calendar';
import { getDaysInWeek } from '@/lib/utils/calendar';
import { TimeGrid } from './TimeGrid';

interface WeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  startHour?: number;
  endHour?: number;
  weekStartsOn?: 0 | 1 | 6;
  onSlotClick?: (date: Date, hour: number) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  appointments,
  startHour = 7,
  endHour = 20,
  weekStartsOn = 1,
  onSlotClick,
  onAppointmentClick,
}) => {
  const weekDays = getDaysInWeek(currentDate, weekStartsOn);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map((day, index) => (
          <div key={index} className="bg-white">
            <TimeGrid
              date={day}
              appointments={appointments}
              startHour={startHour}
              endHour={endHour}
              onSlotClick={onSlotClick}
              onAppointmentClick={onAppointmentClick}
              showHeader={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
