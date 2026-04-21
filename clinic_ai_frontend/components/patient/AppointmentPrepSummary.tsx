'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api/client';
import type {
  PatientSummaryResponse,
  DiscussionTopic,
  AppointmentPrepItem,
} from '@/lib/types/patientSummary';
import {
  User,
  Calendar,
  MessageCircle,
  Pill,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Heart,
  Clipboard,
  AlertCircle,
  Shield,
  FileText,
  Syringe,
  Stethoscope,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AppointmentPrepSummaryProps {
  patientId: string;
  onRefresh?: () => void;
}

export function AppointmentPrepSummary({ patientId, onRefresh }: AppointmentPrepSummaryProps) {
  const [summary, setSummary] = useState<PatientSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSummary();
  }, [patientId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPatientSummary(patientId, {
        include_appointment_prep: true,
      });
      setSummary(data);

      // Load saved checked items from localStorage
      const savedChecks = localStorage.getItem(`prep-checks-${patientId}`);
      if (savedChecks) {
        setCheckedItems(new Set(JSON.parse(savedChecks)));
      }
    } catch (err: any) {
      console.error('Error fetching patient summary:', err);
      setError(err.response?.data?.detail || 'Failed to load appointment preparation summary');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);

    // Save to localStorage
    localStorage.setItem(`prep-checks-${patientId}`, JSON.stringify(Array.from(newChecked)));
  };

  const handleRefresh = () => {
    fetchSummary();
    onRefresh?.();
  };

  const getTopicIcon = (iconName?: string | null) => {
    switch (iconName) {
      case 'heart':
        return <Heart className="h-5 w-5" />;
      case 'clipboard':
        return <Clipboard className="h-5 w-5" />;
      case 'alert-circle':
        return <AlertCircle className="h-5 w-5" />;
      case 'calendar':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Stethoscope className="h-5 w-5" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'screening':
        return <Stethoscope className="h-4 w-4" />;
      case 'vaccination':
        return <Syringe className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const completionProgress = summary?.appointment_prep
    ? (Array.from(checkedItems).length / summary.appointment_prep.length) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No appointment preparation data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {summary.patient_info.first_name} {summary.patient_info.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {summary.patient_info.age && `Age ${summary.patient_info.age} • `}
              Appointment Preparation
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Appointment Date */}
      {summary.appointment_date && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Upcoming Appointment</p>
              <p className="text-sm text-muted-foreground">
                {new Date(summary.appointment_date).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symptoms Summary */}
      {summary.symptoms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Your Symptoms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{summary.symptoms.chief_complaint}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {summary.symptoms.urgency_message}
              </p>
            </div>

            {summary.symptoms.next_steps.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">What to do before your visit:</p>
                <ul className="space-y-2">
                  {summary.symptoms.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Topics to Discuss */}
      {summary.topics_to_discuss.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Topics We'll Discuss
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your provider wants to talk about these important topics during your visit
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topics_to_discuss.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`mt-1 ${getPriorityColor(topic.priority)} p-2 rounded`}>
                    {getTopicIcon(topic.icon)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{topic.text}</p>
                      <Badge variant="outline" className="text-xs">
                        {topic.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications to Confirm */}
      {summary.medications_to_confirm.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Please Confirm Your Medications
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Review this list and let us know if anything has changed
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.medications_to_confirm.map((med) => (
                <div
                  key={med.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">{med.name}</p>
                    {med.instructions && (
                      <p className="text-sm text-muted-foreground">{med.instructions}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If any medications have changed or if you've stopped taking any of these, please
                bring an updated list to your appointment.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Allergies */}
      {summary.allergies.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="bg-red-50 dark:bg-red-950">
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
              <AlertTriangle className="h-5 w-5" />
              Your Allergies
            </CardTitle>
            <p className="text-sm text-red-700 dark:text-red-300">
              These are recorded in your medical record for your safety
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {summary.allergies.map((allergy, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
                >
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900 dark:text-red-100">
                      {allergy.allergen}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 capitalize">
                      Severity: {allergy.severity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment Preparation Checklist */}
      {summary.appointment_prep.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Before Your Appointment
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete these items to help make your visit more efficient
            </p>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completion Progress</span>
                <span className="font-medium">{Math.round(completionProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${completionProgress}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.appointment_prep.map((item) => {
                const isChecked = checkedItems.has(item.id);
                const isOverdue = item.due_date && new Date(item.due_date) < new Date();

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isChecked ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'bg-card'
                    } transition-colors`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={isChecked}
                      onCheckedChange={() => handleCheckItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={item.id}
                        className={`flex items-start gap-2 cursor-pointer ${
                          isChecked ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        <div className="mt-0.5">{getCategoryIcon(item.category)}</div>
                        <div className="flex-1">
                          <p className="font-medium">{item.text}</p>
                          {item.due_date && (
                            <p
                              className={`text-sm ${
                                isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                              }`}
                            >
                              {isOverdue ? '⚠️ Overdue: ' : 'Due: '}
                              {new Date(item.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message from Team */}
      {summary.message_from_team && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Message from Your Care Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{summary.message_from_team}</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>
          Last updated{' '}
          {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
        </p>
        <p className="mt-1">
          If you have questions or concerns, please contact your healthcare provider.
        </p>
      </div>
    </div>
  );
}
