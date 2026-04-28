'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api/client';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';
import { localizedWorkspacePath } from '@/lib/workspace/resolver';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QAItem {
  question: string;
  answer: string;
}

export default function CarePrepVisitPage({ params }: { params: { visitId: string } }) {
  const visitId = decodeURIComponent(params.visitId || '');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const withLocale = (href: string) => localizedWorkspacePath(pathname, href);
  const carePrepBase = withLocale('/careprep');
  const patientIdFromQuery = searchParams.get('patientId') || '';
  const from = searchParams.get('from') || '';

  const [patientId, setPatientId] = useState(patientIdFromQuery);
  const [status, setStatus] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [qa, setQa] = useState<QAItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadIntake = async () => {
      setIsLoading(true);
      try {
        const intake = await apiClient.getVisitIntakeSession(visitId);
        setPatientId(String(intake.patient_id || patientIdFromQuery || ''));
        setStatus(String(intake.status || ''));
        setSubmittedAt(String(intake.updated_at || intake.created_at || ''));
        setQa(
          Array.isArray(intake.question_answers)
            ? intake.question_answers.map((item: any) => ({
                question: String(item.question || 'Question'),
                answer: String(item.answer || '-'),
              }))
            : [],
        );
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load intake session');
        setQa([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (visitId) {
      loadIntake();
    } else {
      setIsLoading(false);
      setQa([]);
    }
  }, [visitId, patientIdFromQuery]);

  const backHref = useMemo(() => {
    if (from === 'single-visit') {
      return carePrepBase;
    }
    if (patientId) {
      return `${carePrepBase}/patient/${encodeURIComponent(patientId)}`;
    }
    return carePrepBase;
  }, [carePrepBase, patientId, from]);

  const statusColor =
    status === 'completed'
      ? 'bg-green-100 text-green-800'
      : status === 'in_progress'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-slate-100 text-slate-700';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <FlowBreadcrumb
        items={[
          { label: 'CarePrep Intake Browser', href: carePrepBase },
          ...(patientId ? [{ label: `Patient ${patientId}`, href: `${carePrepBase}/patient/${encodeURIComponent(patientId)}` }] : []),
          { label: `Visit ${visitId}` },
        ]}
        className="mb-3"
      />

      <div className="flex items-center gap-4 mb-6">
        <Link href={backHref} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Intake Question &amp; Answer</h1>
          <p className="text-gray-600">
            Visit ID: {visitId}
            {patientId ? ` • Patient ID: ${patientId}` : ''}
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-wrap items-center gap-3 text-sm">
          <Badge className={statusColor}>Status: {status || 'unknown'}</Badge>
          {submittedAt ? (
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Calendar className="h-4 w-4" />
              {new Date(submittedAt).toLocaleString()}
            </span>
          ) : null}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
          <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
          <div className="h-16 rounded-lg border border-slate-200 bg-slate-100 animate-pulse" />
        </div>
      ) : qa.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No intake answers found</h3>
            <p className="text-gray-500">This visit does not have submitted intake question answers yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Question &amp; Answer List</CardTitle>
            <CardDescription>Review all patient intake answers for this visit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {qa.map((item, index) => (
              <div key={`${index}-${item.question}`} className="rounded-lg border bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">{item.question}</p>
                <p className="mt-1 text-slate-900">{item.answer || '-'}</p>
              </div>
            ))}
            {status !== 'completed' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Intake session may still be in progress.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
