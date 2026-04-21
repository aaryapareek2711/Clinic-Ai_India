"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, User, Calendar, Phone, Mail, AlertTriangle, Activity, Pill, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface PatientContextProps {
  patientId: string;
}

interface PatientContext {
  patient_id: string;
  generated_at: string;
  data_sources: string[];
  demographics: {
    patient_id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    age: number;
    gender: string;
    phone: string | null;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
    };
    emergency_contact: {
      name: string;
      phone: string;
    };
  };
  medical_history: any;
  previsit: {
    has_responses: boolean;
    last_response_date: string | null;
    chief_complaint: string | null;
    triage_level: number | null;
    urgency: string | null;
  };
  summary: {
    has_data: boolean;
    data_completeness: number;
    alerts: string[];
    highlights: string[];
  };
}

export default function PatientContextCard({ patientId }: PatientContextProps) {
  const [context, setContext] = useState<PatientContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatientContext();
  }, [patientId]);

  const loadPatientContext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getAppointmentContext(patientId, {
        include_fhir: true,
        include_previsit: true,
      });
      setContext(data);
    } catch (err: any) {
      console.error('Error loading patient context:', err);
      setError(err.response?.data?.detail || 'Failed to load patient context');
      toast.error('Failed to load patient context');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading patient context...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !context) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Patient Data
            </h3>
            <p className="text-gray-600 mb-4">{error || 'Unknown error occurred'}</p>
            <Button onClick={loadPatientContext}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { demographics, previsit, summary } = context;

  return (
    <div className="space-y-6">
      {/* Patient Demographics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>
                  {demographics.first_name} {demographics.last_name}
                </CardTitle>
                <CardDescription>MRN: {demographics.mrn}</CardDescription>
              </div>
            </div>
            <Badge variant="info">
              Data: {summary.data_completeness.toFixed(0)}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Date of Birth / Age</p>
                <p className="font-medium text-gray-900">
                  {demographics.date_of_birth} ({demographics.age} years)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Activity className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-medium text-gray-900 capitalize">{demographics.gender}</p>
              </div>
            </div>

            {demographics.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{demographics.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{demographics.email}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-600 mb-2">Address</p>
            <p className="text-gray-900">
              {demographics.address.street}
              <br />
              {demographics.address.city}, {demographics.address.state} {demographics.address.zip_code}
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-600 mb-2">Emergency Contact</p>
            <p className="text-gray-900">
              {demographics.emergency_contact.name} • {demographics.emergency_contact.phone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PreVisit Information */}
      {previsit.has_responses && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">PreVisit Information</CardTitle>
                <CardDescription>
                  Submitted: {previsit.last_response_date || 'N/A'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {previsit.chief_complaint && (
              <div>
                <p className="text-sm font-medium text-gray-600">Chief Complaint</p>
                <p className="text-gray-900">{previsit.chief_complaint}</p>
              </div>
            )}

            {previsit.triage_level && (
              <div>
                <p className="text-sm font-medium text-gray-600">Triage Level</p>
                <div className="flex items-center gap-2">
                  <Badge variant={previsit.triage_level <= 2 ? 'danger' : 'warning'}>
                    Level {previsit.triage_level}
                  </Badge>
                  {previsit.urgency && (
                    <Badge variant="outline">{previsit.urgency}</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {summary.alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-900">Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {summary.alerts.map((alert, index) => (
                <li key={index} className="text-yellow-800">
                  {alert}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clinical Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {summary.highlights.map((highlight, index) => (
                <li key={index} className="text-gray-700">
                  {highlight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Data Sources */}
      <div className="text-center text-sm text-gray-500">
        Data sources: {context.data_sources.join(', ')}
      </div>
    </div>
  );
}
