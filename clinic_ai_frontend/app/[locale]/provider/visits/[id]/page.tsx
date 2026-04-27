"use client";

import { useState, useEffect } from 'react';
import SOAPNotesEditor from "@/components/visit/SOAPNotesEditor";
import AIAssistantChat from "@/components/visit/AIAssistantChat";
import AudioTranscription from "@/components/visit/AudioTranscription";
import VitalsFormPanel from "@/components/visit/VitalsFormPanel";
import PatientContextCard from "@/components/appoint-ready/PatientContextCard";
import RiskStratification from "@/components/appoint-ready/RiskStratification";
import CareGaps from "@/components/appoint-ready/CareGaps";
import MedicationReview from "@/components/appoint-ready/MedicationReview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Bot, FileText, ChevronRight, ChevronLeft, Activity, AlertTriangle, Pill, Target, Phone, Send, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';
import type { PatientData } from '@/lib/utils/templatePopulation';
import { apiClient } from '@/lib/api/client';


interface Visit {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  visit_type: string;
  status: string;
  chief_complaint?: string;
  reason_for_visit?: string;
  scheduled_start?: string;
  actual_start?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    gender: string;
    phone_number?: string | null;
  };
}

function formatPrevisitSummaryForDisplay(doc: any): string {
  if (!doc) return '';
  const s = doc.sections;
  if (!s || typeof s !== 'object') {
    return typeof doc === 'string' ? doc : JSON.stringify(doc, null, 2);
  }
  const parts: string[] = [];
  const cc = s.chief_complaint;
  if (cc && (cc.reason_for_visit || cc.symptom_duration_or_onset)) {
    parts.push(
      ['Chief complaint', cc.reason_for_visit, cc.symptom_duration_or_onset && `Onset / duration: ${cc.symptom_duration_or_onset}`]
        .filter(Boolean)
        .join('\n')
    );
  }
  const hpi = s.hpi;
  if (hpi) {
    const assoc = Array.isArray(hpi.associated_symptoms) ? hpi.associated_symptoms.join(', ') : '';
    const bits = [
      assoc && `Associated symptoms: ${assoc}`,
      hpi.symptom_severity_or_progression && `Severity / progression: ${hpi.symptom_severity_or_progression}`,
      hpi.impact_on_daily_life && `Impact on daily life: ${hpi.impact_on_daily_life}`,
    ].filter(Boolean);
    if (bits.length) parts.push(['History of present illness', ...bits].join('\n'));
  }
  const cur = s.current_medication;
  if (cur?.medications_or_home_remedies) {
    parts.push(`Current medications / remedies\n${cur.medications_or_home_remedies}`);
  }
  const pmh = s.past_medical_history_allergies;
  if (pmh) {
    const b = [pmh.past_medical_history, pmh.allergies && `Allergies: ${pmh.allergies}`].filter(Boolean);
    if (b.length) parts.push(`Past history & allergies\n${b.join('\n')}`);
  }
  if (Array.isArray(s.red_flag_indicators) && s.red_flag_indicators.length) {
    parts.push(`Red flags\n${s.red_flag_indicators.map((x: string) => `- ${x}`).join('\n')}`);
  }
  return parts.join('\n\n').trim() || JSON.stringify(doc, null, 2);
}

function formatPostVisitNoteForDisplay(note: any): string {
  const p = note?.payload;
  if (!p) return '';
  if (typeof p.visit_reason === 'string' || p.what_doctor_found !== undefined) {
    const meds = Array.isArray(p.medicines_to_take) ? p.medicines_to_take.filter(Boolean).join('\n- ') : '';
    const tests = Array.isArray(p.tests_recommended) ? p.tests_recommended.filter(Boolean).join('\n- ') : '';
    const care = Array.isArray(p.self_care) ? p.self_care.filter(Boolean).join('\n- ') : '';
    const warn = Array.isArray(p.warning_signs) ? p.warning_signs.filter(Boolean).join('\n- ') : '';
    const lines = [
      p.visit_reason && `Visit reason\n${p.visit_reason}`,
      p.what_doctor_found && `What we found\n${p.what_doctor_found}`,
      meds && `Medicines\n- ${meds}`,
      tests && `Tests\n- ${tests}`,
      care && `Self-care\n- ${care}`,
      warn && `Warning signs\n- ${warn}`,
      p.follow_up && `Follow-up\n${p.follow_up}`,
      p.next_visit_date && `Next visit\n${p.next_visit_date}`,
    ].filter(Boolean);
    return lines.join('\n\n');
  }
  return String(p.doctor_notes || JSON.stringify(p, null, 2));
}

function clinicalVisitPatchFromStoredNote(visitBase: Visit, note: any): Partial<Visit> {
  if (!note?.payload) return {};
  const payload = note.payload;
  const doctorNotes = String(payload.doctor_notes || '');
  const subjectiveMatch = doctorNotes.match(/subjective:\s*([\s\S]*?)(?:\nobjective:|$)/i);
  const objectiveMatch = doctorNotes.match(/objective:\s*([\s\S]*)$/i);
  const subj = (subjectiveMatch?.[1] || '').trim() || doctorNotes.trim();
  const obj = (objectiveMatch?.[1] || '').trim();
  const patch: Partial<Visit> = {};
  if (subj) patch.subjective = subj;
  if (obj) patch.objective = obj;
  if (payload.assessment) patch.assessment = String(payload.assessment);
  if (payload.plan) patch.plan = String(payload.plan);
  if (!visitBase.chief_complaint && payload.chief_complaint) patch.chief_complaint = String(payload.chief_complaint);
  return patch;
}

export default function VisitPage({ params }: { params: { id: string } }) {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const router = useRouter();
  const visitId = decodeURIComponent(params.id);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'previsit-summary' | 'transcription' | 'soap' | 'post-visit-summary'>('vitals');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeContextSection, setActiveContextSection] = useState<'patient' | 'risk' | 'gaps' | 'meds'>('patient');
  const [transcriptJobId, setTranscriptJobId] = useState<string | undefined>(undefined);
  const [transcriptWorkflowStatus, setTranscriptWorkflowStatus] = useState<'pending' | 'processing' | 'done' | 'failed'>('pending');
  const [previsitSummary, setPrevisitSummary] = useState<string>('');
  const [postVisitSummary, setPostVisitSummary] = useState<string>('');
  const [isGeneratingPrevisit, setIsGeneratingPrevisit] = useState(false);
  const [isGeneratingPostVisit, setIsGeneratingPostVisit] = useState(false);
  const [postVisitFollowUpDate, setPostVisitFollowUpDate] = useState('');
  const [postVisitWhatsappOverride, setPostVisitWhatsappOverride] = useState('');
  const [isSendingPostVisitWhatsapp, setIsSendingPostVisitWhatsapp] = useState(false);
  const [hasVitals, setHasVitals] = useState(false);

  useEffect(() => {
    fetchVisit();
  }, [visitId]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      // Check both possible token keys for compatibility
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      if (!token) {
        setError('Please log in to view this visit');
        toast.error('Authentication required');
        window.location.href = '/login';
        return;
      }

      const visitData = await apiClient.getVisit(visitId) as Visit;
      const patientId = visitData.patient_id;
      const resolvedVisitId = visitId;

      const [preDoc, postNote, clinicalNote, latestVitals] = await Promise.all([
        apiClient.getPreVisitSummary(patientId, resolvedVisitId).catch(() => null),
        apiClient.getLatestPostVisitSummary(patientId, resolvedVisitId).catch(() => null),
        apiClient.getLatestClinicalNote(patientId, resolvedVisitId, 'india_clinical').catch(() => null),
        apiClient.getLatestVitals(patientId, resolvedVisitId).catch(() => null),
      ]);

      let resolvedTranscriptId: string | undefined;
      let resolvedTranscriptStatus: 'pending' | 'processing' | 'done' | 'failed' = 'pending';
      try {
        const txStatus = await apiClient.getVisitTranscriptionStatus(patientId, resolvedVisitId);
        const normalized = String(txStatus?.status || '').toLowerCase();
        if (normalized === 'completed') {
          resolvedTranscriptStatus = 'done';
          if (txStatus?.transcription_id) {
            resolvedTranscriptId = String(txStatus.transcription_id);
          }
        } else if (normalized === 'failed' || normalized === 'stale_processing') {
          resolvedTranscriptStatus = 'failed';
        } else if (normalized === 'processing' || normalized === 'queued') {
          resolvedTranscriptStatus = 'processing';
        } else {
          const dialogue = await apiClient.getVisitDialogue(patientId, resolvedVisitId);
          if (dialogue.status === 200 && String(dialogue?.data?.transcript || '').trim()) {
            resolvedTranscriptStatus = 'done';
            const inferred = String((dialogue?.data as any)?.transcription_id || txStatus?.transcription_id || '').trim();
            if (inferred) resolvedTranscriptId = inferred;
          }
        }
      } catch {
        // transcript status optional
      }

      const soapPatch = clinicalVisitPatchFromStoredNote(visitData, clinicalNote);
      const chiefFromPrevisit = preDoc?.sections?.chief_complaint?.reason_for_visit;
      const chiefPatch =
        chiefFromPrevisit && !visitData.chief_complaint ? { chief_complaint: String(chiefFromPrevisit) } : {};
      const resolvedVisit = { ...visitData, ...soapPatch, ...chiefPatch };
      setVisit(resolvedVisit);
      setHasVitals(Boolean(latestVitals?.vitals_id));
      setPrevisitSummary(preDoc ? formatPrevisitSummaryForDisplay(preDoc) : '');
      setPostVisitSummary(postNote ? formatPostVisitNoteForDisplay(postNote) : '');
      setPostVisitFollowUpDate(String(postNote?.payload?.next_visit_date || ''));
      setTranscriptJobId(resolvedTranscriptId);
      setTranscriptWorkflowStatus(resolvedTranscriptStatus);

      if (!resolvedVisit?.scheduled_start) {
        toast.error('Appointment is not fixed yet. Please schedule it first.');
        router.push(`${ws}/fix-appointment/${encodeURIComponent(resolvedVisitId)}`);
        return;
      }
    } catch (error: any) {
      console.error('Error fetching visit:', error);

      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        toast.error('Session expired. Redirecting to login...');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      setError(error.response?.data?.detail || 'Failed to load visit');
      toast.error('Failed to load visit');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-600 mb-4">{error || 'Visit not found'}</p>
        <Link href={`${ws}/dashboard`} className="text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const handleTranscriptionComplete = (transcription: any) => {
    const status = String(transcription?.status || '').toLowerCase();
    if (status === 'completed') {
      setTranscriptWorkflowStatus('done');
      if (transcription?.id) {
        setTranscriptJobId(String(transcription.id));
      }
      return;
    }
    if (status === 'failed') {
      setTranscriptWorkflowStatus('failed');
      return;
    }
    if (status === 'processing' || status === 'queued') {
      setTranscriptWorkflowStatus('processing');
    }
    if (transcription?.id && (status === 'processing' || status === 'queued')) {
      setTranscriptJobId(String(transcription.id));
    }
  };

  const resolveCompletedTranscriptJobId = async (): Promise<string | null> => {
    if (transcriptJobId) return transcriptJobId;
    try {
      const status = await apiClient.getVisitTranscriptionStatus(visit.patient_id, visitId);
      const normalized = String(status?.status || '').toLowerCase();
      const resolvedId = String(status?.transcription_id || '').trim();
      if (normalized === 'completed' && resolvedId) {
        setTranscriptJobId(resolvedId);
        return resolvedId;
      }
      const dialogue = await apiClient.getVisitDialogue(visit.patient_id, visitId);
      if (dialogue.status === 200 && String(dialogue?.data?.transcript || '').trim()) {
        const inferred = String((dialogue?.data as any)?.transcription_id || resolvedId || '').trim();
        if (inferred) {
          setTranscriptJobId(inferred);
          return inferred;
        }
        // Transcript exists but no stable job id exposed; backend can resolve by patient+visit.
        return '';
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleGeneratePrevisitSummary = async () => {
    setIsGeneratingPrevisit(true);
    try {
      const data = await apiClient.generatePreVisitSummary(visit.patient_id, visitId);
      const summaryText =
        data?.sections
          ? formatPrevisitSummaryForDisplay(data)
          : data?.summary ||
            data?.patient_friendly_summary ||
            JSON.stringify(data, null, 2);
      setPrevisitSummary(summaryText);
      toast.success('Previsit summary generated');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === 'PREVISIT_MISSING') {
        const msg = 'Previsit summary cannot be generated because intake session is not completed yet.';
        setPrevisitSummary(msg);
        toast.error(msg);
      } else {
        toast.error(detail || 'Failed to generate previsit summary');
      }
    } finally {
      setIsGeneratingPrevisit(false);
    }
  };

  const handleSendPostVisitWhatsapp = async () => {
    const onFile = visit.patient?.phone_number ? String(visit.patient.phone_number).trim() : '';
    const override = postVisitWhatsappOverride.trim();
    if (!onFile && !override) {
      toast.error('Patient has no phone on file. Enter a WhatsApp number below.');
      return;
    }
    setIsSendingPostVisitWhatsapp(true);
    try {
      const res = await apiClient.sendPostVisitSummaryWhatsapp({
        patient_id: visit.patient_id,
        visit_id: visitId,
        phone_number: override || undefined,
      });
      if (res.summary_template_sent || res.follow_up_template_sent) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to send WhatsApp messages');
    } finally {
      setIsSendingPostVisitWhatsapp(false);
    }
  };

  const handleGeneratePostVisitSummary = async () => {
    const completedTranscriptId = await resolveCompletedTranscriptJobId();
    if (completedTranscriptId === null) {
      const msg = 'Post visit summary requires transcript. Please upload/record transcript first.';
      setPostVisitSummary(msg);
      toast.error(msg);
      return;
    }
    setIsGeneratingPostVisit(true);
    try {
      const response = await apiClient.generateClinicalNote({
        patient_id: visit.patient_id,
        visit_id: visitId,
        transcription_job_id: completedTranscriptId || undefined,
        note_type: 'post_visit_summary',
        follow_up_date: postVisitFollowUpDate || undefined,
      });
      const payload = response?.payload || {};
      const formatted = formatPostVisitNoteForDisplay({ payload }).trim();
      const text =
        formatted ||
        String(payload?.doctor_notes || payload?.summary || JSON.stringify(payload, null, 2));
      setPostVisitSummary(text);
      toast.success('Post visit summary generated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to generate post visit summary');
    } finally {
      setIsGeneratingPostVisit(false);
    }
  };

  const contextSections = [
    { id: 'patient', label: 'Patient Info', icon: Activity },
    { id: 'risk', label: 'Risk Score', icon: AlertTriangle },
    { id: 'gaps', label: 'Care Gaps', icon: Target },
    { id: 'meds', label: 'Medications', icon: Pill },
  ];

  const buildPatientData = (): PatientData => {
    if (!visit.patient) return {};

    return {
      name: `${visit.patient.first_name} ${visit.patient.last_name}`,
      gender: visit.patient.gender,
      chiefComplaint: visit.chief_complaint || undefined,
    };
  };

  const hasPrevisitSummary = Boolean(previsitSummary.trim());
  const hasTranscript = transcriptWorkflowStatus === 'done';
  const hasClinicalNote =
    Boolean((visit.subjective || '').trim()) ||
    Boolean((visit.objective || '').trim()) ||
    Boolean((visit.assessment || '').trim()) ||
    Boolean((visit.plan || '').trim());
  const hasPostVisitSummary = Boolean(postVisitSummary.trim());

  const workflowSteps = [
    { id: 'vitals', label: 'Vitals', state: hasVitals ? 'done' : 'pending' },
    { id: 'previsit-summary', label: 'Previsit', state: hasPrevisitSummary ? 'done' : 'pending' },
    { id: 'transcription', label: 'Transcript', state: transcriptWorkflowStatus },
    { id: 'soap', label: 'Clinical Note', state: hasClinicalNote ? 'done' : 'pending' },
    { id: 'post-visit-summary', label: 'Post Summary', state: hasPostVisitSummary ? 'done' : 'pending' },
  ] as const;

  const tabLabelMap: Record<typeof activeTab, string> = {
    vitals: 'Vitals Form',
    'previsit-summary': 'Previsit Summary',
    transcription: 'Transcript',
    soap: 'Clinical Note',
    'post-visit-summary': 'Post Visit Summary',
  };

  const nextRecommendedStep: { tab: typeof activeTab; title: string; hint: string } | null = !hasPrevisitSummary
    ? {
        tab: 'previsit-summary',
        title: 'Generate previsit summary',
        hint: 'This gives a quick intake overview before documentation.',
      }
    : !hasTranscript
    ? {
        tab: 'transcription',
        title: 'Upload or record transcript',
        hint: 'Transcript helps AI create more accurate clinical notes.',
      }
    : !hasClinicalNote
    ? {
        tab: 'soap',
        title: 'Complete clinical note',
        hint: 'Capture assessment and plan before sharing visit summary.',
      }
    : !hasPostVisitSummary
    ? {
        tab: 'post-visit-summary',
        title: 'Generate post visit summary',
        hint: 'Prepare patient-friendly summary and follow-up reminders.',
      }
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto p-6 transition-all duration-300 ${sidebarCollapsed ? 'mr-12' : 'mr-96'}`}>
        <FlowBreadcrumb
          items={[
            { label: 'Clinic Dashboard', href: `${ws}/dashboard` },
            { label: 'Visit Workspace', href: `${ws}/visits` },
            { label: `Visit ${visitId}` },
          ]}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`${ws}/dashboard`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Visit Documentation</h1>
              <p className="text-gray-600 text-sm">Complete clinical documentation with AI assistance</p>
            </div>
          </div>

          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Bot className="w-5 h-5" />
            {showAIChat ? 'Hide' : 'Show'} AI Assistant
          </button>
        </div>

        {/* Visit Info Card */}
        <Card className="mb-6">
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Visit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Patient</p>
                <p className="font-semibold text-gray-900">
                  {visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Visit Type</p>
                <p className="font-semibold text-gray-900">{visit.visit_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge className={getStatusColor(visit.status)}>
                  {formatStatus(visit.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Chief Complaint</p>
                <p className="font-semibold text-gray-900">{visit.chief_complaint || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Visit Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {workflowSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveTab(step.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    activeTab === step.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">{step.label}</p>
                  <p
                    className={`flex items-center gap-1 text-sm font-medium ${
                      step.state === 'done'
                        ? 'text-green-700'
                        : step.state === 'failed'
                        ? 'text-red-700'
                        : step.state === 'processing'
                        ? 'text-blue-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {step.state === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    {step.state === 'done'
                      ? 'Done'
                      : step.state === 'failed'
                      ? 'Failed'
                      : step.state === 'processing'
                      ? 'Processing'
                      : 'Pending'}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {nextRecommendedStep && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Recommended next step: {nextRecommendedStep.title}</p>
                  <p className="text-xs text-blue-800 mt-1">{nextRecommendedStep.hint}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-blue-400 text-blue-700 hover:bg-blue-100"
                  onClick={() => setActiveTab(nextRecommendedStep.tab)}
                >
                  Open {tabLabelMap[nextRecommendedStep.tab]}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Content */}
        <div>
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="py-3">
                  <p className="text-sm text-slate-700">
                    Enter vitals first when available. This improves risk/context interpretation and note quality.
                  </p>
                </CardContent>
              </Card>
              <VitalsFormPanel
                patientId={visit.patient_id}
                visitId={visitId}
                onSaved={() => setHasVitals(true)}
              />
            </div>
          )}

          {activeTab === 'previsit-summary' && (
            <Card>
              <CardHeader>
                <CardTitle>Previsit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Use this to quickly review intake details before clinical documentation.
                </p>
                <Button onClick={handleGeneratePrevisitSummary} disabled={isGeneratingPrevisit}>
                  {isGeneratingPrevisit ? 'Generating...' : 'Refresh Previsit Summary'}
                </Button>
                <div className="rounded-lg border p-4 min-h-[160px] whitespace-pre-wrap text-sm text-gray-800">
                  {previsitSummary || 'No previsit summary generated yet.'}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'transcription' && (
            <div className="space-y-4">
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="py-3">
                  <p className="text-sm text-slate-700">
                    Upload/record conversation audio here. Once completed, continue to <strong>Clinical Note</strong>.
                  </p>
                </CardContent>
              </Card>
              <AudioTranscription
                visitId={visitId}
                patientId={visit.patient_id}
                onTranscriptionComplete={handleTranscriptionComplete}
              />
            </div>
          )}

          {activeTab === 'soap' && (
            <div className="space-y-4">
              {!hasTranscript && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="py-3">
                    <p className="text-sm text-amber-800">
                      No transcript detected yet. You can still write notes manually, but transcript-based AI help works best after transcription.
                    </p>
                  </CardContent>
                </Card>
              )}
              <SOAPNotesEditor
                visitId={visitId}
                initialNotes={{
                  doctor_notes: [visit.subjective, visit.objective].filter(Boolean).join('\n\n'),
                  chief_complaint: visit.chief_complaint || '',
                  assessment: visit.assessment || '',
                  plan: visit.plan || '',
                }}
                onSave={(notes) => {
                  setVisit((prev) =>
                    prev
                      ? {
                          ...prev,
                          subjective: notes.doctor_notes || prev.subjective,
                          chief_complaint: notes.chief_complaint || prev.chief_complaint,
                          assessment: notes.assessment || prev.assessment,
                          plan: notes.plan || prev.plan,
                        }
                      : prev,
                  );
                  console.log('Clinical note saved:', notes);
                  toast.success('Visit documentation updated');
                }}
                onGenerated={(notes) => {
                  setVisit((prev) =>
                    prev
                      ? {
                          ...prev,
                          subjective: notes.doctor_notes || prev.subjective,
                          chief_complaint: notes.chief_complaint || prev.chief_complaint,
                          assessment: notes.assessment || prev.assessment,
                          plan: notes.plan || prev.plan,
                        }
                      : prev,
                  );
                }}
                patientData={buildPatientData()}
                patientId={visit.patient_id}
                transcriptId={transcriptJobId}
              />
            </div>
          )}

          {activeTab === 'post-visit-summary' && (
            <Card>
              <CardHeader>
                <CardTitle>Post Visit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasClinicalNote && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">
                      Clinical note appears incomplete. Complete key note sections first for better patient summary quality.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <Button onClick={handleGeneratePostVisitSummary} disabled={isGeneratingPostVisit}>
                    {isGeneratingPostVisit ? 'Generating...' : 'Generate / Refresh Post Visit Summary'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-50"
                    onClick={handleSendPostVisitWhatsapp}
                    disabled={isSendingPostVisitWhatsapp || isGeneratingPostVisit}
                  >
                    {isSendingPostVisitWhatsapp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send to patient (WhatsApp)
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  Generate saves summary + reminder schedule. WhatsApp is sent only when you click "Send to patient".
                  Follow-up reminders are then sent at T-3 days and T-24 hours based on follow-up date.
                </p>
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium text-gray-900">
                    Follow-up visit date (manual by doctor)
                  </label>
                  <Input
                    type="date"
                    value={postVisitFollowUpDate}
                    onChange={(e) => setPostVisitFollowUpDate(e.target.value)}
                    className="text-gray-900"
                  />
                  <p className="text-xs text-gray-500">
                    This date is used for reminder scheduling: immediate (on send), 3 days before, and 24 hours before.
                  </p>
                </div>
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    WhatsApp number (optional override)
                  </label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder={
                      visit.patient?.phone_number
                        ? `Default: ${visit.patient.phone_number}`
                        : 'Enter number with country code (e.g. 919876543210)'
                    }
                    value={postVisitWhatsappOverride}
                    onChange={(e) => setPostVisitWhatsappOverride(e.target.value)}
                    className="text-gray-900"
                  />
                  {visit.patient?.phone_number && (
                    <p className="text-xs text-gray-500">
                      If left blank, the number on the patient file is used: {visit.patient.phone_number}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border p-4 min-h-[160px] whitespace-pre-wrap text-sm text-gray-800">
                  {postVisitSummary || 'No post visit summary generated yet.'}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* ContextAI Sidebar */}
      <div className={`fixed right-0 top-16 bottom-0 bg-gray-50 border-l border-gray-200 transition-all duration-300 overflow-hidden ${sidebarCollapsed ? 'w-12' : 'w-96'}`}>
        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-0 top-4 -translate-x-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 z-10"
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {!sidebarCollapsed && (
          <div className="h-full overflow-auto">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                ContextAI
              </h3>
              <p className="text-blue-100 text-sm mt-1">Patient context & insights</p>
            </div>

            {/* Context Section Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              {contextSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveContextSection(section.id as any)}
                  className={`flex-1 py-3 px-2 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                    activeContextSection === section.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </div>

            {/* Context Content */}
            <div className="p-4">
              {activeContextSection === 'patient' && visit.patient_id && (
                <PatientContextCard patientId={visit.patient_id} visitId={visitId} />
              )}

              {activeContextSection === 'risk' && visit.patient_id && (
                <RiskStratification patientId={visit.patient_id} />
              )}

              {activeContextSection === 'gaps' && visit.patient_id && (
                <CareGaps patientId={visit.patient_id} />
              )}

              {activeContextSection === 'meds' && visit.patient_id && (
                <MedicationReview patientId={visit.patient_id} visitId={visitId} />
              )}
            </div>

            {/* AI Insights Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-100 to-transparent p-4 pt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>AI Tip:</strong> Use the AI Assistant to ask about differential diagnoses, lab recommendations, or treatment options based on this patient's context.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed state icons */}
        {sidebarCollapsed && (
          <div className="flex flex-col items-center pt-16 gap-4">
            {contextSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setSidebarCollapsed(false);
                  setActiveContextSection(section.id as any);
                }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={section.label}
              >
                <section.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Assistant Chat (Floating) */}
      {showAIChat && (
        <AIAssistantChat
          visitId={visitId}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}
