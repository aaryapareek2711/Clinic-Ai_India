'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';

type CareprepStatus = 'not_sent' | 'pending' | 'completed';

interface ScheduledAppointment {
  id: string;
  patient: { id: string; name: string };
  time: string;
  scheduledStart?: string;
  isScheduled: boolean;
  reason: string;
  careprepStatus: CareprepStatus;
  workflowVisitId?: string;
}

interface QuickTemplateItem {
  id: string;
  name: string;
  description: string;
}

const LOCAL_APPOINTMENTS_KEY = 'provider_local_appointments';

export default function WorkspaceDashboard() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const { user } = useAuthStore();
  const router = useRouter();

  const [appointments, setAppointments] = useState<ScheduledAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingVisitId, setOpeningVisitId] = useState<string | null>(null);
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplateItem[]>([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.id) return;

      const mergedAppointments: ScheduledAppointment[] = [];
      try {
        const response = await apiClient.getProviderUpcomingVisits(user.id);
        if (response && response.appointments) {
          const mapped: ScheduledAppointment[] = response.appointments.map((appt: any) => ({
            id: appt.appointment_id,
            patient: {
              id: appt.patient_id,
              name: appt.patient_name || 'Unknown patient',
            },
            time: appt.scheduled_start
              ? new Date(appt.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Not fixed',
            scheduledStart: appt.scheduled_start,
            isScheduled: Boolean(appt.scheduled_start),
            reason: appt.chief_complaint || 'General visit',
            careprepStatus: appt.previsit_completed ? 'completed' : 'not_sent',
            workflowVisitId: appt.visit_id || appt.appointment_id || appt.id,
          }));
          mergedAppointments.push(...mapped);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        const localAppointments = JSON.parse(localStorage.getItem(LOCAL_APPOINTMENTS_KEY) || '[]');
        const mappedLocal: ScheduledAppointment[] = localAppointments.map((item: any) => ({
          id: item.id || item.visit_id,
          patient: { id: item.patient_id, name: item.patient_name || 'Unknown patient' },
          time: item.scheduled_start
            ? new Date(item.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Not fixed',
          scheduledStart: item.scheduled_start,
          isScheduled: Boolean(item.scheduled_start),
          reason: item.type || 'Visit',
          careprepStatus: 'not_sent',
          workflowVisitId: item.id || item.visit_id,
        }));
        mergedAppointments.push(...mappedLocal);
        const deduped = Array.from(new Map(mergedAppointments.map((a) => [a.id, a])).values());
        setAppointments(deduped);
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user?.id]);

  useEffect(() => {
    const fetchQuickTemplates = async () => {
      try {
        const response = await apiClient.listTemplates({ type: 'personal', page: 1, page_size: 3 });
        const items: QuickTemplateItem[] = (response.items || []).map((item: any) => ({
          id: item.id,
          name: item.name || 'Untitled template',
          description: item.description || 'No description',
        }));
        setQuickTemplates(items);
      } catch (error) {
        console.error('Error fetching quick templates:', error);
        setQuickTemplates([]);
      }
    };
    fetchQuickTemplates();
  }, []);

  const unscheduledVisits = useMemo(() => appointments.filter((a) => !a.isScheduled), [appointments]);
  const scheduledVisits = useMemo(() => appointments.filter((a) => a.isScheduled), [appointments]);
  const careprepReady = useMemo(() => scheduledVisits.filter((a) => a.careprepStatus === 'completed'), [scheduledVisits]);
  const documentationQueue = useMemo(() => scheduledVisits.slice(0, 5), [scheduledVisits]);

  const handleOpenVisit = async (visitId: string | undefined, isScheduled: boolean) => {
    if (!isScheduled) {
      toast.error('Appointment is not fixed yet. Please schedule it first.');
      return;
    }
    if (!visitId) {
      toast.error('Visit not available yet');
      return;
    }
    setOpeningVisitId(visitId);
    try {
      router.push(`${ws}/visits/${encodeURIComponent(visitId)}`);
    } finally {
      setOpeningVisitId(null);
    }
  };

  return (
    <div className="space-y-6">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: `${ws}/dashboard` },
          { label: 'Today Operations' },
        ]}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clinic Operations Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              One clear flow: register patient, schedule appointment, run intake, open visit, complete follow-through.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${ws}/registered-patients`}>
              <Button size="sm" variant="primary" leftIcon={<UserPlus className="h-4 w-4" />}>
                New registration
              </Button>
            </Link>
            <Link href={`${ws}/manage-appointments`}>
              <Button size="sm" variant="outline" leftIcon={<Calendar className="h-4 w-4" />}>
                Appointments center
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-slate-900">{appointments.length}</p>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Pending scheduling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-amber-700">{unscheduledVisits.length}</p>
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">CarePrep completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-emerald-700">{careprepReady.length}</p>
              <MessageSquare className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Ready for documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-indigo-700">{documentationQueue.length}</p>
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-700" />
            Flow-based workbench
          </CardTitle>
          <CardDescription>
            Actions are grouped by stage so the same task is not scattered across multiple sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
            <p className="mt-1 font-semibold text-slate-900">Registration + Visit</p>
            <p className="mt-1 text-xs text-slate-600">Create patient + visit without forcing immediate appointment.</p>
            <Link href={`${ws}/registered-patients`} className="mt-3 block">
              <Button size="sm" className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
                Open registration
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
            <p className="mt-1 font-semibold text-slate-900">Appointments + Queue</p>
            <p className="mt-1 text-xs text-slate-600">Fix pending scheduling and reschedule existing appointments.</p>
            <Link href={`${ws}/manage-appointments`} className="mt-3 block">
              <Button size="sm" variant="outline" className="w-full" leftIcon={<ClipboardList className="h-4 w-4" />}>
                Open appointments center
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
            <p className="mt-1 font-semibold text-slate-900">CarePrep Intake</p>
            <p className="mt-1 text-xs text-slate-600">Trigger WhatsApp intake and review Q&A responses.</p>
            <Link href="/careprep" className="mt-3 block">
              <Button size="sm" variant="outline" className="w-full" leftIcon={<MessageSquare className="h-4 w-4" />}>
                Open CarePrep
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 4</p>
            <p className="mt-1 font-semibold text-slate-900">Consult + Post-Visit</p>
            <p className="mt-1 text-xs text-slate-600">Vitals, transcription, clinical notes, and WhatsApp follow-through.</p>
            <Link href={`${ws}/visits`} className="mt-3 block">
              <Button size="sm" variant="outline" className="w-full" leftIcon={<Stethoscope className="h-4 w-4" />}>
                Open visit workspace
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending scheduling queue</CardTitle>
            <CardDescription>Unscheduled visits should be fixed here before opening visit workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
              </>
            ) : unscheduledVisits.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                No pending scheduling. Great job.
              </div>
            ) : (
              unscheduledVisits.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.patient.name}</p>
                    <p className="text-xs text-slate-500">{item.reason}</p>
                    <p className="text-xs text-amber-700">Visit ID: {item.id}</p>
                  </div>
                  <Link href={`${ws}/fix-appointment/${encodeURIComponent(item.workflowVisitId || item.id)}`}>
                    <Button size="sm" variant="outline">
                      Fix appointment
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultation queue</CardTitle>
            <CardDescription>Scheduled visits ready to open documentation workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
                <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
              </>
            ) : scheduledVisits.length === 0 ? (
              <p className="text-sm text-slate-600">No scheduled visits yet.</p>
            ) : (
              documentationQueue.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{visit.patient.name}</p>
                    <p className="text-xs text-slate-500">
                      {visit.time} • {visit.reason}
                    </p>
                    <div className="mt-1">
                      {visit.careprepStatus === 'completed' ? (
                        <Badge className="bg-emerald-100 text-emerald-700">CarePrep complete</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700">CarePrep pending</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={openingVisitId === (visit.workflowVisitId || visit.id)}
                    onClick={() => handleOpenVisit(visit.workflowVisitId || visit.id, visit.isScheduled)}
                  >
                    Open visit
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CarePrep review</CardTitle>
            <CardDescription>View Q&A and extracted chief complaint before consultation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {careprepReady.length === 0 ? (
              <p className="text-sm text-slate-600">No completed intake sessions yet.</p>
            ) : (
              careprepReady.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.patient.name}</p>
                    <p className="text-xs text-slate-500">{item.reason}</p>
                  </div>
                  <Link href={`/careprep/responses?patientId=${encodeURIComponent(item.patient.id)}`}>
                    <Button size="sm" variant="outline" leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                      View intake
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              Clinical note templates
            </CardTitle>
            <CardDescription>Use and maintain reusable templates from one place.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickTemplates.length === 0 ? (
              <p className="text-sm text-slate-600">No templates yet. Create one to speed up documentation.</p>
            ) : (
              quickTemplates.map((template) => (
                <Link key={template.id} href={`${ws}/templates`} className="block rounded-lg border p-3 hover:bg-slate-50">
                  <p className="font-medium text-slate-900 line-clamp-1">{template.name}</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{template.description}</p>
                </Link>
              ))
            )}
            <Link href={`${ws}/templates`} className="block">
              <Button size="sm" className="w-full" variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Manage templates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <WelcomeModal />
    </div>
  );
}
