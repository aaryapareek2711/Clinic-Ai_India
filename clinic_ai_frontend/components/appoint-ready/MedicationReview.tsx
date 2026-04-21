"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pill, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface MedicationReviewProps {
  patientId: string;
}

interface Medication {
  medication_id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  status: 'active' | 'on_hold' | 'completed';
  prescriber?: string;
  indication?: string;
}

interface Interaction {
  interaction_id: string;
  severity: 'severe' | 'moderate' | 'mild';
  medication_1: string;
  medication_2: string;
  description: string;
  clinical_effect: string;
  recommendation: string;
}

interface Allergy {
  allergen: string;
  reaction: string;
  severity: 'severe' | 'moderate' | 'mild';
}

interface MedicationReviewResponse {
  patient_id: string;
  medications: Medication[];
  interactions: Interaction[];
  allergies: Allergy[];
  total_medications: number;
  interaction_count: number;
  severe_interaction_count: number;
}

export default function MedicationReview({ patientId }: MedicationReviewProps) {
  const [medicationData, setMedicationData] = useState<MedicationReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMedicationReview();
  }, [patientId]);

  const loadMedicationReview = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getMedicationReview(patientId);
      setMedicationData(data);
    } catch (err: any) {
      console.error('Error loading medication review:', err);
      toast.error('Failed to load medication review');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'severe':
        return 'destructive';
      case 'moderate':
        return 'warning';
      case 'mild':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getInteractionBorderColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'severe':
        return 'border-red-300 bg-red-50';
      case 'moderate':
        return 'border-yellow-300 bg-yellow-50';
      case 'mild':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'on_hold':
        return <Badge variant="warning">On Hold</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading medication review...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!medicationData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-600">
          No medication data available
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Pill className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Medication Review</CardTitle>
                <CardDescription>
                  {medicationData.total_medications} active medication(s)
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {medicationData.severe_interaction_count > 0 && (
                <Badge variant="destructive">
                  {medicationData.severe_interaction_count} Severe Interaction{medicationData.severe_interaction_count !== 1 ? 's' : ''}
                </Badge>
              )}
              {medicationData.interaction_count > 0 && medicationData.severe_interaction_count === 0 && (
                <Badge variant="warning">
                  {medicationData.interaction_count} Interaction{medicationData.interaction_count !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Drug Allergies Alert */}
      {medicationData.allergies.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg text-red-900">Drug Allergies</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {medicationData.allergies.map((allergy, index) => (
                <div key={index} className="bg-white border border-red-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-red-900">{allergy.allergen}</h4>
                    <Badge variant={getSeverityColor(allergy.severity)}>
                      {allergy.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-800">
                    <strong>Reaction:</strong> {allergy.reaction}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drug Interactions */}
      {medicationData.interactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <CardTitle className="text-lg">Drug Interactions Detected</CardTitle>
                <CardDescription>
                  {medicationData.interaction_count} interaction{medicationData.interaction_count !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {medicationData.interactions.map((interaction) => (
                <div
                  key={interaction.interaction_id}
                  className={`border rounded-lg p-4 ${getInteractionBorderColor(interaction.severity)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {interaction.medication_1} ↔ {interaction.medication_2}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-700">{interaction.description}</p>
                    </div>
                    <Badge variant={getSeverityColor(interaction.severity)} className="ml-2">
                      {interaction.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">Clinical Effect:</p>
                        <p className="text-gray-600">{interaction.clinical_effect}</p>
                      </div>
                    </div>

                    <div className={`p-3 rounded border ${
                      interaction.severity === 'severe'
                        ? 'bg-red-100 border-red-300'
                        : interaction.severity === 'moderate'
                        ? 'bg-yellow-100 border-yellow-300'
                        : 'bg-blue-100 border-blue-300'
                    }`}>
                      <p className="font-semibold text-sm mb-1">Recommendation:</p>
                      <p className="text-sm">{interaction.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Interactions */}
      {medicationData.interactions.length === 0 && medicationData.medications.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              No Drug Interactions Detected
            </h3>
            <p className="text-green-700">
              Current medications appear to be compatible
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active Medications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Medications</CardTitle>
          <CardDescription>
            {medicationData.medications.filter(m => m.status === 'active').length} active prescription(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {medicationData.medications.length > 0 ? (
            <div className="space-y-3">
              {medicationData.medications.map((med) => (
                <div
                  key={med.medication_id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{med.name}</h4>
                        {getStatusBadge(med.status)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Dosage:</strong> {med.dosage} | <strong>Frequency:</strong> {med.frequency}
                        </p>
                        <p>
                          <strong>Route:</strong> {med.route} | <strong>Started:</strong> {new Date(med.start_date).toLocaleDateString()}
                        </p>
                        {med.indication && (
                          <p>
                            <strong>Indication:</strong> {med.indication}
                          </p>
                        )}
                        {med.prescriber && (
                          <p className="text-xs text-gray-500">
                            Prescribed by: {med.prescriber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No active medications on record</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      {medicationData.interaction_count > 0 && (
        <div className="text-xs text-gray-500 text-center">
          Drug interaction data sourced from clinical databases. Always verify with pharmacist for critical cases.
        </div>
      )}
    </div>
  );
}
