'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, FileText, Edit3, PlayCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Visit {
  id: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
  chief_complaint?: string;
  status: string;
  actual_start?: string;
  scheduled_start?: string;
}

const soapStatusColorMap: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  pending: "bg-orange-100 text-orange-700",
  scheduled: "bg-gray-100 text-gray-700",
};

const soapStatusLabelMap: Record<string, string> = {
  completed: "Complete",
  in_progress: "In Progress",
  pending: "Not Started",
  scheduled: "Scheduled",
};

export default function RecentVisitsCard({ providerId }: { providerId: string }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVisits();
  }, [providerId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProviderVisits(providerId);
      // Ensure we always get an array
      const visitsData = Array.isArray(response?.data) ? response.data :
                         Array.isArray(response) ? response : [];
      setVisits(visitsData);
    } catch (err: any) {
      console.error('Failed to fetch visits:', err);
      // Don't show error, just show empty state
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusKey = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'completed';
    if (s === 'in_progress') return 'in_progress';
    if (s === 'scheduled') return 'scheduled';
    return 'pending';
  };

  const formatDate = (visit: Visit) => {
    const dateStr = visit.actual_start || visit.scheduled_start;
    if (!dateStr) return 'Not scheduled';
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const pendingCount = visits.filter(v => v.status !== 'completed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              Recent Visits & SOAP Notes
            </CardTitle>
            <CardDescription>Documentation status for recent patient encounters</CardDescription>
          </div>
          <Link href="/provider/visits/new">
            <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700">
              <PlayCircle className="w-4 h-4 mr-2" />
              Start New Visit
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600">Loading visits...</span>
          </div>
        ) : visits.length > 0 ? (
          <>
            <ul className="space-y-3">
              {visits.slice(0, 5).map((visit) => {
                const statusKey = getStatusKey(visit.status);
                return (
                  <li key={visit.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Unknown Patient'}
                        </span>
                        <Badge className={soapStatusColorMap[statusKey]}>
                          {soapStatusLabelMap[statusKey]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{visit.chief_complaint || 'No complaint recorded'}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(visit)}</p>
                    </div>
                    <Link href={`/provider/visits/${visit.id}`}>
                      <Button variant="outline" size="sm">
                        {statusKey === 'completed' ? (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Document
                          </>
                        )}
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {pendingCount > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium">
                  {pendingCount} visit{pendingCount > 1 ? 's' : ''} need documentation
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Complete SOAP notes to ensure accurate patient records
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Visits</h3>
            <p className="text-gray-600 mb-4">
              Start a new visit to begin documenting patient encounters with AI assistance.
            </p>
            <Link href="/provider/visits/new">
              <Button variant="primary" className="bg-purple-600 hover:bg-purple-700">
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Your First Visit
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
