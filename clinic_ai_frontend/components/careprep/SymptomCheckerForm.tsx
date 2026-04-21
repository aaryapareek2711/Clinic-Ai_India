'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';

interface Symptom {
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | '';
  duration: string;
}

export interface SymptomCheckerData {
  symptoms: Symptom[];
  urgency?: string;
  recommendations?: string;
  analysis?: string;
}

interface Props {
  appointmentId: string;
  initialData?: SymptomCheckerData;
  onSave: (data: SymptomCheckerData) => Promise<void>;
}

export default function SymptomCheckerForm({ appointmentId, initialData, onSave }: Props) {
  const [symptoms, setSymptoms] = useState<Symptom[]>(
    initialData?.symptoms || [{ name: '', severity: '', duration: '' }]
  );
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      // Filter out empty symptoms
      const validSymptoms = symptoms.filter(s => s.name.trim() !== '');

      if (validSymptoms.length === 0) {
        alert('Please add at least one symptom');
        setSaving(false);
        return;
      }

      // Calculate urgency based on severity
      const hasSevere = validSymptoms.some(s => s.severity === 'severe');
      const hasModerate = validSymptoms.some(s => s.severity === 'moderate');

      let urgency = 'low';
      if (hasSevere) {
        urgency = 'high';
      } else if (hasModerate) {
        urgency = 'moderate';
      }

      // Generate simple recommendations
      let recommendations = '';
      if (urgency === 'high') {
        recommendations = 'Based on your symptoms, we recommend discussing these concerns with your provider at your appointment. If symptoms worsen significantly, seek immediate medical attention.';
      } else if (urgency === 'moderate') {
        recommendations = 'Please discuss these symptoms with your provider during your upcoming appointment.';
      } else {
        recommendations = 'Your symptoms appear mild. Please mention them to your provider during your visit.';
      }

      const data: SymptomCheckerData = {
        symptoms: validSymptoms.map(s => ({
          name: s.name,
          severity: s.severity || 'mild',
          duration: s.duration
        })),
        urgency,
        recommendations,
        analysis: additionalInfo || 'Patient-reported symptoms for upcoming appointment.'
      };

      await onSave(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving symptom checker:', error);
      alert('Failed to save symptoms. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'mild':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">About the Symptom Checker</p>
              <p>
                This tool helps you share information about symptoms you're experiencing with your provider.
                It's not a diagnostic tool - your provider will review this information during your appointment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptoms Form */}
      <Card>
        <CardHeader>
          <CardTitle>Your Symptoms</CardTitle>
          <CardDescription>List any symptoms you've been experiencing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {symptoms.map((symptom, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder="Symptom name (e.g., Headache, Fever, Fatigue)"
                    value={symptom.name}
                    onChange={(e) => {
                      const newSymptoms = [...symptoms];
                      newSymptoms[index].name = e.target.value;
                      setSymptoms(newSymptoms);
                    }}
                    className="w-full border rounded px-3 py-2"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity
                      </label>
                      <select
                        value={symptom.severity}
                        onChange={(e) => {
                          const newSymptoms = [...symptoms];
                          newSymptoms[index].severity = e.target.value as any;
                          setSymptoms(newSymptoms);
                        }}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select severity</option>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 3 days, 2 weeks"
                        value={symptom.duration}
                        onChange={(e) => {
                          const newSymptoms = [...symptoms];
                          newSymptoms[index].duration = e.target.value;
                          setSymptoms(newSymptoms);
                        }}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  {symptom.severity && (
                    <div>
                      <Badge className={getSeverityColor(symptom.severity)}>
                        {symptom.severity.charAt(0).toUpperCase() + symptom.severity.slice(1)} Severity
                      </Badge>
                    </div>
                  )}
                </div>

                {symptoms.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSymptoms(symptoms.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSymptoms([...symptoms, { name: '', severity: '', duration: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Another Symptom
          </Button>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>
            Any other details about your symptoms that might be helpful for your provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="For example: What makes symptoms better or worse? Any triggers you've noticed? How symptoms affect your daily activities?"
            rows={5}
            className="w-full border rounded px-3 py-2 resize-none"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white border-t p-4 -mx-4 -mb-4">
        <div className="flex gap-3 items-center justify-between">
          {saveSuccess && (
            <p className="text-sm text-green-600 font-medium">✓ Symptoms saved successfully!</p>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Symptoms'}
          </Button>
        </div>
      </div>
    </div>
  );
}
