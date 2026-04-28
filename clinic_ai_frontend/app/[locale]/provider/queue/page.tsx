'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, Clock3, Play, CheckCircle2, XCircle, UserX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';
import apiClient from '@/lib/api/client';
import { localizedWorkspacePath, workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';

type VisitRow = {
  id: string;
  visit_id?: string;
  patient_id: string;
  patient_name?: string;
  visit_type: string;
  status: string;
  scheduled_start: string | null;
  chief_complaint: string | null;
};

type ActionState = {
  visitId: string;
  action: 'queue' | 'start' | 'complete' | 'cancel' | 'no_show' | null;
} | null;

export default function QueueBoardPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const withLocale = (href: string) => localizedWorkspacePath(pathname, href);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>(null);

  const loadVisits = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await apiClient.getProviderVisits(user.id);
      setVisits(response.data || []);
    } catch (error) {
      toast.error('Failed to load queue board');
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
  }, [isAuthenticated, user?.id]);

  const upcomingQueue = useMemo(
    () =>
      visits.filter((visit) => {
        const status = String(visit.status || '').toLowerCase();
        return Boolean(visit.scheduled_start) && !['completed', 'cancelled', 'closed', 'ended', 'no_show'].includes(status);
      }),
    [visits],
  );

  const grouped = useMemo(
    () => ({
      waiting: upcomingQueue.filter((visit) => ['scheduled', 'open', 'in_queue'].includes(String(visit.status || '').toLowerCase())),
      inConsult: upcomingQueue.filter((visit) => String(visit.status || '').toLowerCase() === 'in_progress'),
    }),
    [upcomingQueue],
  );

  const patchVisit = (visitId: string, patch: Partial<VisitRow>) => {
    setVisits((prev) =>
      prev.map((visit) => ((visit.visit_id || visit.id) === visitId ? { ...visit, ...patch } : visit)),
    );
  };

  const runAction = async (
    visitId: string,
    action: NonNullable<ActionState['action']>,
    runner: () => Promise<{ status: string; actual_start?: string | null; actual_end?: string | null }>,
    successMessage: string,
  ) => {
    setActionState({ visitId, action });
    try {
      const response = await runner();
      patchVisit(visitId, {
        status: response.status,
      });
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Workflow action failed');
    } finally {
      setActionState(null);
    }
  };

  const renderVisitCard = (visit: VisitRow) => {
    const visitId = visit.visit_id || visit.id;
    const status = String(visit.status || 'open').toLowerCase();
    const isBusy = actionState?.visitId === visitId;

    return (
      <div key={visitId} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{visit.patient_name || 'Unknown patient'}</p>
              <Badge className="bg-slate-100 text-slate-700">{status.replace('_', ' ')}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">Visit ID: {visitId}</p>
            <p className="text-sm text-slate-600">
              {visit.scheduled_start ? new Date(visit.scheduled_start).toLocaleString() : 'Appointment not fixed'}
            </p>
            <p className="text-xs text-slate-500">{visit.chief_complaint || visit.visit_type || 'Visit'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {status !== 'in_queue' && status !== 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  runAction(visitId, 'queue', () => apiClient.queueVisit(visitId), 'Visit moved to queue')
                }
              >
                <Clock3 className="mr-1 h-4 w-4" />
                Queue
              </Button>
            )}
            {status !== 'in_progress' && status !== 'completed' && status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  runAction(visitId, 'start', () => apiClient.startVisit(visitId), 'Consultation started')
                }
              >
                <Play className="mr-1 h-4 w-4" />
                Start consult
              </Button>
            )}
            {status !== 'completed' && status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  runAction(visitId, 'complete', () => apiClient.completeVisit(visitId), 'Visit marked completed')
                }
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Complete
              </Button>
            )}
            {status !== 'completed' && status !== 'cancelled' && status !== 'no_show' && (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  runAction(visitId, 'no_show', () => apiClient.markVisitNoShow(visitId), 'Marked as no-show')
                }
              >
                <UserX className="mr-1 h-4 w-4" />
                No-show
              </Button>
            )}
            {status !== 'completed' && status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  runAction(visitId, 'cancel', () => apiClient.cancelVisit(visitId), 'Visit cancelled')
                }
              >
                <XCircle className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            )}
            <Link href={withLocale(`${ws}/visits/${encodeURIComponent(visitId)}`)}>
              <Button size="sm">
                Open visit
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: withLocale(`${ws}/dashboard`) },
          { label: 'Queue Board' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Queue Board</h1>
        <p className="mt-1 text-slate-600">Move scheduled visits through waiting, consult, completion, or cancellation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Waiting</p><p className="text-3xl font-bold text-amber-700">{grouped.waiting.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">In consult</p><p className="text-3xl font-bold text-blue-700">{grouped.inConsult.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Today queue</p><p className="text-3xl font-bold text-slate-900">{upcomingQueue.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waiting queue</CardTitle>
          <CardDescription>Scheduled visits that can be queued or started.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-slate-600">Loading queue...</p> : grouped.waiting.length === 0 ? <p className="text-sm text-slate-600">No waiting visits.</p> : grouped.waiting.map(renderVisitCard)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In consult</CardTitle>
          <CardDescription>Visits currently being documented or ready to complete.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-slate-600">Loading consult queue...</p> : grouped.inConsult.length === 0 ? <p className="text-sm text-slate-600">No visits in consultation.</p> : grouped.inConsult.map(renderVisitCard)}
        </CardContent>
      </Card>
    </div>
  );
}
