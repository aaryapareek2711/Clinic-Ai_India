'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';

type VisitDetails = {
  id: string;
  patient_id: string;
  status?: string;
  scheduled_start?: string;
  patient?: {
    first_name?: string;
    last_name?: string;
  };
  chief_complaint?: string;
};

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTwentyFourHourTime = (hour12: string, minute: string, period: string) => {
  if (!hour12 || !minute || !period) return '';
  const parsedHour = Number(hour12);
  if (Number.isNaN(parsedHour)) return '';
  let hour24 = parsedHour % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
};

const fromTwentyFourToTwelve = (time24: string) => {
  if (!time24) return { hour: '', minute: '', period: '' };
  const [hourStr, minuteStr] = time24.split(':');
  const hour = Number(hourStr);
  if (Number.isNaN(hour) || minuteStr === undefined) return { hour: '', minute: '', period: '' };
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour: String(hour12).padStart(2, '0'), minute: minuteStr, period };
};

export default function FixAppointmentPage({ params }: { params: { visitId: string } }) {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const router = useRouter();
  const visitId = decodeURIComponent(params.visitId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visit, setVisit] = useState<VisitDetails | null>(null);

  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentHour, setAppointmentHour] = useState('');
  const [appointmentMinute, setAppointmentMinute] = useState('');
  const [appointmentPeriod, setAppointmentPeriod] = useState('');

  const minAppointmentDate = useMemo(() => toLocalDateString(new Date()), []);
  const maxAppointmentDate = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + 7);
    return toLocalDateString(max);
  }, []);

  useEffect(() => {
    const loadVisit = async () => {
      setLoading(true);
      try {
        const response = (await apiClient.getVisit(visitId)) as VisitDetails;
        setVisit(response);
        const scheduled = String(response.scheduled_start || '');
        if (scheduled.includes('T')) {
          const [datePart, timePartRaw] = scheduled.split('T');
          const timePart = timePartRaw.slice(0, 5);
          const converted = fromTwentyFourToTwelve(timePart);
          setAppointmentDate(datePart || '');
          setAppointmentHour(converted.hour);
          setAppointmentMinute(converted.minute);
          setAppointmentPeriod(converted.period);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load visit');
        setVisit(null);
      } finally {
        setLoading(false);
      }
    };
    loadVisit();
  }, [visitId]);

  const patientName = `${visit?.patient?.first_name || ''} ${visit?.patient?.last_name || ''}`.trim() || 'Unknown Patient';
  const isLocked = ['completed', 'cancelled', 'closed', 'ended'].includes(
    String(visit?.status || '').toLowerCase(),
  );

  const handleSave = async () => {
    const appointmentTime = toTwentyFourHourTime(appointmentHour, appointmentMinute, appointmentPeriod);
    if (!appointmentDate || !appointmentTime) {
      toast.error('Please select appointment date and time');
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.scheduleVisitIntake(visitId, {
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      });
      setVisit((prev) => (prev ? { ...prev, scheduled_start: response.scheduled_start } : prev));
      if (response.intake_skipped_existing_session) {
        toast('Appointment fixed. Intake already existed for this visit.', { icon: 'ℹ️' });
      } else if (response.whatsapp_triggered) {
        toast.success('Appointment fixed and WhatsApp intake triggered.');
      } else {
        toast.success('Appointment fixed.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to fix appointment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading visit...</p>;
  }

  if (!visit) {
    return <p className="text-sm text-red-600">Visit not found.</p>;
  }

  return (
    <div className="space-y-6">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: `${ws}/dashboard` },
          { label: 'Appointments Center', href: `${ws}/manage-appointments` },
          { label: 'Fix Appointment' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Fix Appointment
          </CardTitle>
          <CardDescription>
            Set or update appointment for this patient visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-medium text-slate-900">{patientName}</p>
            <p className="text-xs text-slate-600">Visit ID: {visitId}</p>
            <p className="text-xs text-slate-600">Status: {visit.status || 'open'}</p>
            {visit.scheduled_start && (
              <p className="text-xs text-emerald-700">
                Current appointment: {new Date(visit.scheduled_start).toLocaleString()}
              </p>
            )}
          </div>

          {isLocked ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This visit is completed/cancelled and appointment edits are locked.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Input
                type="date"
                min={minAppointmentDate}
                max={maxAppointmentDate}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={appointmentHour}
                onChange={(e) => setAppointmentHour(e.target.value)}
              >
                <option value="">Hour</option>
                {Array.from({ length: 12 }, (_, idx) => {
                  const value = String(idx + 1).padStart(2, '0');
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={appointmentMinute}
                onChange={(e) => setAppointmentMinute(e.target.value)}
              >
                <option value="">Minute</option>
                {Array.from({ length: 60 }, (_, idx) => {
                  const value = String(idx).padStart(2, '0');
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={appointmentPeriod}
                onChange={(e) => setAppointmentPeriod(e.target.value)}
              >
                <option value="">AM/PM</option>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isLocked && (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Appointment'}
              </Button>
            )}
            <Link href={`${ws}/visits/${encodeURIComponent(visitId)}`}>
              <Button type="button" variant="outline">
                Open Visit
              </Button>
            </Link>
            <Link href={`${ws}/manage-appointments`}>
              <Button type="button" variant="outline">
                Back to Appointments Center
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
