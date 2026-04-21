/**
 * AppointmentCard Component
 * Displays individual appointment information in calendar views
 */

import React from 'react';
import { Clock, User, MapPin, Video } from 'lucide-react';
import { Appointment, getAppointmentColor, getAppointmentTypeLabel, getStatusColor } from '@/lib/types/calendar';
import { formatTime, formatTimeRange } from '@/lib/utils/calendar';
import { Badge } from '@/components/ui/badge';

interface AppointmentCardProps {
  appointment: Appointment;
  variant?: 'full' | 'compact' | 'mini';
  showTime?: boolean;
  showPatient?: boolean;
  onClick?: (appointment: Appointment) => void;
  className?: string;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  variant = 'full',
  showTime = true,
  showPatient = true,
  onClick,
  className = '',
}) => {
  const colorClasses = getAppointmentColor(appointment.type);
  const statusColor = getStatusColor(appointment.status);

  const handleClick = () => {
    if (onClick) {
      onClick(appointment);
    }
  };

  // Mini variant for month view
  if (variant === 'mini') {
    return (
      <div
        className={`text-xs px-2 py-1 rounded border ${colorClasses} cursor-pointer hover:shadow-sm transition-shadow ${className}`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="font-medium truncate">{formatTime(appointment.start)}</span>
        </div>
        {showPatient && (
          <div className="truncate">{appointment.patientName}</div>
        )}
      </div>
    );
  }

  // Compact variant for list views
  if (variant === 'compact') {
    return (
      <div
        className={`p-3 rounded-lg border ${colorClasses} cursor-pointer hover:shadow-md transition-shadow ${className}`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="font-semibold">{appointment.patientName}</span>
          </div>
          {showTime && (
            <span className="text-sm">{formatTime(appointment.start)}</span>
          )}
        </div>
        <div className="text-sm">
          <Badge variant="secondary" className="text-xs">
            {getAppointmentTypeLabel(appointment.type)}
          </Badge>
        </div>
      </div>
    );
  }

  // Full variant for time grid and detail views
  return (
    <div
      className={`p-3 rounded-lg border-l-4 ${colorClasses} cursor-pointer hover:shadow-lg transition-all ${className}`}
      onClick={handleClick}
    >
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-xs font-medium uppercase tracking-wide">
            {appointment.status}
          </span>
        </div>
        {appointment.type === 'telehealth' && (
          <Video className="w-4 h-4" />
        )}
      </div>

      {/* Patient name */}
      {showPatient && (
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4" />
          <span className="font-semibold">{appointment.patientName}</span>
        </div>
      )}

      {/* Time */}
      {showTime && (
        <div className="flex items-center gap-2 mb-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>{formatTimeRange(appointment.start, appointment.end)}</span>
        </div>
      )}

      {/* Appointment type */}
      <div className="mb-2">
        <Badge variant="outline" className="text-xs">
          {getAppointmentTypeLabel(appointment.type)}
        </Badge>
      </div>

      {/* Location */}
      {appointment.location && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{appointment.location}</span>
        </div>
      )}

      {/* Notes preview */}
      {appointment.notes && (
        <div className="mt-2 text-xs text-gray-500 line-clamp-2">
          {appointment.notes}
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;
