'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CalendarClock, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';

type VisitRow = {
  visit_id: string;
  patient_id: string;
  patient_name: string;
  scheduled_start?: string;
  chief_complaint?: string;
  status?: string;
};

type AppointmentFilterKey = 'visit_wise' | 'date_wise' | 'time_wise';
const FILTER_LABELS: Record<AppointmentFilterKey, string> = {
  visit_wise: 'Visit wise',
  date_wise: 'Date wise',
  time_wise: 'Time wise',
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
  if (Number.isNaN(hour) || minuteStr === undefined) {
    return { hour: '', minute: '', period: '' };
  }
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour: String(hour12).padStart(2, '0'), minute: minuteStr, period };
};

const extractScheduledDate = (scheduledStart?: string) => {
  if (!scheduledStart) return '';
  return scheduledStart.split('T')[0] || '';
};

const extractScheduledTime = (scheduledStart?: string) => {
  if (!scheduledStart) return '';
  const timePart = scheduledStart.split('T')[1] || '';
  return timePart.slice(0, 5);
};

export default function ManageAppointmentsPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingVisitId, setSavingVisitId] = useState<string | null>(null);
  const [cancellingVisitId, setCancellingVisitId] = useState<string | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const loadErrorToastShown = useRef(false);

  const [dateByVisit, setDateByVisit] = useState<Record<string, string>>({});
  const [hourByVisit, setHourByVisit] = useState<Record<string, string>>({});
  const [minuteByVisit, setMinuteByVisit] = useState<Record<string, string>>({});
  const [periodByVisit, setPeriodByVisit] = useState<Record<string, string>>({});
  const [includeWithAppointment, setIncludeWithAppointment] = useState(true);
  const [includeWithoutAppointment, setIncludeWithoutAppointment] = useState(true);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [timeFromHour, setTimeFromHour] = useState('');
  const [timeFromMinute, setTimeFromMinute] = useState('');
  const [timeFromPeriod, setTimeFromPeriod] = useState('');
  const [timeToHour, setTimeToHour] = useState('');
  const [timeToMinute, setTimeToMinute] = useState('');
  const [timeToPeriod, setTimeToPeriod] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [enabledFilters, setEnabledFilters] = useState<AppointmentFilterKey[]>([]);

  const minAppointmentDate = useMemo(() => toLocalDateString(new Date()), []);
  const maxAppointmentDate = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + 7);
    return toLocalDateString(max);
  }, []);

  const loadVisits = async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiClient.getProviderUpcomingVisits(user.id);
      const mapped: VisitRow[] = (response.appointments || []).map((appt) => ({
        visit_id: appt.visit_id || appt.appointment_id,
        patient_id: appt.patient_id,
        patient_name: appt.patient_name || 'Unknown Patient',
        scheduled_start: appt.scheduled_start,
        chief_complaint: appt.chief_complaint,
        status: appt.status,
      }));
      setVisits(mapped);
      const nextDateByVisit: Record<string, string> = {};
      const nextHourByVisit: Record<string, string> = {};
      const nextMinuteByVisit: Record<string, string> = {};
      const nextPeriodByVisit: Record<string, string> = {};

      mapped.forEach((visit) => {
        const date = extractScheduledDate(visit.scheduled_start);
        const time24 = extractScheduledTime(visit.scheduled_start);
        const time12 = fromTwentyFourToTwelve(time24);
        nextDateByVisit[visit.visit_id] = date;
        nextHourByVisit[visit.visit_id] = time12.hour;
        nextMinuteByVisit[visit.visit_id] = time12.minute;
        nextPeriodByVisit[visit.visit_id] = time12.period;
      });

      setDateByVisit(nextDateByVisit);
      setHourByVisit(nextHourByVisit);
      setMinuteByVisit(nextMinuteByVisit);
      setPeriodByVisit(nextPeriodByVisit);
      loadErrorToastShown.current = false;
    } catch (error: any) {
      const detail = error?.response?.data?.detail || 'Failed to load visits';
      setLoadError(detail);
      if (!loadErrorToastShown.current) {
        toast.error(detail);
        loadErrorToastShown.current = true;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!user?.id) return;
    loadVisits();
  }, [isAuthenticated, user?.id, router]);

  const filteredVisits = useMemo(() => {
    const timeFromFilter = toTwentyFourHourTime(timeFromHour, timeFromMinute, timeFromPeriod);
    const timeToFilter = toTwentyFourHourTime(timeToHour, timeToMinute, timeToPeriod);
    return visits.filter((visit) => {
      if (enabledFilters.includes('visit_wise')) {
        const hasAppointment = Boolean(visit.scheduled_start);
        const treatVisitWiseAsAll = !includeWithAppointment && !includeWithoutAppointment;
        if (!treatVisitWiseAsAll) {
          if (!includeWithAppointment && hasAppointment) return false;
          if (!includeWithoutAppointment && !hasAppointment) return false;
        }
      }

      const scheduledDate = extractScheduledDate(visit.scheduled_start);
      if (enabledFilters.includes('date_wise')) {
        if (dateFromFilter && (!scheduledDate || scheduledDate < dateFromFilter)) return false;
        if (dateToFilter && (!scheduledDate || scheduledDate > dateToFilter)) return false;
      }

      const scheduledTime = extractScheduledTime(visit.scheduled_start);
      if (enabledFilters.includes('time_wise') && (timeFromFilter || timeToFilter)) {
        if (!scheduledTime) return false;
        if (timeFromFilter && scheduledTime < timeFromFilter) return false;
        if (timeToFilter && scheduledTime > timeToFilter) return false;
      }
      return true;
    });
  }, [
    visits,
    enabledFilters,
    includeWithAppointment,
    includeWithoutAppointment,
    dateFromFilter,
    dateToFilter,
    timeFromHour,
    timeFromMinute,
    timeFromPeriod,
    timeToHour,
    timeToMinute,
    timeToPeriod,
  ]);

  const summary = useMemo(() => {
    const total = visits.length;
    const fixed = visits.filter((v) => Boolean(v.scheduled_start)).length;
    const pending = total - fixed;
    return { total, fixed, pending };
  }, [visits]);

  const prioritizedVisits = useMemo(() => {
    const pending = filteredVisits.filter((visit) => !visit.scheduled_start);
    const fixed = filteredVisits.filter((visit) => Boolean(visit.scheduled_start));
    return [...pending, ...fixed];
  }, [filteredVisits]);

  const handleSchedule = async (event: FormEvent, visitId: string) => {
    event.preventDefault();
    const appointmentDate = dateByVisit[visitId] || '';
    const appointmentTime = toTwentyFourHourTime(
      hourByVisit[visitId] || '',
      minuteByVisit[visitId] || '',
      periodByVisit[visitId] || '',
    );

    if (!appointmentDate || !appointmentTime) {
      toast.error('Please select date and time');
      return;
    }

    setSavingVisitId(visitId);
    try {
      const response = await apiClient.scheduleVisitIntake(visitId, {
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      });
      setVisits((prev) =>
        prev.map((visit) =>
          visit.visit_id === visitId ? { ...visit, scheduled_start: response.scheduled_start } : visit,
        ),
      );
      if (response.intake_skipped_existing_session) {
        toast('Appointment booked. Intake already existed for this visit.', { icon: 'ℹ️' });
      } else if (response.whatsapp_triggered) {
        toast.success('Appointment booked and WhatsApp intake triggered.');
      } else {
        toast.success('Appointment booked.');
      }
      const selectedTime = fromTwentyFourToTwelve(appointmentTime);
      setDateByVisit((prev) => ({ ...prev, [visitId]: appointmentDate }));
      setHourByVisit((prev) => ({ ...prev, [visitId]: selectedTime.hour }));
      setMinuteByVisit((prev) => ({ ...prev, [visitId]: selectedTime.minute }));
      setPeriodByVisit((prev) => ({ ...prev, [visitId]: selectedTime.period }));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setSavingVisitId(null);
    }
  };

  const handleResetFilters = () => {
    setIncludeWithAppointment(true);
    setIncludeWithoutAppointment(true);
    setDateFromFilter('');
    setDateToFilter('');
    setRangeStartDate('');
    setRangeEndDate('');
    setTimeFromHour('');
    setTimeFromMinute('');
    setTimeFromPeriod('');
    setTimeToHour('');
    setTimeToMinute('');
    setTimeToPeriod('');
    setEnabledFilters([]);
  };

  const availableFilterOptions = (['visit_wise', 'date_wise', 'time_wise'] as AppointmentFilterKey[]).filter(
    (key) => !enabledFilters.includes(key),
  );

  const addFilter = (key: AppointmentFilterKey) => {
    setEnabledFilters((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeFilter = (key: AppointmentFilterKey) => {
    setEnabledFilters((prev) => prev.filter((item) => item !== key));
    if (key === 'visit_wise') {
      setIncludeWithAppointment(true);
      setIncludeWithoutAppointment(true);
    }
    if (key === 'date_wise') {
      setDateFromFilter('');
      setDateToFilter('');
      setRangeStartDate('');
      setRangeEndDate('');
    }
    if (key === 'time_wise') {
      setTimeFromHour('');
      setTimeFromMinute('');
      setTimeFromPeriod('');
      setTimeToHour('');
      setTimeToMinute('');
      setTimeToPeriod('');
    }
  };

  const isLockedVisit = (status?: string) => {
    const normalized = String(status || '').toLowerCase();
    return ['completed', 'cancelled', 'closed', 'ended'].includes(normalized);
  };

  const statusBadgeClass = (status?: string) => {
    const normalized = String(status || 'open').toLowerCase();
    if (normalized === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (normalized === 'cancelled') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (normalized === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const handleCancelVisit = async (visitId: string) => {
    setCancellingVisitId(visitId);
    try {
      const response = await apiClient.cancelVisit(visitId);
      setVisits((prev) =>
        prev.map((visit) =>
          visit.visit_id === visitId
            ? { ...visit, status: response.status, scheduled_start: response.scheduled_start }
            : visit,
        ),
      );
      setExpandedVisitId((prev) => (prev === visitId ? null : prev));
      toast.success('Visit cancelled');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to cancel visit');
    } finally {
      setCancellingVisitId(null);
    }
  };

  return (
    <div className="space-y-6">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: `${ws}/dashboard` },
          { label: 'Appointments Center' },
        ]}
      />

      <div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manage Appointments</h1>
          <p className="text-slate-600 mt-1">
            Single place to book pending appointments and update already scheduled visits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Total visits</p><p className="text-3xl font-bold text-slate-900">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Appointment booked</p><p className="text-3xl font-bold text-green-700">{summary.fixed}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Needs scheduling</p><p className="text-3xl font-bold text-amber-700">{summary.pending}</p></CardContent></Card>
      </div>

      <Card className="sticky top-0 z-10 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle>Filter Appointments</CardTitle>
          <CardDescription>Apply visit, date, and time filters together.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Filter
            </Button>
          </div>

          {showFilters && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-700">Add filter:</p>
                <select
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value as AppointmentFilterKey;
                    if (value) addFilter(value);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>Select filter</option>
                  {availableFilterOptions.map((key) => (
                    <option key={key} value={key}>{FILTER_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {enabledFilters.map((key) => (
                  <span key={key} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {FILTER_LABELS[key]}
                    <button type="button" onClick={() => removeFilter(key)} className="text-slate-500 hover:text-slate-800">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {enabledFilters.includes('visit_wise') && <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Visit wise</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={includeWithAppointment}
                onChange={(e) => setIncludeWithAppointment(e.target.checked)}
              />
              Visit with appointment
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={includeWithoutAppointment}
                onChange={(e) => setIncludeWithoutAppointment(e.target.checked)}
              />
              Visit without appointment
            </label>
          </div>}

          {enabledFilters.includes('date_wise') && <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Date wise</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} />
              <Input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} />
            </div>
          </div>}

          {enabledFilters.includes('time_wise') && <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Time wise</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Time range (12-hour format)</p>
              <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timeFromHour}
                    onChange={(e) => setTimeFromHour(e.target.value)}
                  >
                    <option value="">From hour</option>
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = String(index + 1).padStart(2, '0');
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timeFromMinute}
                    onChange={(e) => setTimeFromMinute(e.target.value)}
                  >
                    <option value="">Minute</option>
                    {Array.from({ length: 60 }, (_, index) => {
                      const value = String(index).padStart(2, '0');
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timeFromPeriod}
                    onChange={(e) => setTimeFromPeriod(e.target.value)}
                  >
                    <option value="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timeToHour}
                    onChange={(e) => setTimeToHour(e.target.value)}
                  >
                    <option value="">To hour</option>
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = String(index + 1).padStart(2, '0');
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timeToMinute}
                    onChange={(e) => setTimeToMinute(e.target.value)}
                  >
                    <option value="">Minute</option>
                    {Array.from({ length: 60 }, (_, index) => {
                      const value = String(index).padStart(2, '0');
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={timeToPeriod}
                    onChange={(e) => setTimeToPeriod(e.target.value)}
                  >
                    <option value="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
            </div>
          </div>}

              <div className="pt-2">
              <Button type="button" variant="outline" className="w-full" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Scheduling Worklist
          </CardTitle>
          <CardDescription>
            Pending scheduling appears first. Complete/cancelled visits remain locked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="space-y-3">
              <div className="h-20 rounded-md border border-slate-200 bg-slate-100 animate-pulse" />
              <div className="h-20 rounded-md border border-slate-200 bg-slate-100 animate-pulse" />
              <div className="h-20 rounded-md border border-slate-200 bg-slate-100 animate-pulse" />
            </div>
          )}
          {!loading && loadError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadVisits}>
                Retry
              </Button>
            </div>
          )}
          {!loading && !loadError && prioritizedVisits.length === 0 && (
            <p className="text-sm text-gray-600">No visits match the selected filters.</p>
          )}
          {!loading && !loadError && prioritizedVisits.map((visit) => (
            <div key={visit.visit_id} className="rounded-md border p-3 transition-colors hover:bg-slate-50">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{visit.patient_name}</p>
                  <p className="text-xs text-gray-600">Visit ID: {visit.visit_id}</p>
                  <p className={`text-xs mt-1 ${visit.scheduled_start ? 'text-green-700' : 'text-amber-700'}`}>
                    {visit.scheduled_start ? 'Appointment is fixed.' : 'Appointment is not fixed yet.'}
                  </p>
                  {visit.scheduled_start && (
                    <p className="text-xs text-gray-600">
                      Current appointment: {new Date(visit.scheduled_start).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(visit.status)}`}>
                    {(visit.status || 'open').replace('_', ' ')}
                  </span>
                  {visit.scheduled_start && !isLockedVisit(visit.status) && (
                    <Link href={`${ws}/visits/${encodeURIComponent(visit.visit_id)}`}>
                      <Button type="button" size="sm">
                        Open visit
                      </Button>
                    </Link>
                  )}
                  {isLockedVisit(visit.status) ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      Locked
                    </span>
                  ) : visit.scheduled_start ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpandedVisitId((prev) => (prev === visit.visit_id ? null : visit.visit_id))
                      }
                    >
                      {expandedVisitId === visit.visit_id ? (
                        <>
                          Hide editor <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Edit schedule <ChevronDown className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : null}
                  {!isLockedVisit(visit.status) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={cancellingVisitId === visit.visit_id}
                      onClick={() => handleCancelVisit(visit.visit_id)}
                    >
                      {cancellingVisitId === visit.visit_id ? 'Cancelling...' : 'Cancel visit'}
                    </Button>
                  )}
                </div>
              </div>
              {(expandedVisitId === visit.visit_id || !visit.scheduled_start) && !isLockedVisit(visit.status) && (
                <form
                  className="grid grid-cols-1 md:grid-cols-5 gap-2"
                  onSubmit={(e) => handleSchedule(e, visit.visit_id)}
                >
                  <Input
                    type="date"
                    min={minAppointmentDate}
                    max={maxAppointmentDate}
                    value={dateByVisit[visit.visit_id] || ''}
                    onChange={(e) => setDateByVisit((prev) => ({ ...prev, [visit.visit_id]: e.target.value }))}
                    required
                  />
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={hourByVisit[visit.visit_id] || ''}
                    onChange={(e) => setHourByVisit((prev) => ({ ...prev, [visit.visit_id]: e.target.value }))}
                    required
                  >
                    <option value="">Hour</option>
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = String(index + 1).padStart(2, '0');
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={minuteByVisit[visit.visit_id] || ''}
                    onChange={(e) => setMinuteByVisit((prev) => ({ ...prev, [visit.visit_id]: e.target.value }))}
                    required
                  >
                    <option value="">Minute</option>
                    {Array.from({ length: 60 }, (_, index) => {
                      const value = String(index).padStart(2, '0');
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={periodByVisit[visit.visit_id] || ''}
                    onChange={(e) => setPeriodByVisit((prev) => ({ ...prev, [visit.visit_id]: e.target.value }))}
                    required
                  >
                    <option value="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={savingVisitId === visit.visit_id}
                  >
                    {savingVisitId === visit.visit_id
                      ? 'Saving...'
                      : visit.scheduled_start
                      ? 'Update Appointment'
                      : 'Book Appointment'}
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
