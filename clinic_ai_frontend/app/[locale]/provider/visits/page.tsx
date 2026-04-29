'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import toast, { Toaster } from 'react-hot-toast';
import { Calendar, Clock, Search, Stethoscope, SlidersHorizontal, X } from 'lucide-react';

interface Visit {
  id: string;
  visit_id?: string;
  patient_id: string;
  patient_name?: string;
  mobile_number?: string | null;
  visit_type: string;
  status: string;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  duration_minutes: number | null;
  chief_complaint: string | null;
  created_at: string;
}

type FilterKey = 'patient_name' | 'patient_id' | 'visit_id' | 'mobile_number' | 'date' | 'time';

const FILTER_LABELS: Record<FilterKey, string> = {
  patient_name: 'Patient name',
  patient_id: 'Patient ID',
  visit_id: 'Visit ID',
  mobile_number: 'Mobile number',
  date: 'Date',
  time: 'Time',
};
const ITEMS_PER_PAGE = 10;

const toLocalDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toMinutesFromTime = (hour: string, minute: string, period: string): number | null => {
  if (!hour || !minute || !period) return null;
  const h = Number(hour);
  const m = Number(minute);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  let hour24 = h % 12;
  if (period === 'PM') hour24 += 12;
  return hour24 * 60 + m;
};

const toMinutesFromScheduledStart = (scheduledStart: string | null): number | null => {
  if (!scheduledStart) return null;
  const d = new Date(scheduledStart);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
};

export default function VisitsPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [enabledFilters, setEnabledFilters] = useState<FilterKey[]>([]);
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  const [visitIdFilter, setVisitIdFilter] = useState('');
  const [mobileFilter, setMobileFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFromHour, setTimeFromHour] = useState('');
  const [timeFromMinute, setTimeFromMinute] = useState('');
  const [timeFromPeriod, setTimeFromPeriod] = useState('');
  const [timeToHour, setTimeToHour] = useState('');
  const [timeToMinute, setTimeToMinute] = useState('');
  const [timeToPeriod, setTimeToPeriod] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!['doctor', 'nurse', 'admin', 'staff'].includes(user?.role || '')) {
      toast.error('Access denied');
      router.push('/login');
    } else {
      loadVisits();
    }
  }, [isAuthenticated, user, router]);

  const loadVisits = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getProviderVisits(user.id, filter !== 'all' ? filter : undefined);
      setVisits(response.data);
    } catch (error: any) {
      toast.error('Failed to load visits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadVisits();
    }
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const addFilter = (key: FilterKey) => {
    setEnabledFilters((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeFilter = (key: FilterKey) => {
    setEnabledFilters((prev) => prev.filter((item) => item !== key));
    if (key === 'patient_name') setPatientNameFilter('');
    if (key === 'patient_id') setPatientIdFilter('');
    if (key === 'visit_id') setVisitIdFilter('');
    if (key === 'mobile_number') setMobileFilter('');
    if (key === 'date') {
      setDateFrom('');
      setDateTo('');
    }
    if (key === 'time') {
      setTimeFromHour('');
      setTimeFromMinute('');
      setTimeFromPeriod('');
      setTimeToHour('');
      setTimeToMinute('');
      setTimeToPeriod('');
    }
  };

  if (!isAuthenticated || !['doctor', 'nurse', 'admin', 'staff'].includes(user?.role || '')) {
    return null;
  }

  const availableFilterOptions = ([
    'patient_name',
    'patient_id',
    'visit_id',
    'mobile_number',
    'date',
    'time',
  ] as FilterKey[]).filter((key) => !enabledFilters.includes(key));

  const filteredVisits = visits.filter((visit) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      [
        visit.patient_name,
        visit.id,
        visit.visit_id,
        visit.patient_id,
        visit.mobile_number,
        visit.visit_type,
        visit.status,
      ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
    if (!matchesQuery) return false;

    if (enabledFilters.includes('patient_name')) {
      const term = patientNameFilter.trim().toLowerCase();
      if (term && !String(visit.patient_name || '').toLowerCase().includes(term)) return false;
    }
    if (enabledFilters.includes('patient_id')) {
      const term = patientIdFilter.trim().toLowerCase();
      if (term && !String(visit.patient_id || '').toLowerCase().includes(term)) return false;
    }
    if (enabledFilters.includes('visit_id')) {
      const term = visitIdFilter.trim().toLowerCase();
      const visitCode = String(visit.visit_id || visit.id || '').toLowerCase();
      if (term && !visitCode.includes(term)) return false;
    }
    if (enabledFilters.includes('mobile_number')) {
      const term = mobileFilter.trim();
      if (term && !String(visit.mobile_number || '').includes(term)) return false;
    }
    if (enabledFilters.includes('date')) {
      const visitDate = toLocalDate(visit.scheduled_start);
      if (dateFrom && (!visitDate || visitDate < dateFrom)) return false;
      if (dateTo && (!visitDate || visitDate > dateTo)) return false;
    }
    if (enabledFilters.includes('time')) {
      const visitMinute = toMinutesFromScheduledStart(visit.scheduled_start);
      const fromMinute = toMinutesFromTime(timeFromHour, timeFromMinute, timeFromPeriod);
      const toMinute = toMinutesFromTime(timeToHour, timeToMinute, timeToPeriod);
      if (fromMinute !== null && (visitMinute === null || visitMinute < fromMinute)) return false;
      if (toMinute !== null && (visitMinute === null || visitMinute > toMinute)) return false;
    }

    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filter,
    query,
    enabledFilters,
    patientNameFilter,
    patientIdFilter,
    visitIdFilter,
    mobileFilter,
    dateFrom,
    dateTo,
    timeFromHour,
    timeFromMinute,
    timeFromPeriod,
    timeToHour,
    timeToMinute,
    timeToPeriod,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / ITEMS_PER_PAGE));
  const paginatedVisits = filteredVisits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = {
    total: visits.length,
    scheduled: visits.filter((v) => v.status?.toLowerCase() === 'scheduled').length,
    inProgress: visits.filter((v) => v.status?.toLowerCase() === 'in_progress').length,
    completed: visits.filter((v) => v.status?.toLowerCase() === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Visits</h1>
          <p className="text-slate-600 mt-1">Track scheduled, in-progress, and completed encounters</p>
        </div>
        <div className="flex gap-2">
          <Link href={`${ws}/dashboard`}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button variant="primary" onClick={() => router.push(`${ws}/visits/new`)}>
            + New Visit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Scheduled</p><p className="text-3xl font-bold text-amber-700">{stats.scheduled}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">In progress</p><p className="text-3xl font-bold text-blue-700">{stats.inProgress}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Completed</p><p className="text-3xl font-bold text-emerald-700">{stats.completed}</p></CardContent></Card>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', 'scheduled', 'in_progress', 'completed'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === item
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item === 'all' ? 'All' : item.replace('_', ' ')}
              </button>
            ))}
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
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient name, IDs, mobile"
              className="pl-9"
            />
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-700">Add filter:</p>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  const value = e.target.value as FilterKey;
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

            {enabledFilters.includes('patient_name') && (
              <Input
                value={patientNameFilter}
                onChange={(e) => setPatientNameFilter(e.target.value)}
                placeholder="Patient name"
              />
            )}
            {enabledFilters.includes('patient_id') && (
              <Input
                value={patientIdFilter}
                onChange={(e) => setPatientIdFilter(e.target.value)}
                placeholder="Patient ID"
              />
            )}
            {enabledFilters.includes('visit_id') && (
              <Input
                value={visitIdFilter}
                onChange={(e) => setVisitIdFilter(e.target.value)}
                placeholder="Visit ID"
              />
            )}
            {enabledFilters.includes('mobile_number') && (
              <Input
                value={mobileFilter}
                onChange={(e) => setMobileFilter(e.target.value)}
                placeholder="Mobile number"
              />
            )}
            {enabledFilters.includes('date') && (
              <div className="grid gap-3 md:grid-cols-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            )}
            {enabledFilters.includes('time') && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Time range (12-hour format)</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid grid-cols-3 gap-2">
                    <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={timeFromHour} onChange={(e) => setTimeFromHour(e.target.value)}>
                      <option value="">From hour</option>
                      {Array.from({ length: 12 }, (_, index) => {
                        const value = String(index + 1).padStart(2, '0');
                        return <option key={value} value={value}>{value}</option>;
                      })}
                    </select>
                    <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={timeFromMinute} onChange={(e) => setTimeFromMinute(e.target.value)}>
                      <option value="">Minute</option>
                      {Array.from({ length: 60 }, (_, index) => {
                        const value = String(index).padStart(2, '0');
                        return <option key={value} value={value}>{value}</option>;
                      })}
                    </select>
                    <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={timeFromPeriod} onChange={(e) => setTimeFromPeriod(e.target.value)}>
                      <option value="">AM/PM</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={timeToHour} onChange={(e) => setTimeToHour(e.target.value)}>
                      <option value="">To hour</option>
                      {Array.from({ length: 12 }, (_, index) => {
                        const value = String(index + 1).padStart(2, '0');
                        return <option key={value} value={value}>{value}</option>;
                      })}
                    </select>
                    <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={timeToMinute} onChange={(e) => setTimeToMinute(e.target.value)}>
                      <option value="">Minute</option>
                      {Array.from({ length: 60 }, (_, index) => {
                        const value = String(index).padStart(2, '0');
                        return <option key={value} value={value}>{value}</option>;
                      })}
                    </select>
                    <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={timeToPeriod} onChange={(e) => setTimeToPeriod(e.target.value)}>
                      <option value="">AM/PM</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading visits...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="p-12 text-center">
              <Stethoscope className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No visits found for this filter/search</p>
              <Button variant="primary" className="mt-4" onClick={() => router.push(`${ws}/visits/new`)}>
                Create First Visit
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {paginatedVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => {
                    if (!visit.scheduled_start) {
                      toast.error('Appointment is not fixed yet. Please schedule it first.');
                      router.push(`${ws}/book-appointment/${encodeURIComponent(visit.id)}`);
                      return;
                    }
                    router.push(`${ws}/visits/${encodeURIComponent(visit.id)}`);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {visit.patient_name || 'Unknown patient'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(visit.status)}`}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {visit.visit_type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                        <div>
                          <span className="font-medium">Patient ID:</span> {visit.patient_id || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Visit ID:</span> {visit.visit_id || visit.id}
                        </div>
                        <div>
                          <span className="font-medium">Mobile:</span> {visit.mobile_number || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span><strong>Scheduled:</strong> {formatDate(visit.scheduled_start)}</span>
                        </div>
                        {visit.actual_start && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span><strong>Started:</strong> {formatDate(visit.actual_start)}</span>
                          </div>
                        )}
                        {visit.actual_end && (
                          <div>
                            <span className="font-medium">Duration:</span> {visit.duration_minutes} minutes
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredVisits.length)} of {filteredVisits.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-600">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
