"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Clock, Syringe, FileSearch } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface CareGapsProps {
  patientId: string;
}

interface CareGap {
  gap_type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  overdue: boolean;
  recommendation: string;
}

interface CareGapsResponse {
  patient_id: string;
  gaps: CareGap[];
  total_gaps: number;
  high_priority_count: number;
  overdue_count: number;
}

export default function CareGaps({ patientId }: CareGapsProps) {
  const [careGaps, setCareGaps] = useState<CareGapsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCareGaps();
  }, [patientId]);

  const loadCareGaps = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getCareGaps(patientId);
      setCareGaps(data);
    } catch (err: any) {
      console.error('Error loading care gaps:', err);
      toast.error('Failed to load care gaps');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getGapTypeIcon = (gapType: string) => {
    if (gapType.toLowerCase().includes('vaccination')) {
      return <Syringe className="h-5 w-5" />;
    }
    if (gapType.toLowerCase().includes('screening')) {
      return <FileSearch className="h-5 w-5" />;
    }
    return <AlertCircle className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading care gaps...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!careGaps || careGaps.total_gaps === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Care Gaps Identified
          </h3>
          <p className="text-gray-600">
            Patient is up to date with all recommended care
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Care Gaps</CardTitle>
              <CardDescription>
                {careGaps.total_gaps} gap{careGaps.total_gaps !== 1 ? 's' : ''} identified
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {careGaps.high_priority_count > 0 && (
                <Badge variant="destructive">
                  {careGaps.high_priority_count} High Priority
                </Badge>
              )}
              {careGaps.overdue_count > 0 && (
                <Badge variant="warning">
                  {careGaps.overdue_count} Overdue
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Care Gaps List */}
      {careGaps.gaps.map((gap, index) => (
        <Card
          key={index}
          className={gap.overdue ? 'border-red-200 bg-red-50' : ''}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`mt-1 ${gap.overdue ? 'text-red-600' : 'text-blue-600'}`}>
                  {getGapTypeIcon(gap.gap_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{gap.description}</CardTitle>
                    {gap.overdue && (
                      <Badge variant="destructive" className="text-xs">
                        OVERDUE
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="capitalize">
                    {gap.gap_type.replace('_', ' ')}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={getPriorityColor(gap.priority)}>
                {gap.priority.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Due Date */}
            {gap.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Due: {new Date(gap.due_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Recommendation */}
            <div className={`rounded-lg p-3 ${
              gap.overdue
                ? 'bg-red-100 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <h4 className={`font-semibold text-sm mb-1 ${
                gap.overdue ? 'text-red-900' : 'text-blue-900'
              }`}>
                Recommendation
              </h4>
              <p className={`text-sm ${
                gap.overdue ? 'text-red-800' : 'text-blue-800'
              }`}>
                {gap.recommendation}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
