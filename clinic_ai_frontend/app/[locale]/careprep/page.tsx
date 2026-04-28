'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';
import { workspaceBaseFromPathname, localizedWorkspacePath } from '@/lib/workspace/resolver';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';

type FilterKey = 'patient_name' | 'patient_id' | 'visit_id' | 'mobile_number' | 'mrn';

interface PatientRecord {
  patient_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  mrn?: string;
}

const FILTER_LABELS: Record<FilterKey, string> = {
  patient_name: 'Patient Name',
  patient_id: 'Patient ID',
  visit_id: 'Visit ID',
  mobile_number: 'Mobile Number',
  mrn: 'MRN Number',
};
const ITEMS_PER_PAGE = 10;

export default function CarePrepPage() {
  const pathname = usePathname();
  const router = useRouter();
  const ws = workspaceBaseFromPathname(pathname);
  const withLocale = (href: string) => localizedWorkspacePath(pathname, href);
  const carePrepBase = withLocale('/careprep');

  const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [enabledFilters, setEnabledFilters] = useState<FilterKey[]>([]);
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [visitIdFilter, setVisitIdFilter] = useState('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  const [mobileFilter, setMobileFilter] = useState('');
  const [mrnFilter, setMrnFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true);
      try {
        const patients = await apiClient.getPatients(1, 1000);
        const safePatients = Array.isArray(patients) ? patients : [];
        setAllPatients(safePatients);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load patients');
        setAllPatients([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadPatients();
  }, []);

  const availableFilterOptions = ([
    'patient_name',
    'visit_id',
    'patient_id',
    'mobile_number',
    'mrn',
  ] as FilterKey[]).filter((key) => !enabledFilters.includes(key));

  const addFilter = (key: FilterKey) => {
    setEnabledFilters((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeFilter = (key: FilterKey) => {
    setEnabledFilters((prev) => prev.filter((item) => item !== key));
    if (key === 'patient_name') setPatientNameFilter('');
    if (key === 'visit_id') setVisitIdFilter('');
    if (key === 'patient_id') setPatientIdFilter('');
    if (key === 'mobile_number') setMobileFilter('');
    if (key === 'mrn') setMrnFilter('');
  };

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPatients
      .filter((patient) => {
        const fullName = String(patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`).trim();
        const patientId = String(patient.patient_id || '').trim();
        const phone = String(patient.phone_number || '').trim();
        const mrn = String(patient.mrn || '').trim();

        const matchesSearch =
          !q || [fullName, patientId, phone, mrn].filter(Boolean).join(' ').toLowerCase().includes(q);

        if (!matchesSearch) return false;

        if (enabledFilters.includes('patient_name')) {
          const term = patientNameFilter.trim().toLowerCase();
          if (term && !fullName.toLowerCase().includes(term)) return false;
        }
        if (enabledFilters.includes('patient_id')) {
          const term = patientIdFilter.trim().toLowerCase();
          if (term && !patientId.toLowerCase().includes(term)) return false;
        }
        if (enabledFilters.includes('mobile_number')) {
          const term = mobileFilter.trim();
          if (term && !phone.includes(term)) return false;
        }
        if (enabledFilters.includes('mrn')) {
          const term = mrnFilter.trim().toLowerCase();
          if (term && !mrn.toLowerCase().includes(term)) return false;
        }
        if (enabledFilters.includes('visit_id')) {
          // Visit filtering is resolved in the next step after selecting patient.
          // Keeping it here allows provider to pre-fill intent by visit id pattern.
          const term = visitIdFilter.trim().toLowerCase();
          if (term && !String(search || '').toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .slice(0, 300);
  }, [
    allPatients,
    search,
    enabledFilters,
    patientNameFilter,
    patientIdFilter,
    mobileFilter,
    mrnFilter,
    visitIdFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, enabledFilters, patientNameFilter, visitIdFilter, patientIdFilter, mobileFilter, mrnFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / ITEMS_PER_PAGE));
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  const openPatient = (patientIdRaw: string) => {
    const safePatientId = String(patientIdRaw || '').trim();
    if (!safePatientId) return;
    const visitHint = visitIdFilter.trim() || search.trim();
    const suffix = visitHint ? `?visitSearch=${encodeURIComponent(visitHint)}` : '';
    router.push(`${carePrepBase}/patient/${encodeURIComponent(safePatientId)}${suffix}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: withLocale(`${ws}/dashboard`) },
          { label: 'CarePrep Intake Browser' },
        ]}
        className="mb-3"
      />

      <div className="flex items-center gap-4 mb-6">
        <Link href={withLocale(`${ws}/dashboard`)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">CarePrep Intake Browser</h1>
          <p className="text-gray-600">Search patient, choose visit, then view intake question and answer.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Patient Search
          </CardTitle>
          <CardDescription>
            Search by patient name, patient id, visit id, mobile number, or MRN number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name, patient ID, visit ID, mobile, MRN..."
          />

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
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
                  <option value="" disabled>
                    Select filter
                  </option>
                  {availableFilterOptions.map((key) => (
                    <option key={key} value={key}>
                      {FILTER_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {enabledFilters.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {FILTER_LABELS[key]}
                    <button type="button" onClick={() => removeFilter(key)} className="text-slate-500 hover:text-slate-800">
                      x
                    </button>
                  </span>
                ))}
              </div>

              {enabledFilters.includes('patient_name') && (
                <Input value={patientNameFilter} onChange={(e) => setPatientNameFilter(e.target.value)} placeholder="Patient name" />
              )}
              {enabledFilters.includes('visit_id') && (
                <Input value={visitIdFilter} onChange={(e) => setVisitIdFilter(e.target.value)} placeholder="Visit ID" />
              )}
              {enabledFilters.includes('patient_id') && (
                <Input value={patientIdFilter} onChange={(e) => setPatientIdFilter(e.target.value)} placeholder="Patient ID" />
              )}
              {enabledFilters.includes('mobile_number') && (
                <Input value={mobileFilter} onChange={(e) => setMobileFilter(e.target.value)} placeholder="Mobile number" />
              )}
              {enabledFilters.includes('mrn') && (
                <Input value={mrnFilter} onChange={(e) => setMrnFilter(e.target.value)} placeholder="MRN number" />
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <div className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
              <div className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
              <div className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No patient found for your search.
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedPatients.map((patient) => {
                const fullName = String(patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`).trim();
                return (
                  <button
                    key={String(patient.patient_id)}
                    type="button"
                    onClick={() => openPatient(String(patient.patient_id))}
                    className="w-full text-left rounded-lg border px-3 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-500" />
                          <span className="truncate">{fullName || 'Unknown patient'}</span>
                        </p>
                        <p className="text-xs text-slate-600">
                          Patient ID: {patient.patient_id}
                          {patient.mrn ? ` • MRN: ${patient.mrn}` : ''}
                          {patient.phone_number ? ` • Mobile: ${patient.phone_number}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-blue-700 font-medium">Open</span>
                    </div>
                  </button>
                );
              })}
              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)} of {filteredPatients.length}
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
        </CardContent>
      </Card>
    </div>
  );
}
