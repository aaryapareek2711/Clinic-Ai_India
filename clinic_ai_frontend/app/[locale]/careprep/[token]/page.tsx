'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, CheckCircle, Loader2, AlertCircle, ArrowLeft, Edit } from 'lucide-react';
import axios from 'axios';
import MedicalHistoryForm, { MedicalHistoryData } from '@/components/careprep/MedicalHistoryForm';
import SymptomCheckerForm, { SymptomCheckerData } from '@/components/careprep/SymptomCheckerForm';

interface AppointmentDetails {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  provider_name: string;
  scheduled_start: string;
  scheduled_end: string;
  appointment_type: string;
  chief_complaint: string;
  duration_minutes: number;
  status: string;
}

interface CarePrepStatus {
  medical_history_completed: boolean;
  symptom_checker_completed: boolean;
  all_tasks_completed: boolean;
  completion_percentage: number;
}

type ViewMode = 'overview' | 'medical-history' | 'symptom-checker';

export default function CarePrepPage() {
  const params = useParams();
  const token = params.token as string;

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [carePrepStatus, setCarePrepStatus] = useState<CarePrepStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Fetch appointment details and CarePrep status
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Decode URL-encoded token if necessary
        const cleanToken = decodeURIComponent(token);

        // Fetch appointment details
        const apptResponse = await axios.get(`${API_URL}/api/appointments/careprep/${cleanToken}`);
        setAppointment(apptResponse.data);

        // Decode token to get appointment ID
        const decodedId = atob(cleanToken);
        setAppointmentId(decodedId);

        // Fetch CarePrep status
        const statusResponse = await axios.get(`${API_URL}/api/careprep/${decodedId}/status`);
        setCarePrepStatus(statusResponse.data);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || 'Invalid or expired CarePrep link');
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, API_URL]);

  // Refresh status after saving
  const refreshStatus = async () => {
    if (!appointmentId) return;

    try {
      const statusResponse = await axios.get(`${API_URL}/api/careprep/${appointmentId}/status`);
      setCarePrepStatus(statusResponse.data);
    } catch (err) {
      console.error('Error refreshing status:', err);
    }
  };

  const handleSaveMedicalHistory = async (data: MedicalHistoryData) => {
    if (!appointmentId) return;

    await axios.post(`${API_URL}/api/careprep/${appointmentId}/medical-history`, data);
    await refreshStatus();
    setViewMode('overview');
  };

  const handleSaveSymptomChecker = async (data: SymptomCheckerData) => {
    if (!appointmentId) return;

    await axios.post(`${API_URL}/api/careprep/${appointmentId}/symptom-checker`, data);
    await refreshStatus();
    setViewMode('overview');
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your appointment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Unable to Load Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <p className="text-sm text-gray-600">
              Please contact your healthcare provider's office if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment || !carePrepStatus) {
    return null;
  }

  const completedCount = [
    carePrepStatus.medical_history_completed,
    carePrepStatus.symptom_checker_completed
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CarePrep</h1>
          <p className="text-gray-600">Prepare for your upcoming appointment</p>
        </div>

        {/* Back Button (when in form view) */}
        {viewMode !== 'overview' && (
          <Button
            variant="outline"
            onClick={() => setViewMode('overview')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        )}

        {/* Overview Mode */}
        {viewMode === 'overview' && (
          <>
            {/* Appointment Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Patient</p>
                      <p className="font-semibold text-gray-900">{appointment.patient_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Provider</p>
                      <p className="font-semibold text-gray-900">{appointment.provider_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(appointment.scheduled_start)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-semibold text-gray-900">
                        {formatTime(appointment.scheduled_start)} - {formatTime(appointment.scheduled_end)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Appointment Type</p>
                      <Badge className="mt-1">{appointment.appointment_type}</Badge>
                    </div>
                  </div>

                  {appointment.chief_complaint && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Reason for Visit</p>
                        <p className="font-semibold text-gray-900">{appointment.chief_complaint}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Preparation Progress</CardTitle>
                <CardDescription>
                  {completedCount} of 2 tasks completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${carePrepStatus.completion_percentage}%` }}
                  />
                </div>
                {carePrepStatus.all_tasks_completed && (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="w-5 h-5" />
                    All tasks completed! You're ready for your appointment.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CarePrep Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  CarePrep Checklist
                </CardTitle>
                <CardDescription>
                  Complete these tasks before your appointment to help your provider give you the best care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {/* Medical History Task */}
                  <li className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center h-5">
                      {carePrepStatus.medical_history_completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${carePrepStatus.medical_history_completed ? 'text-gray-500' : 'text-gray-900'}`}>
                        Update Medical History
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Review and update your current medications, allergies, and medical conditions
                      </p>
                    </div>
                    <Button
                      variant={carePrepStatus.medical_history_completed ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => setViewMode('medical-history')}
                    >
                      {carePrepStatus.medical_history_completed ? (
                        <>
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </>
                      ) : (
                        'Start'
                      )}
                    </Button>
                  </li>

                  {/* Symptom Checker Task */}
                  <li className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center h-5">
                      {carePrepStatus.symptom_checker_completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${carePrepStatus.symptom_checker_completed ? 'text-gray-500' : 'text-gray-900'}`}>
                        Complete Symptom Checker
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Describe any symptoms you've been experiencing
                      </p>
                    </div>
                    <Button
                      variant={carePrepStatus.symptom_checker_completed ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => setViewMode('symptom-checker')}
                    >
                      {carePrepStatus.symptom_checker_completed ? (
                        <>
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </>
                      ) : (
                        'Start'
                      )}
                    </Button>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Completing this checklist helps your healthcare provider prepare for your visit
                  and ensures you get the most out of your appointment time. All information is securely stored and HIPAA-compliant.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Medical History Form View */}
        {viewMode === 'medical-history' && appointmentId && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Medical History</h2>
            <MedicalHistoryForm
              appointmentId={appointmentId}
              onSave={handleSaveMedicalHistory}
            />
          </div>
        )}

        {/* Symptom Checker Form View */}
        {viewMode === 'symptom-checker' && appointmentId && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Symptom Checker</h2>
            <SymptomCheckerForm
              appointmentId={appointmentId}
              onSave={handleSaveSymptomChecker}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-600">
            Need help? Contact your provider's office directly.
          </p>
        </div>
      </div>
    </div>
  );
}
