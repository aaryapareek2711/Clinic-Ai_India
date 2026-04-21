/**
 * CalendarView Component
 * Main calendar component with view switching (month/week/day)
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Appointment, CalendarViewType } from '@/lib/types/calendar';
import {
  formatMonthYear,
  formatWeekRange,
  formatDayHeader,
  navigatePrevious,
  navigateNext,
} from '@/lib/utils/calendar';
import { Button } from '@/components/ui/button';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';

interface CalendarViewProps {
  appointments: Appointment[];
  initialView?: CalendarViewType;
  initialDate?: Date;
  onAppointmentClick?: (appointment: Appointment) => void;
  onCreateAppointment?: (date?: Date, hour?: number) => void;
  onDayClick?: (date: Date) => void;
  startHour?: number;
  endHour?: number;
  weekStartsOn?: 0 | 1 | 6;
  showCreateButton?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  initialView = 'month',
  initialDate = new Date(),
  onAppointmentClick,
  onCreateAppointment,
  onDayClick,
  startHour = 7,
  endHour = 20,
  weekStartsOn = 1,
  showCreateButton = true,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewType, setViewType] = useState<CalendarViewType>(initialView);

  const handlePrevious = () => {
    setCurrentDate(navigatePrevious(currentDate, viewType));
  };

  const handleNext = () => {
    setCurrentDate(navigateNext(currentDate, viewType));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (view: CalendarViewType) => {
    setViewType(view);
  };

  const handleDayClickInternal = (date: Date) => {
    if (viewType === 'month') {
      setViewType('day');
      setCurrentDate(date);
    }
    if (onDayClick) {
      onDayClick(date);
    }
  };

  const handleSlotClick = (date: Date, hour: number) => {
    if (onCreateAppointment) {
      onCreateAppointment(date, hour);
    }
  };

  const getHeaderText = (): string => {
    switch (viewType) {
      case 'month':
        return formatMonthYear(currentDate);
      case 'week':
        return formatWeekRange(currentDate, weekStartsOn);
      case 'day':
        return formatDayHeader(currentDate);
    }
  };

  const renderView = () => {
    switch (viewType) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            appointments={appointments}
            onDayClick={handleDayClickInternal}
            onAppointmentClick={onAppointmentClick}
            weekStartsOn={weekStartsOn}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            appointments={appointments}
            startHour={startHour}
            endHour={endHour}
            weekStartsOn={weekStartsOn}
            onSlotClick={handleSlotClick}
            onAppointmentClick={onAppointmentClick}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            appointments={appointments}
            startHour={startHour}
            endHour={endHour}
            onSlotClick={handleSlotClick}
            onAppointmentClick={onAppointmentClick}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={handleToday}
            className="min-w-[80px]"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <h2 className="text-xl font-semibold text-gray-900 ml-4">
            {getHeaderText()}
          </h2>
        </div>

        {/* View switcher and actions */}
        <div className="flex items-center gap-2">
          {/* View type buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewType === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Month
            </button>
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewType === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Week
            </button>
            <button
              onClick={() => handleViewChange('day')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewType === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Day
            </button>
          </div>

          {/* Create appointment button */}
          {showCreateButton && (
            <Button
              onClick={() => onCreateAppointment?.()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          )}
        </div>
      </div>

      {/* Calendar view */}
      <div className="calendar-view">
        {renderView()}
      </div>
    </div>
  );
};

export default CalendarView;
