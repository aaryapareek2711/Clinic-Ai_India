'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import toast, { Toaster } from 'react-hot-toast';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn: string;
}

export default function NewVisitPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitType, setVisitType] = useState<string>('routine');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!['doctor', 'nurse', 'admin', 'staff'].includes(user?.role || '')) {
      toast.error('Access denied');
      router.push('/login');
    } else {
      loadPatients();
    }
  }, [isAuthenticated, user, router]);

  const loadPatients = async () => {
    try {
      const response = await apiClient.getPatients(1, 100);
      // Ensure we always set an array
      const patientsData = Array.isArray(response?.data) ? response.data :
                           Array.isArray(response) ? response : [];
      setPatients(patientsData);
    } catch (error: any) {
      console.error('Failed to load patients:', error);
      toast.error('Failed to load patients');
      setPatients([]); // Reset to empty array on error
    }
  };

  const filteredPatients = (patients || []).filter((patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const mrn = patient.mrn?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || mrn.includes(searchTerm.toLowerCase());
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(`${patient.first_name} ${patient.last_name}`);
    setShowPatientList(false);
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!chiefComplaint.trim()) {
      toast.error('Please enter a chief complaint');
      return;
    }

    setIsLoading(true);

    try {
      // Combine date and time if provided
      let scheduledStart: string | undefined;
      if (scheduledDate && scheduledTime) {
        scheduledStart = `${scheduledDate}T${scheduledTime}:00`;
      } else if (scheduledDate) {
        scheduledStart = `${scheduledDate}T09:00:00`;
      }

      const response = await apiClient.createVisit({
        patient_id: selectedPatient.id,
        provider_id: user!.id,
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        reason_for_visit: reasonForVisit || undefined,
        scheduled_start: scheduledStart,
      });

      toast.success('Visit created successfully!');

      // Navigate to the visit detail page
      router.push(`/provider/visits/${response.data.id}`);
    } catch (error: any) {
      console.error('Create visit error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create visit');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !['doctor', 'nurse', 'admin', 'staff'].includes(user?.role || '')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Visit</h1>
              <p className="text-sm text-gray-600">Schedule a new patient visit</p>
            </div>
            <Link href="/provider/visits">
              <Button variant="outline">Back to Visits</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleCreateVisit} className="space-y-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient *
              </label>
              <div className="relative">
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowPatientList(true);
                    setSelectedPatient(null);
                  }}
                  onFocus={() => setShowPatientList(true)}
                  placeholder="Search by name or MRN..."
                  className="w-full"
                />

                {showPatientList && searchTerm && filteredPatients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => handlePatientSelect(patient)}
                        className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </div>
                        <div className="text-sm text-gray-600">MRN: {patient.mrn}</div>
                        <div className="text-xs text-gray-500">
                          DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPatient && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedPatient.first_name} {selectedPatient.last_name}
                        </div>
                        <div className="text-sm text-gray-600">MRN: {selectedPatient.mrn}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setSearchTerm('');
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visit Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visit Type *
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="initial">Initial Visit</option>
                <option value="follow_up">Follow-up Visit</option>
                <option value="urgent">Urgent Care</option>
                <option value="routine">Routine / Annual Physical</option>
                <option value="telehealth">Telehealth</option>
                <option value="in_person">In-Person</option>
              </select>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chief Complaint *
              </label>
              <Input
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g., Persistent headache, Annual checkup, Follow-up for diabetes"
                className="w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Brief description of the primary reason for this visit
              </p>
            </div>

            {/* Reason for Visit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Reason for Visit
              </label>
              <textarea
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="Additional details about the visit purpose, symptoms, or concerns..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
              />
            </div>

            {/* Scheduled Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date
                </label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Time
                </label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !selectedPatient || !chiefComplaint.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating Visit...
                  </>
                ) : (
                  'Create Visit'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/provider/visits')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">📋 Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Select a patient by searching for their name or email</li>
            <li>• Choose the appropriate visit type for this appointment</li>
            <li>• Enter a brief chief complaint describing the primary reason</li>
            <li>• Optionally add scheduled date/time or leave blank for immediate visit</li>
            <li>• After creation, you'll be taken to the visit page where you can start the visit</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
