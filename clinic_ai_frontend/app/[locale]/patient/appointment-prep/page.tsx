'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppointmentPrepSummary } from '@/components/patient/AppointmentPrepSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Patient Appointment Preparation Page
 *
 * This page displays the unified MedGenie PreVisit + MedGenie Context summary
 * that shows patients what to expect and prepare for their appointment.
 *
 * Features:
 * - Patient-friendly symptom summary
 * - Topics the provider wants to discuss (risk scores hidden)
 * - Medications to confirm
 * - Allergies display (for safety)
 * - Appointment preparation checklist
 * - Message from care team
 */
export default function AppointmentPrepPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      // Not logged in, redirect to login
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);

      // Verify user is a patient
      if (user.role !== 'patient' && user.role !== 'PATIENT') {
        // Only patients can access this page
        router.push('/dashboard');
        return;
      }

      // Get patient ID from user
      // In a real app, you'd fetch the patient record linked to this user
      // For now, we'll use a stored patient_id or fetch it from API
      const storedPatientId = localStorage.getItem('patient_id');
      if (storedPatientId) {
        setPatientId(storedPatientId);
      } else {
        // Try to fetch patient ID from API
        fetchPatientId(user.id);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchPatientId = async (userId: string) => {
    try {
      // This would be an API call to get patient record by user_id
      // For now, we'll show an error message
      console.log('Need to implement fetchPatientId for user:', userId);
    } catch (error) {
      console.error('Error fetching patient ID:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load your patient information. Please contact support or try logging in
            again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <AppointmentPrepSummary patientId={patientId} />
    </div>
  );
}
