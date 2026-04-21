'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import toast, { Toaster } from 'react-hot-toast';

interface AppointmentContext {
  patient_id: string;
  generated_at: string;
  demographics?: {
    name: string;
    age: number;
    gender: string;
    mrn?: string;
    email?: string;
  };
  medical_history?: {
    conditions?: any[];
    medications?: any[];
    allergies?: any[];
    recent_observations?: any[];
  };
  previsit_data?: {
    recent_symptom_analyses?: any[];
    questionnaire_responses?: any[];
  };
  care_gaps?: any[];
  risk_scores?: any[];
  summary?: {
    key_points?: string[];
    alerts?: string[];
    highlights?: string[];
  };
}

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [patientId, setPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<AppointmentContext | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'gaps' | 'risks'>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!['doctor', 'nurse', 'admin', 'staff'].includes(user?.role || '')) {
      toast.error('Access denied. Provider portal only.');
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  const handleLoadContext = async () => {
    if (!patientId.trim()) {
      toast.error('Please enter a patient ID');
      return;
    }

    setIsLoading(true);
    setContext(null);

    try {
      const response = await apiClient.getAppointmentContext(patientId, {
        include_fhir: true,
        include_previsit: true,
        include_care_gaps: true,
        include_risk_scores: true,
      });

      setContext(response.data);
      toast.success('Patient context loaded successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load patient context');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated || !['doctor', 'nurse', 'admin', 'staff'].includes(user?.role || '')) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, Dr. {user?.full_name || user?.username}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/provider/visits">
                <Button variant="primary">My Visits</Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">MedGenie Context: Load Patient Context</h2>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter Patient ID (e.g., patient-uuid or demo-patient-001)"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLoadContext()}
              />
            </div>
            <Button
              onClick={handleLoadContext}
              variant="primary"
              size="lg"
              isLoading={isLoading}
            >
              Load Context
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Try: Use a patient UUID from your database or create a demo patient ID
          </p>
        </div>

        {/* Context Display */}
        {context && (
          <div className="space-y-6">
            {/* Patient Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {context.demographics?.name || 'Patient'}
                  </h2>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    {context.demographics?.age && <span>Age: {context.demographics.age}</span>}
                    {context.demographics?.gender && <span>Gender: {context.demographics.gender}</span>}
                    {context.demographics?.mrn && <span>MRN: {context.demographics.mrn}</span>}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Context Generated</p>
                  <p className="font-medium">
                    {new Date(context.generated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Alerts & Highlights */}
              {context.summary && (
                <div className="space-y-3">
                  {context.summary.alerts && context.summary.alerts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Alerts
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                        {context.summary.alerts.map((alert, idx) => (
                          <li key={idx}>{alert}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {context.summary.highlights && context.summary.highlights.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Key Highlights</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                        {context.summary.highlights.map((highlight, idx) => (
                          <li key={idx}>{highlight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabbed Content */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {[
                    { id: 'overview', label: 'Overview', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                    { id: 'history', label: 'Medical History', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                    { id: 'gaps', label: 'Care Gaps', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                    { id: 'risks', label: 'Risk Scores', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                      </svg>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Patient Summary</h3>
                    {context.summary?.key_points && context.summary.key_points.length > 0 ? (
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {context.summary.key_points.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No key points available</p>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-6">
                    {/* Conditions */}
                    {context.medical_history?.conditions && context.medical_history.conditions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Conditions</h3>
                        <div className="space-y-2">
                          {context.medical_history.conditions.map((condition: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <h4 className="font-medium text-gray-900">{condition.code?.text || condition.code?.coding?.[0]?.display || 'Unknown condition'}</h4>
                              {condition.onsetDateTime && (
                                <p className="text-sm text-gray-600">Onset: {new Date(condition.onsetDateTime).toLocaleDateString()}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medications */}
                    {context.medical_history?.medications && context.medical_history.medications.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Medications</h3>
                        <div className="space-y-2">
                          {context.medical_history.medications.map((med: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <h4 className="font-medium text-gray-900">{med.medicationCodeableConcept?.text || 'Unknown medication'}</h4>
                              {med.dosageInstruction?.[0]?.text && (
                                <p className="text-sm text-gray-600">{med.dosageInstruction[0].text}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allergies */}
                    {context.medical_history?.allergies && context.medical_history.allergies.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Allergies</h3>
                        <div className="flex flex-wrap gap-2">
                          {context.medical_history.allergies.map((allergy: any, idx: number) => (
                            <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium border border-red-200">
                              {allergy.code?.text || allergy.code?.coding?.[0]?.display || 'Unknown allergy'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!context.medical_history?.conditions?.length &&
                      !context.medical_history?.medications?.length &&
                      !context.medical_history?.allergies?.length && (
                        <p className="text-gray-500 text-center py-8">No medical history available</p>
                      )}
                  </div>
                )}

                {activeTab === 'gaps' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Identified Care Gaps</h3>
                    {context.care_gaps && context.care_gaps.length > 0 ? (
                      <div className="space-y-3">
                        {context.care_gaps.map((gap: any, idx: number) => (
                          <div key={idx} className={`border rounded-lg p-4 ${getSeverityColor(gap.priority)}`}>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold">{gap.gap_type || gap.name}</h4>
                              <span className="text-xs font-medium px-2 py-1 rounded bg-white bg-opacity-50">
                                {gap.priority || 'Medium'} Priority
                              </span>
                            </div>
                            {gap.description && <p className="text-sm mb-2">{gap.description}</p>}
                            {gap.recommendation && (
                              <p className="text-sm italic">Recommendation: {gap.recommendation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No care gaps identified</p>
                    )}
                  </div>
                )}

                {activeTab === 'risks' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Risk Assessment Scores</h3>
                    {context.risk_scores && context.risk_scores.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {context.risk_scores.map((risk: any, idx: number) => (
                          <div key={idx} className={`border rounded-lg p-4 ${getSeverityColor(risk.category)}`}>
                            <h4 className="font-semibold capitalize mb-2">{risk.risk_type} Risk</h4>
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-3xl font-bold">{risk.score}%</p>
                                <p className="text-sm capitalize">{risk.category} Risk</p>
                              </div>
                              {risk.recommendations && risk.recommendations.length > 0 && (
                                <button className="text-xs underline">View Details</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No risk scores calculated</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!context && !isLoading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Patient Loaded</h3>
            <p className="text-gray-500">Enter a patient ID above to view appointment context</p>
          </div>
        )}
      </main>
    </div>
  );
}
