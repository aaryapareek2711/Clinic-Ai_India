/**
 * DayView Component
 * Displays calendar for a single day with detailed time grid
 */

import React from 'react';
import { Appointment } from '@/lib/types/calendar';
import { TimeGrid } from './TimeGrid';
import { formatDayHeader } from '@/lib/utils/calendar';

interface DayViewProps {
  currentDate: Date;
  appointments: Appointment[];
  startHour?: number;
  endHour?: number;
  onSlotClick?: (date: Date, hour: number) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  appointments,
  startHour = 7,
  endHour = 20,
  onSlotClick,
  onAppointmentClick,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Day header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatDayHeader(currentDate)}
        </h3>
      </div>

      {/* Time grid */}
      <div className="p-4">
        <TimeGrid
          date={currentDate}
          appointments={appointments}
          startHour={startHour}
          endHour={endHour}
          onSlotClick={onSlotClick}
          onAppointmentClick={onAppointmentClick}
          showHeader={false}
        />
      </div>
    </div>
  );
};

export default DayView;
