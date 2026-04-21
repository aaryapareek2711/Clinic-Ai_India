'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CarePrepStatusBadge from '@/components/careprep/CarePrepStatusBadge';
import { Copy, CheckCircle, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Appointment {
  id: string;
  time: string;
  patient: {
    id: string;
    name: string;
  };
  reason: string;
  isNewPatient: boolean;
}

interface CarePrepStatus {
  appointment_id: string;
  medical_history_completed: boolean;
  symptom_checker_completed: boolean;
  all_tasks_completed: boolean;
  completion_percentage: number;
}

interface Props {
  appointments: Appointment[];
}

export default function TodaysScheduleWithCarePrep({ appointments }: Props) {
  const router = useRouter();
  const [carePrepStatuses, setCarePrepStatuses] = useState<Map<string, CarePrepStatus>>(new Map());
  const [carePrepLinks, setCarePrepLinks] = useState<Map<string, string>>(new Map());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingVisit, setCreatingVisit] = useState<string | null>(null);

  useEffect(() => {
    const fetchCarePrepData = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const statusMap = new Map<string, CarePrepStatus>();
      const linkMap = new Map<string, string>();

      // Fetch CarePrep status and links for all appointments
      await Promise.all(
        appointments.map(async (appt) => {
          try {
            // Fetch status
            const statusRes = await fetch(`${API_URL}/api/careprep/${appt.id}/status`, {
              cache: 'no-store',
            });

            if (statusRes.ok) {
              const status = await statusRes.json();
              statusMap.set(appt.id, status);
            }

            // Generate CarePrep link token
            const token = btoa(appt.id);
            const link = `${window.location.origin}/careprep/${token}`;
            linkMap.set(appt.id, link);
          } catch (error) {
            console.error(`Error fetching CarePrep data for ${appt.id}:`, error);
          }
        })
      );

      setCarePrepStatuses(statusMap);
      setCarePrepLinks(linkMap);
      setLoading(false);
    };

    fetchCarePrepData();
  }, [appointments]);

  const copyCarePrepLink = async (appointmentId: string) => {
    const link = carePrepLinks.get(appointmentId);
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopiedId(appointmentId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDocumentVisit = async (appointmentId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    setCreatingVisit(appointmentId);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please log in to create a visit');
        window.location.href = '/login';
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/visits/from-appointment/${appointmentId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const visit = response.data;
      toast.success('Visit created with CarePrep data pre-populated!');

      // Navigate to visit documentation page
      router.push(`/provider/visits/${visit.id}`);
    } catch (error: any) {
      console.error('Error creating visit:', error);

      // Handle authentication errors
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      toast.error(error.response?.data?.detail || 'Failed to create visit');
    } finally {
      setCreatingVisit(null);
    }
  };

  return (
    <ul className="space-y-2">
      {appointments.map((appt) => {
        const status = carePrepStatuses.get(appt.id);
        const link = carePrepLinks.get(appt.id);
        const isCopied = copiedId === appt.id;

        return (
          <li
            key={appt.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="font-mono text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded font-semibold">
                {appt.time}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{appt.patient.name}</span>
                  {appt.isNewPatient && (
                    <Badge className="bg-cyan-100 text-cyan-700 text-xs">New Patient</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{appt.reason}</p>

                {/* CarePrep Status */}
                <div className="mt-2 flex items-center gap-2">
                  {loading ? (
                    <Badge className="bg-gray-100 text-gray-600">Loading...</Badge>
                  ) : status ? (
                    <CarePrepStatusBadge
                      completed={status.all_tasks_completed}
                      percentage={status.completion_percentage}
                      showPercentage={true}
                    />
                  ) : (
                    <CarePrepStatusBadge completed={false} percentage={0} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy CarePrep Link Button */}
              {link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCarePrepLink(appt.id)}
                  title="Copy CarePrep link to share with patient"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      CarePrep Link
                    </>
                  )}
                </Button>
              )}

              {/* Document Visit Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDocumentVisit(appt.id)}
                disabled={creatingVisit === appt.id}
              >
                {creatingVisit === appt.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-1" />
                    Document Visit
                  </>
                )}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
