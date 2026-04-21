"use client";

import { useState, useEffect } from 'react';
import SOAPNotesEditor from "@/components/visit/SOAPNotesEditor";
import AIAssistantChat from "@/components/visit/AIAssistantChat";
import QuickNotes from "@/components/visit/QuickNotes";
import AudioTranscription from "@/components/visit/AudioTranscription";
import TaskList from "@/components/provider/TaskList";
import PatientContextCard from "@/components/appoint-ready/PatientContextCard";
import RiskStratification from "@/components/appoint-ready/RiskStratification";
import CareGaps from "@/components/appoint-ready/CareGaps";
import MedicationReview from "@/components/appoint-ready/MedicationReview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Bot, FileText, CheckSquare, ChevronRight, ChevronLeft, Activity, AlertTriangle, Pill, Target } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import toast from 'react-hot-toast';
import type { PatientData } from '@/lib/utils/templatePopulation';


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
    date_of_birth: string;
    gender: string;
  };
}

export default function VisitPage({ params }: { params: { id: string } }) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'soap' | 'quick-notes' | 'tasks'>('transcription');
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeContextSection, setActiveContextSection] = useState<'patient' | 'risk' | 'gaps' | 'meds'>('patient');

  useEffect(() => {
    fetchVisit();
  }, [params.id]);

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

      const response = await axios.get(`/api/visits/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setVisit(response.data);
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
        <Link href="/provider/dashboard" className="text-blue-600 hover:underline">
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

  const handleTasksCreated = (tasks: any[]) => {
    toast.success(`${tasks.length} task${tasks.length > 1 ? 's' : ''} created!`);
    setTaskRefreshKey(prev => prev + 1);
    setActiveTab('tasks');
  };

  const contextSections = [
    { id: 'patient', label: 'Patient Info', icon: Activity },
    { id: 'risk', label: 'Risk Score', icon: AlertTriangle },
    { id: 'gaps', label: 'Care Gaps', icon: Target },
    { id: 'meds', label: 'Medications', icon: Pill },
  ];

  const buildPatientData = (): PatientData => {
    if (!visit.patient) return {};

    const dob = visit.patient.date_of_birth;
    const parsed = dob ? new Date(dob) : null;
    const age =
      parsed && !isNaN(parsed.getTime())
        ? Math.floor((Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined;

    return {
      name: `${visit.patient.first_name} ${visit.patient.last_name}`,
      age,
      dob: parsed ? parsed.toLocaleDateString() : undefined,
      gender: visit.patient.gender,
      chiefComplaint: visit.chief_complaint || undefined,
    };
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto p-6 transition-all duration-300 ${sidebarCollapsed ? 'mr-12' : 'mr-96'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/provider/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
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

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('transcription')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'transcription'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Transcript
            </button>
            <button
              onClick={() => setActiveTab('soap')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'soap'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              SOAP Notes
            </button>
            <button
              onClick={() => setActiveTab('quick-notes')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'quick-notes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Quick Notes
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Tasks
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'transcription' && (
            <AudioTranscription visitId={params.id} />
          )}

          {activeTab === 'soap' && (
            <SOAPNotesEditor
              visitId={params.id}
              initialNotes={{
                subjective: visit.subjective || '',
                objective: visit.objective || '',
                assessment: visit.assessment || '',
                plan: visit.plan || '',
              }}
              onSave={(notes) => {
                console.log('SOAP notes saved:', notes);
                toast.success('Visit documentation updated');
              }}
              patientData={buildPatientData()}
              patientId={visit.patient_id}
            />
          )}

          {activeTab === 'quick-notes' && (
            <QuickNotes
              visitId={params.id}
              onTasksCreated={handleTasksCreated}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskList
              key={taskRefreshKey}
              patientId={visit.patient_id}
              visitId={params.id}
              showFilters={true}
              maxHeight="600px"
            />
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
                <PatientContextCard patientId={visit.patient_id} />
              )}

              {activeContextSection === 'risk' && visit.patient_id && (
                <RiskStratification patientId={visit.patient_id} />
              )}

              {activeContextSection === 'gaps' && visit.patient_id && (
                <CareGaps patientId={visit.patient_id} />
              )}

              {activeContextSection === 'meds' && visit.patient_id && (
                <MedicationReview patientId={visit.patient_id} />
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
          visitId={params.id}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}
