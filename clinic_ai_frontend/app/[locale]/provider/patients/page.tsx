'use client';

import { useEffect, useMemo, useState } from 'react';
import { Phone, UserRound, Search, PlusCircle, Clock3, SlidersHorizontal, X } from 'lucide-react';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';

type PatientSummary = {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mrn: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  created_at?: string;
  updated_at?: string;
  latest_visit_id?: string | null;
  latest_visit_scheduled_start?: string | null;
};

type FilterKey = 'patient_name' | 'patient_id' | 'mrn' | 'mobile_number' | 'updated_date' | 'updated_time';

const FILTER_LABELS: Record<FilterKey, string> = {
  patient_name: 'Patient name',
  patient_id: 'Patient ID',
  mrn: 'MRN',
  mobile_number: 'Mobile number',
  updated_date: 'Updated date',
  updated_time: 'Updated time',
};

const toLocalDate = (value: string | undefined): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toMinutesFromDateTime = (value: string | undefined): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
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

export default function ProviderPatientsPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const router = useRouter();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [enabledFilters, setEnabledFilters] = useState<FilterKey[]>([]);
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  const [mrnFilter, setMrnFilter] = useState('');
  const [mobileFilter, setMobileFilter] = useState('');
  const [updatedDateFrom, setUpdatedDateFrom] = useState('');
  const [updatedDateTo, setUpdatedDateTo] = useState('');
  const [updatedTimeFromHour, setUpdatedTimeFromHour] = useState('');
  const [updatedTimeFromMinute, setUpdatedTimeFromMinute] = useState('');
  const [updatedTimeFromPeriod, setUpdatedTimeFromPeriod] = useState('');
  const [updatedTimeToHour, setUpdatedTimeToHour] = useState('');
  const [updatedTimeToMinute, setUpdatedTimeToMinute] = useState('');
  const [updatedTimeToPeriod, setUpdatedTimeToPeriod] = useState('');
  const [openingForPatientId, setOpeningForPatientId] = useState<string | null>(null);
  const [creatingVisitForPatientId, setCreatingVisitForPatientId] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        const list = await apiClient.getPatients(1, 500);
        const rows = Array.isArray(list) ? list : [];
        const sorted = [...rows].sort((a: PatientSummary, b: PatientSummary) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        });
        setPatients(sorted);
      } catch (error: any) {
        console.error('Error loading patients:', error);
        toast.error(error?.response?.data?.detail || 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) =>
      {
        const matchesSearch =
          !q ||
          [p.full_name, p.patient_id, p.mrn, p.phone_number, p.gender]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q);
        if (!matchesSearch) return false;

        if (enabledFilters.includes('patient_name')) {
          const term = patientNameFilter.trim().toLowerCase();
          if (term && !String(p.full_name || '').toLowerCase().includes(term)) return false;
        }
        if (enabledFilters.includes('patient_id')) {
          const term = patientIdFilter.trim().toLowerCase();
          if (term && !String(p.patient_id || '').toLowerCase().includes(term)) return false;
        }
        if (enabledFilters.includes('mrn')) {
          const term = mrnFilter.trim().toLowerCase();
          if (term && !String(p.mrn || '').toLowerCase().includes(term)) return false;
        }
        if (enabledFilters.includes('mobile_number')) {
          const term = mobileFilter.trim();
          if (term && !String(p.phone_number || '').includes(term)) return false;
        }
        if (enabledFilters.includes('updated_date')) {
          const date = toLocalDate(p.updated_at);
          if (updatedDateFrom && (!date || date < updatedDateFrom)) return false;
          if (updatedDateTo && (!date || date > updatedDateTo)) return false;
        }
        if (enabledFilters.includes('updated_time')) {
          const value = toMinutesFromDateTime(p.updated_at);
          const fromValue = toMinutesFromTime(updatedTimeFromHour, updatedTimeFromMinute, updatedTimeFromPeriod);
          const toValue = toMinutesFromTime(updatedTimeToHour, updatedTimeToMinute, updatedTimeToPeriod);
          if (fromValue !== null && (value === null || value < fromValue)) return false;
          if (toValue !== null && (value === null || value > toValue)) return false;
        }
        return true;
      }
    );
  }, [
    patients,
    search,
    enabledFilters,
    patientNameFilter,
    patientIdFilter,
    mrnFilter,
    mobileFilter,
    updatedDateFrom,
    updatedDateTo,
    updatedTimeFromHour,
    updatedTimeFromMinute,
    updatedTimeFromPeriod,
    updatedTimeToHour,
    updatedTimeToMinute,
    updatedTimeToPeriod,
  ]);

  const stats = useMemo(() => {
    const total = patients.length;
    const withPhone = patients.filter((p) => Boolean(p.phone_number)).length;
    const updatedToday = patients.filter((p) => {
      if (!p.updated_at) return false;
      const dt = new Date(p.updated_at);
      const now = new Date();
      return (
        dt.getFullYear() === now.getFullYear() &&
        dt.getMonth() === now.getMonth() &&
        dt.getDate() === now.getDate()
      );
    }).length;
    return { total, withPhone, updatedToday };
  }, [patients]);

  const handleOpenVisit = async (patientId: string) => {
    setOpeningForPatientId(patientId);
    try {
      const response = await apiClient.getLatestVisitForPatient(patientId);
      if (!response?.visit_id) {
        toast.error('No visit found for this patient');
        return;
      }
      router.push(`${ws}/visits/${encodeURIComponent(response.visit_id)}`);
    } catch (error: any) {
      console.error('Error opening existing visit from patient list:', error);
      toast.error(error?.response?.data?.detail || 'Failed to open existing visit');
    } finally {
      setOpeningForPatientId(null);
    }
  };

  const handleCreateVisit = async (patientId: string) => {
    setCreatingVisitForPatientId(patientId);
    try {
      const response = await apiClient.createVisitFromPatient(patientId);
      if (!response?.visit_id) {
        toast.error('Visit could not be created');
        return;
      }
      toast.success('New visit created');
      router.push(`${ws}/visits/${encodeURIComponent(response.visit_id)}`);
    } catch (error: any) {
      console.error('Error creating visit from patient list:', error);
      toast.error(error?.response?.data?.detail || 'Failed to create new visit');
    } finally {
      setCreatingVisitForPatientId(null);
    }
  };

  const handleFixAppointment = async (patientId: string) => {
    try {
      const response = await apiClient.getLatestVisitForPatient(patientId);
      if (!response?.visit_id) {
        toast.error('No visit found for this patient');
        return;
      }
      router.push(`${ws}/fix-appointment/${encodeURIComponent(response.visit_id)}`);
    } catch (error: any) {
      console.error('Error opening fix appointment page:', error);
      toast.error(error?.response?.data?.detail || 'Failed to open fix appointment');
    }
  };

  const availableFilterOptions = ([
    'patient_name',
    'patient_id',
    'mrn',
    'mobile_number',
    'updated_date',
    'updated_time',
  ] as FilterKey[]).filter((key) => !enabledFilters.includes(key));

  const addFilter = (key: FilterKey) => {
    setEnabledFilters((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeFilter = (key: FilterKey) => {
    setEnabledFilters((prev) => prev.filter((item) => item !== key));
    if (key === 'patient_name') setPatientNameFilter('');
    if (key === 'patient_id') setPatientIdFilter('');
    if (key === 'mrn') setMrnFilter('');
    if (key === 'mobile_number') setMobileFilter('');
    if (key === 'updated_date') {
      setUpdatedDateFrom('');
      setUpdatedDateTo('');
    }
    if (key === 'updated_time') {
      setUpdatedTimeFromHour('');
      setUpdatedTimeFromMinute('');
      setUpdatedTimeFromPeriod('');
      setUpdatedTimeToHour('');
      setUpdatedTimeToMinute('');
      setUpdatedTimeToPeriod('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
          <p className="text-slate-600 mt-1">Latest updated patients appear first</p>
        </div>
        <Link href={`${ws}/registered-patients`}>
          <Button variant="outline">Register New Patient</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total patients</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Updated today</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{stats.updatedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Reachable by phone</p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.withPhone}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Patient list
          </CardTitle>
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
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
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
                <Input value={patientNameFilter} onChange={(e) => setPatientNameFilter(e.target.value)} placeholder="Patient name" />
              )}
              {enabledFilters.includes('patient_id') && (
                <Input value={patientIdFilter} onChange={(e) => setPatientIdFilter(e.target.value)} placeholder="Patient ID" />
              )}
              {enabledFilters.includes('mrn') && (
                <Input value={mrnFilter} onChange={(e) => setMrnFilter(e.target.value)} placeholder="MRN" />
              )}
              {enabledFilters.includes('mobile_number') && (
                <Input value={mobileFilter} onChange={(e) => setMobileFilter(e.target.value)} placeholder="Mobile number" />
              )}
              {enabledFilters.includes('updated_date') && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="date" value={updatedDateFrom} onChange={(e) => setUpdatedDateFrom(e.target.value)} />
                  <Input type="date" value={updatedDateTo} onChange={(e) => setUpdatedDateTo(e.target.value)} />
                </div>
              )}
              {enabledFilters.includes('updated_time') && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Updated time range (12-hour format)</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-2">
                      <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={updatedTimeFromHour} onChange={(e) => setUpdatedTimeFromHour(e.target.value)}>
                        <option value="">From hour</option>
                        {Array.from({ length: 12 }, (_, index) => {
                          const value = String(index + 1).padStart(2, '0');
                          return <option key={value} value={value}>{value}</option>;
                        })}
                      </select>
                      <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={updatedTimeFromMinute} onChange={(e) => setUpdatedTimeFromMinute(e.target.value)}>
                        <option value="">Minute</option>
                        {Array.from({ length: 60 }, (_, index) => {
                          const value = String(index).padStart(2, '0');
                          return <option key={value} value={value}>{value}</option>;
                        })}
                      </select>
                      <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={updatedTimeFromPeriod} onChange={(e) => setUpdatedTimeFromPeriod(e.target.value)}>
                        <option value="">AM/PM</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={updatedTimeToHour} onChange={(e) => setUpdatedTimeToHour(e.target.value)}>
                        <option value="">To hour</option>
                        {Array.from({ length: 12 }, (_, index) => {
                          const value = String(index + 1).padStart(2, '0');
                          return <option key={value} value={value}>{value}</option>;
                        })}
                      </select>
                      <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={updatedTimeToMinute} onChange={(e) => setUpdatedTimeToMinute(e.target.value)}>
                        <option value="">Minute</option>
                        {Array.from({ length: 60 }, (_, index) => {
                          const value = String(index).padStart(2, '0');
                          return <option key={value} value={value}>{value}</option>;
                        })}
                      </select>
                      <select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={updatedTimeToPeriod} onChange={(e) => setUpdatedTimeToPeriod(e.target.value)}>
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

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, patient ID, MRN, phone..."
            className="mb-4"
          />

          {loading ? (
            <p className="text-slate-600">Loading patients...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-600">No patients found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        {p.full_name}
                      </p>
                      <p className="text-sm text-slate-500">Patient ID: {p.patient_id} | MRN: {p.mrn}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Updated: {p.updated_at ? new Date(p.updated_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <p><strong>Age:</strong> {p.age ?? 'N/A'}</p>
                    <p><strong>Gender:</strong> {p.gender || 'N/A'}</p>
                    <p className="flex items-center gap-1"><Phone className="h-4 w-4" /> {p.phone_number || 'N/A'}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFixAppointment(p.patient_id)}
                    >
                      {p.latest_visit_scheduled_start ? 'Edit Appointment' : 'Fix Appointment'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateVisit(p.patient_id)}
                      disabled={creatingVisitForPatientId === p.patient_id}
                    >
                      {creatingVisitForPatientId === p.patient_id ? (
                        'Creating...'
                      ) : (
                        <>
                          <PlusCircle className="mr-1 h-4 w-4" />
                          New Visit
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenVisit(p.patient_id)}
                      disabled={openingForPatientId === p.patient_id}
                    >
                      {openingForPatientId === p.patient_id ? (
                        'Opening...'
                      ) : (
                        <>
                          <Clock3 className="mr-1 h-4 w-4" />
                          Open Latest Visit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
