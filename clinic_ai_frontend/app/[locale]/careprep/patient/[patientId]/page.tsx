'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';
import { localizedWorkspacePath } from '@/lib/workspace/resolver';

interface VisitItem {
  visit_id: string;
  status?: string;
  scheduled_start?: string;
  created_at?: string;
}
const ITEMS_PER_PAGE = 10;

export default function CarePrepPatientPage({ params }: { params: { patientId: string } }) {
  const patientId = decodeURIComponent(params.patientId || '');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitSearchHint = searchParams?.get('visitSearch') || '';
  const withLocale = (href: string) => localizedWorkspacePath(pathname, href);
  const carePrepBase = withLocale('/careprep');

  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visitSearch, setVisitSearch] = useState(visitSearchHint);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadVisits = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.getPatientVisits(patientId);
        const safeVisits = (Array.isArray(response) ? response : [])
          .map((item: any) => ({
            visit_id: String(item.visit_id || item.id || '').trim(),
            status: item.status || '',
            scheduled_start: item.scheduled_start || '',
            created_at: item.created_at || '',
          }))
          .filter((item: VisitItem) => Boolean(item.visit_id));

        setVisits(safeVisits);

        if (safeVisits.length === 1) {
          router.replace(
            `${carePrepBase}/visit/${encodeURIComponent(safeVisits[0].visit_id)}?patientId=${encodeURIComponent(
              patientId,
            )}&from=single-visit`,
          );
          return;
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load patient visits');
        setVisits([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (patientId) {
      loadVisits();
    } else {
      setIsLoading(false);
      setVisits([]);
    }
  }, [patientId, router, carePrepBase]);

  const filteredVisits = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter((item) =>
      [item.visit_id, item.status, item.scheduled_start].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [visits, visitSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [visitSearch, visits.length]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / ITEMS_PER_PAGE));
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVisits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVisits, currentPage]);

  const openVisit = (visitIdRaw: string) => {
    const safeVisitId = String(visitIdRaw || '').trim();
    if (!safeVisitId) return;
    router.push(`${carePrepBase}/visit/${encodeURIComponent(safeVisitId)}?patientId=${encodeURIComponent(patientId)}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <FlowBreadcrumb
        items={[
          { label: 'CarePrep Intake Browser', href: carePrepBase },
          { label: `Patient ${patientId}` },
        ]}
        className="mb-3"
      />

      <div className="flex items-center gap-4 mb-6">
        <Link href={carePrepBase} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Select Visit</h1>
          <p className="text-gray-600">Patient ID: {patientId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Visits</CardTitle>
          <CardDescription>
            If patient has multiple visits, choose one visit to open intake question and answer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={visitSearch}
            onChange={(e) => setVisitSearch(e.target.value)}
            placeholder="Search visit by visit ID or status..."
          />
          {isLoading ? (
            <>
              <div className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
              <div className="h-14 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
            </>
          ) : filteredVisits.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No visits found for this patient.
            </div>
          ) : (
            <>
              {paginatedVisits.map((visit) => (
              <div key={visit.visit_id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-slate-900">{visit.visit_id}</p>
                  <p className="text-xs text-slate-600">
                    {visit.status ? `Status: ${visit.status}` : 'Status: -'}
                    {visit.scheduled_start ? ` • Scheduled: ${new Date(visit.scheduled_start).toLocaleString()}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openVisit(visit.visit_id)} leftIcon={<CalendarClock className="h-4 w-4" />}>
                  View Q&A
                </Button>
              </div>
              ))}
              <div className="pt-2 flex items-center justify-between">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
