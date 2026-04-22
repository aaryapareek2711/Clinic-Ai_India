'use client';

import { useEffect, useMemo, useState } from 'react';
import { Phone, UserRound, CalendarDays, Search } from 'lucide-react';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type PatientSummary = {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  mrn: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  created_at?: string;
  updated_at?: string;
};

export default function ProviderPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openingForPatientId, setOpeningForPatientId] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        const list = await apiClient.getPatients(1, 500);
        const rows = Array.isArray(list) ? list : [];
        const sorted = [...rows].sort((a: PatientSummary, b: PatientSummary) => {
          const aTime = new Date(a.updated_at || a.created_at || a.date_of_birth || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || b.date_of_birth || 0).getTime();
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
    if (!q) return patients;
    return patients.filter((p) =>
      [p.full_name, p.patient_id, p.mrn, p.phone_number, p.gender]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [patients, search]);

  const handleOpenVisit = async (patientId: string) => {
    setOpeningForPatientId(patientId);
    try {
      const response = await apiClient.getLatestVisitForPatient(patientId);
      if (!response?.visit_id) {
        toast.error('No visit found for this patient');
        return;
      }
      router.push(`/provider/visits/${response.visit_id}`);
    } catch (error: any) {
      console.error('Error opening existing visit from patient list:', error);
      toast.error(error?.response?.data?.detail || 'Failed to open existing visit');
    } finally {
      setOpeningForPatientId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
          <p className="text-slate-600 mt-1">Latest updated patients appear first</p>
        </div>
        <Link href="/provider/registered-patients">
          <Button variant="outline">Register New Patient</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Patient List
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <p className="sm:col-span-3 flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" /> DOB: {p.date_of_birth || 'N/A'}
                    </p>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleOpenVisit(p.patient_id)}
                      disabled={openingForPatientId === p.patient_id}
                    >
                      {openingForPatientId === p.patient_id ? 'Opening...' : 'Open Visit'}
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
