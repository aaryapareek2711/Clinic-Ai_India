/**
 * UpcomingAppointments Component
 * Dashboard widget showing upcoming scheduled appointments
 */

import React from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/calendar';
import { getUpcomingAppointments, formatRelativeDate, formatTime } from '@/lib/utils/calendar';
import { AppointmentCard } from '@/components/calendar/AppointmentCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  limit?: number;
  showViewAll?: boolean;
}

export const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  appointments,
  limit = 5,
  showViewAll = true,
}) => {
  const upcomingAppointments = getUpcomingAppointments(appointments, limit);

  if (upcomingAppointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No upcoming appointments</p>
            <Button className="mt-4" size="sm">
              Schedule Appointment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          {showViewAll && (
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="sm">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Date indicator */}
              <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-2 min-w-[60px]">
                <div className="text-xs font-medium text-blue-600 uppercase">
                  {formatRelativeDate(appointment.start)}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {formatTime(appointment.start)}
                </div>
              </div>

              {/* Appointment details */}
              <div className="flex-1 min-w-0">
                <AppointmentCard
                  appointment={appointment}
                  variant="compact"
                  showTime={false}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        {showViewAll && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link href="/dashboard/calendar">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Open Calendar
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingAppointments;
