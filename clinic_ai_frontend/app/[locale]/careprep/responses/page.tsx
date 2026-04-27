'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePathname } from 'next/navigation';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';

interface QuestionnaireResponse {
  id: string;
  templateName: string;
  submittedAt: string;
  status: 'completed' | 'partial' | 'pending';
  responses: {
    question: string;
    answer: string;
    flagged?: boolean;
  }[];
}

interface CarePrepPatientRow {
  patientId: string;
  patientName: string;
  visitId: string;
  scheduledStart?: string;
}

export default function CarePrepResponsesPage() {
  const searchParams = useSearchParams();
  const patientId = decodeURIComponent(searchParams.get('patientId') || '');
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const { user } = useAuthStore();
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<QuestionnaireResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedVisitId, setResolvedVisitId] = useState<string | null>(null);
  const [carePrepPatients, setCarePrepPatients] = useState<CarePrepPatientRow[]>([]);

  useEffect(() => {
    const loadCarePrepPatientList = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const upcoming = await apiClient.getProviderUpcomingVisits(user.id);
        const appointments = Array.isArray(upcoming?.appointments) ? upcoming.appointments : [];
        const mapped = appointments
          .filter((item: any) => Boolean(item?.previsit_completed))
          .map((item: any) => ({
            patientId: String(item.patient_id || '').trim(),
            patientName: String(item.patient_name || 'Unknown patient').trim(),
            visitId: String(item.visit_id || item.appointment_id || item.id || '').trim(),
            scheduledStart: item.scheduled_start || undefined,
          }))
          .filter((item: CarePrepPatientRow) => item.patientId && item.visitId);
        const deduped = Array.from(
          new Map(mapped.map((item: CarePrepPatientRow) => [item.patientId, item])).values(),
        );
        setCarePrepPatients(deduped);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load CarePrep responses');
        setCarePrepPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    const loadIntakeSession = async () => {
      if (!patientId) {
        await loadCarePrepPatientList();
        return;
      }
      setIsLoading(true);
      try {
        const latest = await apiClient.getLatestVisitForPatient(patientId);
        const visitId = latest.visit_id;
        setResolvedVisitId(visitId);
        const intake = await apiClient.getVisitIntakeSession(visitId);
        const mapped: QuestionnaireResponse[] = intake.question_answers.length
          ? [
              {
                id: intake.visit_id,
                templateName: 'Patient Intake Session',
                submittedAt: intake.updated_at || intake.created_at || new Date().toISOString(),
                status:
                  intake.status === 'completed'
                    ? 'completed'
                    : intake.status === 'in_progress'
                    ? 'partial'
                    : 'pending',
                responses: intake.question_answers.map((qa) => ({
                  question: qa.question || 'Question',
                  answer: qa.answer || '-',
                  flagged: false,
                })),
              },
            ]
          : [];
        setResponses(mapped);
        if (mapped.length > 0) {
          setSelectedResponse(mapped[0]);
        } else {
          setSelectedResponse(null);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load intake session');
        setResponses([]);
        setSelectedResponse(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadIntakeSession();
  }, [patientId, user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="h-6 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="h-24 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
            <div className="h-24 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
            <div className="h-24 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
          </div>
          <div>
            <div className="h-80 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: `${ws}/dashboard` },
          { label: 'CarePrep Center', href: `${ws}/careprep` },
          { label: patientId ? 'Responses' : 'Response Center' },
        ]}
        className="mb-3"
      />
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${ws}/dashboard`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{patientId ? 'CarePrep Responses' : 'CarePrep Response Center'}</h1>
          {patientId ? (
            <p className="text-gray-600">
              Patient ID: {patientId}
              {resolvedVisitId ? ` • Visit: ${resolvedVisitId}` : ''}
            </p>
          ) : (
            <p className="text-gray-600">Select a patient to view CarePrep question and answer details.</p>
          )}
        </div>
      </div>

      {!patientId ? (
        <Card>
          <CardHeader>
            <CardTitle>Completed CarePrep Sessions</CardTitle>
            <CardDescription>Open a patient to view intake questions and answers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {carePrepPatients.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No completed CarePrep responses found yet.
              </div>
            ) : (
              carePrepPatients.map((item) => (
                <div key={`${item.patientId}-${item.visitId}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.patientName}</p>
                    <p className="text-xs text-slate-600">Patient ID: {item.patientId}</p>
                    {item.scheduledStart && (
                      <p className="text-xs text-slate-500">
                        Scheduled: {new Date(item.scheduledStart).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Link href={`${ws}/careprep/responses?patientId=${encodeURIComponent(item.patientId)}`}>
                    <Button size="sm" variant="outline">View Q&A</Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : responses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Responses Yet</h3>
            <p className="text-gray-500 mb-4">This patient hasn't submitted any CarePrep questionnaires.</p>
            <Link href={`/careprep/send/${encodeURIComponent(patientId)}`}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Send Questionnaire
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Submitted Questionnaires</h2>
            {responses.map((response) => (
              <Card
                key={response.id}
                className={`cursor-pointer transition-all ${
                  selectedResponse?.id === response.id
                    ? 'border-2 border-purple-500 bg-purple-50'
                    : 'hover:border-purple-300'
                }`}
                onClick={() => setSelectedResponse(response)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{response.templateName}</h3>
                    {getStatusBadge(response.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(response.submittedAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {response.responses.length} responses
                    {response.responses.some(r => r.flagged) && (
                      <span className="ml-2 text-amber-600">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Has flagged items
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {selectedResponse ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedResponse.templateName}</CardTitle>
                  <CardDescription>
                    Submitted on {formatDate(selectedResponse.submittedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedResponse.responses.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          item.flagged ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {item.flagged && (
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{item.question}</p>
                            <p className="mt-1 text-gray-900">{item.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="p-12 text-center flex flex-col items-center justify-center h-full">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">Select a questionnaire to view responses</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link href={`${ws}/dashboard`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
        {patientId && responses.length > 0 ? (
          <Link href={`/careprep/send/${encodeURIComponent(patientId)}`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Send New Questionnaire
            </Button>
          </Link>
        ) : (
          <span className="text-xs text-slate-500">Send action is available above.</span>
        )}
      </div>
    </div>
  );
}
