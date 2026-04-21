"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import toast from 'react-hot-toast';

interface MedicalHistoryFormProps {
  patientId?: string;
  onComplete?: () => void;
}

interface MedicalHistoryData {
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  past_surgeries: string[];
  family_history: string[];
  notes: string;
}

const STEPS = [
  { id: 1, title: 'Allergies', description: 'List any allergies or adverse reactions' },
  { id: 2, title: 'Chronic Conditions', description: 'Ongoing medical conditions' },
  { id: 3, title: 'Medications', description: 'Current medications and dosages' },
  { id: 4, title: 'Past Surgeries', description: 'Previous surgical procedures' },
  { id: 5, title: 'Family History', description: 'Significant family medical history' },
  { id: 6, title: 'Additional Notes', description: 'Any other relevant information' },
];

export default function MedicalHistoryForm({ patientId, onComplete }: MedicalHistoryFormProps) {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<MedicalHistoryData>({
    allergies: [],
    chronic_conditions: [],
    current_medications: [],
    past_surgeries: [],
    family_history: [],
    notes: '',
  });

  // Temporary input values
  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [surgeryInput, setSurgeryInput] = useState('');
  const [familyHistoryInput, setFamilyHistoryInput] = useState('');

  const addItem = (field: keyof MedicalHistoryData, value: string) => {
    if (!value.trim()) {
      toast.error('Please enter a value');
      return;
    }

    const currentArray = formData[field] as string[];
    if (currentArray.includes(value.trim())) {
      toast.error('This item already exists');
      return;
    }

    setFormData({
      ...formData,
      [field]: [...currentArray, value.trim()],
    });

    // Clear the input
    switch (field) {
      case 'allergies':
        setAllergyInput('');
        break;
      case 'chronic_conditions':
        setConditionInput('');
        break;
      case 'current_medications':
        setMedicationInput('');
        break;
      case 'past_surgeries':
        setSurgeryInput('');
        break;
      case 'family_history':
        setFamilyHistoryInput('');
        break;
    }
  };

  const removeItem = (field: keyof MedicalHistoryData, index: number) => {
    const currentArray = formData[field] as string[];
    setFormData({
      ...formData,
      [field]: currentArray.filter((_, i) => i !== index),
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const effectivePatientId = patientId || user?.id;

      if (!effectivePatientId) {
        toast.error('Patient ID not found');
        return;
      }

      // First, get the current patient data to ensure we have all fields
      const currentPatient = await apiClient.getPatient(effectivePatientId);

      // Prepare update data - only include medical history fields
      const updateData = {
        allergies: formData.allergies,
        chronic_conditions: formData.chronic_conditions,
        current_medications: formData.current_medications,
        notes: formData.notes,
        // Keep existing data for other fields
        first_name: currentPatient.first_name,
        last_name: currentPatient.last_name,
        date_of_birth: currentPatient.date_of_birth,
        gender: currentPatient.gender,
      };

      await apiClient.updatePatient(effectivePatientId, updateData);

      toast.success('Medical history saved successfully!');

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error saving medical history:', error);
      toast.error(error.response?.data?.detail || 'Failed to save medical history');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="allergy">Add Allergy</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="allergy"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="e.g., Penicillin, Peanuts, Latex"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('allergies', allergyInput)}
                />
                <Button
                  type="button"
                  onClick={() => addItem('allergies', allergyInput)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.allergies.length > 0 && (
              <div className="space-y-2">
                <Label>Current Allergies:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="flex items-center gap-1">
                      {allergy}
                      <button
                        onClick={() => removeItem('allergies', index)}
                        className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.allergies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No allergies added yet</p>
                <p className="text-sm">Add allergies to medications, foods, or other substances</p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="condition">Add Chronic Condition</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="condition"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  placeholder="e.g., Diabetes Type 2, Hypertension, Asthma"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('chronic_conditions', conditionInput)}
                />
                <Button
                  type="button"
                  onClick={() => addItem('chronic_conditions', conditionInput)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.chronic_conditions.length > 0 && (
              <div className="space-y-2">
                <Label>Current Conditions:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.chronic_conditions.map((condition, index) => (
                    <Badge key={index} variant="warning" className="flex items-center gap-1">
                      {condition}
                      <button
                        onClick={() => removeItem('chronic_conditions', index)}
                        className="ml-1 hover:bg-yellow-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.chronic_conditions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No chronic conditions added yet</p>
                <p className="text-sm">Add any ongoing medical conditions</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="medication">Add Medication</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="medication"
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  placeholder="e.g., Metformin 500mg twice daily"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('current_medications', medicationInput)}
                />
                <Button
                  type="button"
                  onClick={() => addItem('current_medications', medicationInput)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Include medication name, dosage, and frequency
              </p>
            </div>

            {formData.current_medications.length > 0 && (
              <div className="space-y-2">
                <Label>Current Medications:</Label>
                <div className="space-y-2">
                  {formData.current_medications.map((medication, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <span className="text-sm text-blue-900">{medication}</span>
                      <button
                        onClick={() => removeItem('current_medications', index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.current_medications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No medications added yet</p>
                <p className="text-sm">Add all current medications including over-the-counter drugs</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="surgery">Add Past Surgery</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="surgery"
                  value={surgeryInput}
                  onChange={(e) => setSurgeryInput(e.target.value)}
                  placeholder="e.g., Appendectomy (2015), Knee arthroscopy (2020)"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('past_surgeries', surgeryInput)}
                />
                <Button
                  type="button"
                  onClick={() => addItem('past_surgeries', surgeryInput)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.past_surgeries.length > 0 && (
              <div className="space-y-2">
                <Label>Past Surgeries:</Label>
                <div className="space-y-2">
                  {formData.past_surgeries.map((surgery, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <span className="text-sm text-gray-900">{surgery}</span>
                      <button
                        onClick={() => removeItem('past_surgeries', index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.past_surgeries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No past surgeries added yet</p>
                <p className="text-sm">Add any previous surgical procedures with approximate dates</p>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="family-history">Add Family History</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="family-history"
                  value={familyHistoryInput}
                  onChange={(e) => setFamilyHistoryInput(e.target.value)}
                  placeholder="e.g., Father: Heart disease (age 60), Mother: Diabetes"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('family_history', familyHistoryInput)}
                />
                <Button
                  type="button"
                  onClick={() => addItem('family_history', familyHistoryInput)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.family_history.length > 0 && (
              <div className="space-y-2">
                <Label>Family Medical History:</Label>
                <div className="space-y-2">
                  {formData.family_history.map((history, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3"
                    >
                      <span className="text-sm text-purple-900">{history}</span>
                      <button
                        onClick={() => removeItem('family_history', index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.family_history.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No family history added yet</p>
                <p className="text-sm">Add significant medical conditions in your family</p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any other relevant medical information, lifestyle factors, or concerns..."
                className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3">Summary</h4>
              <div className="space-y-2 text-sm text-green-800">
                <p>✓ Allergies: {formData.allergies.length}</p>
                <p>✓ Chronic Conditions: {formData.chronic_conditions.length}</p>
                <p>✓ Current Medications: {formData.current_medications.length}</p>
                <p>✓ Past Surgeries: {formData.past_surgeries.length}</p>
                <p>✓ Family History: {formData.family_history.length}</p>
                <p>✓ Additional Notes: {formData.notes ? 'Provided' : 'None'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {currentStep} of {STEPS.length}</span>
          <span>{Math.round((currentStep / STEPS.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${
              step.id === currentStep
                ? 'text-blue-600'
                : step.id < currentStep
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step.id === currentStep
                  ? 'border-blue-600 bg-blue-50'
                  : step.id < currentStep
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {step.id < currentStep ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <span className="font-semibold">{step.id}</span>
              )}
            </div>
            <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            renderStepContent()
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
