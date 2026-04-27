'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiClient } from '@/lib/api/client';

const LOCAL_APPOINTMENTS_KEY = 'provider_local_appointments';

type CalendarEvent = {
  id: string;
  patient: string;
  time: string;
  type: string;
  scheduledStart: string;
  day: number;
  month: number;
  year: number;
};

export default function ProviderCalendarPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use direct fetch for multipart/form-data to avoid client wrapper issues with FormData
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth_token='))
        ?.split('=')[1];

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/api/appointments/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Import failed');
      }

      const data = await res.json();
      setImportResult({
        success: data.success_count,
        failed: data.failed_count,
        errors: data.errors
      });

      if (data.success_count > 0) {
        toast.success(`Successfully imported ${data.success_count} appointments`);
      }
      if (data.failed_count > 0) {
        toast.error(`Failed to import ${data.failed_count} rows`);
      }

    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.id) return;
      try {
        const response = await apiClient.getProviderUpcomingVisits(user.id);
        const backendEvents: CalendarEvent[] = (response.appointments || [])
          .map((item) => {
            const scheduled = item.scheduled_start;
            const dt = scheduled ? new Date(scheduled) : null;
            if (!dt || Number.isNaN(dt.getTime())) return null;
            return {
              id: item.visit_id || item.appointment_id || crypto.randomUUID(),
              patient: item.patient_name || 'Unknown Patient',
              time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: item.appointment_type || 'Visit',
              scheduledStart: scheduled,
              day: dt.getDate(),
              month: dt.getMonth(),
              year: dt.getFullYear(),
            };
          })
          .filter(Boolean) as CalendarEvent[];
        setCalendarEvents(backendEvents);
      } catch (error) {
        const localAppointments = JSON.parse(localStorage.getItem(LOCAL_APPOINTMENTS_KEY) || '[]');
        const parsedEvents: CalendarEvent[] = localAppointments
          .map((item: any) => {
            const dt = new Date(item.scheduled_start);
            if (Number.isNaN(dt.getTime())) return null;
            return {
              id: item.id || item.visit_id || crypto.randomUUID(),
              patient: item.patient_name || 'Unknown Patient',
              time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: item.type || 'Visit',
              scheduledStart: item.scheduled_start,
              day: dt.getDate(),
              month: dt.getMonth(),
              year: dt.getFullYear(),
            };
          })
          .filter(Boolean) as CalendarEvent[];
        setCalendarEvents(parsedEvents);
      }
    };
    loadEvents();
  }, [user?.id]);

  const monthEvents = useMemo(() => {
    const eventsForMonth = calendarEvents.filter(
      (event) => event.month === currentDate.getMonth() && event.year === currentDate.getFullYear()
    );

    const map: Record<number, Array<{ time: string; patient: string; type: string }>> = {};
    for (const event of eventsForMonth) {
      if (!map[event.day]) map[event.day] = [];
      map[event.day].push({
        time: event.time,
        patient: event.patient,
        type: event.type,
      });
    }

    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(`1970-01-01 ${a.time}`).getTime() - new Date(`1970-01-01 ${b.time}`).getTime())
    );
    return map;
  }, [calendarEvents, currentDate]);

  const upcomingMonthEvents = useMemo(() => {
    return calendarEvents
      .filter((event) => event.month === currentDate.getMonth() && event.year === currentDate.getFullYear())
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }, [calendarEvents, currentDate]);

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Manage your appointments and schedule</p>
        </div>
        <div className="flex gap-3">
          <Link href={`${ws}/manage-appointments`}>
            <Button variant="outline">
              Manage Appointments
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Link href={`${ws}/registered-patients`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goToToday}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-700 text-sm py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              const appointments = day ? monthEvents[day] || [] : [];

              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-lg
                    ${day ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'}
                    ${isToday(day) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                    transition-colors
                  `}
                >
                  {day && (
                    <>
                      <div
                        className={`
                          text-sm font-medium mb-2
                          ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}
                        `}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {appointments.map((apt, idx) => (
                          <div
                            key={idx}
                            className={`
                              text-xs p-1.5 rounded
                              ${idx === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                            `}
                          >
                            <div className="font-medium">{apt.time}</div>
                            <div className="truncate">{apt.patient}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled appointments for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingMonthEvents.length === 0 && (
              <p className="text-sm text-gray-600">No appointments for this month yet.</p>
            )}
            {upcomingMonthEvents.map((apt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs text-blue-600 font-medium">
                          {monthNames[currentDate.getMonth()].slice(0, 3)}
                        </div>
                        <div className="text-lg font-bold text-blue-700">{apt.day}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{apt.patient}</div>
                      <div className="text-sm text-gray-600">
                        {apt.time} • {apt.type}
                      </div>
                    </div>
                  </div>
                  <Link href={`${ws}/visits/${encodeURIComponent(apt.id)}`}>
                    <Button variant="outline" size="sm">
                      Open Visit
                    </Button>
                  </Link>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Modal */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Appointments</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk create appointments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!importResult ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Click to upload CSV</p>
                <p className="text-xs text-gray-500 mt-1">Expected columns: patient_email, date, time, duration_minutes</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{importResult.success} appointments created</span>
                </div>

                {importResult.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">{importResult.failed} failed rows</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                      {importResult.errors.map((err, i) => (
                        <div key={i}>{err}</div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setImportResult(null)}>
                  Upload Another File
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
