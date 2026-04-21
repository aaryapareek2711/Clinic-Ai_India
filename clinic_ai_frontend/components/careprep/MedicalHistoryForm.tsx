'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Save } from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Allergy {
  allergen: string;
  reaction: string;
}

interface Condition {
  condition: string;
  diagnosed: string;
}

interface FamilyHistory {
  condition: string;
  relative: string;
}

interface Surgery {
  procedure: string;
  date: string;
}

interface Immunization {
  vaccine: string;
  date: string;
}

export interface MedicalHistoryData {
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
  family_history: FamilyHistory[];
  surgeries: Surgery[];
  immunizations: Immunization[];
}

interface Props {
  appointmentId: string;
  initialData?: MedicalHistoryData;
  onSave: (data: MedicalHistoryData) => Promise<void>;
}

export default function MedicalHistoryForm({ appointmentId, initialData, onSave }: Props) {
  const [medications, setMedications] = useState<Medication[]>(
    initialData?.medications || [{ name: '', dosage: '', frequency: '' }]
  );
  const [allergies, setAllergies] = useState<Allergy[]>(
    initialData?.allergies || [{ allergen: '', reaction: '' }]
  );
  const [conditions, setConditions] = useState<Condition[]>(
    initialData?.conditions || [{ condition: '', diagnosed: '' }]
  );
  const [familyHistory, setFamilyHistory] = useState<FamilyHistory[]>(
    initialData?.family_history || [{ condition: '', relative: '' }]
  );
  const [surgeries, setSurgeries] = useState<Surgery[]>(
    initialData?.surgeries || [{ procedure: '', date: '' }]
  );
  const [immunizations, setImmunizations] = useState<Immunization[]>(
    initialData?.immunizations || [{ vaccine: '', date: '' }]
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const data: MedicalHistoryData = {
        medications: medications.filter(m => m.name.trim() !== ''),
        allergies: allergies.filter(a => a.allergen.trim() !== ''),
        conditions: conditions.filter(c => c.condition.trim() !== ''),
        family_history: familyHistory.filter(f => f.condition.trim() !== ''),
        surgeries: surgeries.filter(s => s.procedure.trim() !== ''),
        immunizations: immunizations.filter(i => i.vaccine.trim() !== '')
      };

      await onSave(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving medical history:', error);
      alert('Failed to save medical history. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle>Current Medications</CardTitle>
          <CardDescription>List all medications you are currently taking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {medications.map((med, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Medication name"
                  value={med.name}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[index].name = e.target.value;
                    setMedications(newMeds);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Dosage (e.g., 10mg)"
                  value={med.dosage}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[index].dosage = e.target.value;
                    setMedications(newMeds);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Frequency (e.g., twice daily)"
                  value={med.frequency}
                  onChange={(e) => {
                    const newMeds = [...medications];
                    newMeds[index].frequency = e.target.value;
                    setMedications(newMeds);
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
              {medications.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMedications(medications.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMedications([...medications, { name: '', dosage: '', frequency: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Medication
          </Button>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle>Allergies</CardTitle>
          <CardDescription>List any known allergies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allergies.map((allergy, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Allergen (e.g., Penicillin)"
                  value={allergy.allergen}
                  onChange={(e) => {
                    const newAllergies = [...allergies];
                    newAllergies[index].allergen = e.target.value;
                    setAllergies(newAllergies);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Reaction (e.g., Rash)"
                  value={allergy.reaction}
                  onChange={(e) => {
                    const newAllergies = [...allergies];
                    newAllergies[index].reaction = e.target.value;
                    setAllergies(newAllergies);
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
              {allergies.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllergies(allergies.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllergies([...allergies, { allergen: '', reaction: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Allergy
          </Button>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Conditions</CardTitle>
          <CardDescription>List any chronic or ongoing medical conditions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {conditions.map((condition, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Condition (e.g., Hypertension)"
                  value={condition.condition}
                  onChange={(e) => {
                    const newConditions = [...conditions];
                    newConditions[index].condition = e.target.value;
                    setConditions(newConditions);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="date"
                  placeholder="Diagnosed date"
                  value={condition.diagnosed}
                  onChange={(e) => {
                    const newConditions = [...conditions];
                    newConditions[index].diagnosed = e.target.value;
                    setConditions(newConditions);
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
              {conditions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConditions([...conditions, { condition: '', diagnosed: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Condition
          </Button>
        </CardContent>
      </Card>

      {/* Family History */}
      <Card>
        <CardHeader>
          <CardTitle>Family History</CardTitle>
          <CardDescription>List any significant family medical history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {familyHistory.map((history, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Condition (e.g., Heart Disease)"
                  value={history.condition}
                  onChange={(e) => {
                    const newHistory = [...familyHistory];
                    newHistory[index].condition = e.target.value;
                    setFamilyHistory(newHistory);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Relative (e.g., Father)"
                  value={history.relative}
                  onChange={(e) => {
                    const newHistory = [...familyHistory];
                    newHistory[index].relative = e.target.value;
                    setFamilyHistory(newHistory);
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
              {familyHistory.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFamilyHistory(familyHistory.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFamilyHistory([...familyHistory, { condition: '', relative: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Family History
          </Button>
        </CardContent>
      </Card>

      {/* Surgeries */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Surgeries</CardTitle>
          <CardDescription>List any surgical procedures you've had</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {surgeries.map((surgery, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Procedure (e.g., Appendectomy)"
                  value={surgery.procedure}
                  onChange={(e) => {
                    const newSurgeries = [...surgeries];
                    newSurgeries[index].procedure = e.target.value;
                    setSurgeries(newSurgeries);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="date"
                  placeholder="Date"
                  value={surgery.date}
                  onChange={(e) => {
                    const newSurgeries = [...surgeries];
                    newSurgeries[index].date = e.target.value;
                    setSurgeries(newSurgeries);
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
              {surgeries.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSurgeries(surgeries.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSurgeries([...surgeries, { procedure: '', date: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Surgery
          </Button>
        </CardContent>
      </Card>

      {/* Immunizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Immunizations</CardTitle>
          <CardDescription>List recent vaccines you've received</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {immunizations.map((immunization, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Vaccine (e.g., COVID-19)"
                  value={immunization.vaccine}
                  onChange={(e) => {
                    const newImmunizations = [...immunizations];
                    newImmunizations[index].vaccine = e.target.value;
                    setImmunizations(newImmunizations);
                  }}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="date"
                  placeholder="Date"
                  value={immunization.date}
                  onChange={(e) => {
                    const newImmunizations = [...immunizations];
                    newImmunizations[index].date = e.target.value;
                    setImmunizations(newImmunizations);
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
              {immunizations.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImmunizations(immunizations.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImmunizations([...immunizations, { vaccine: '', date: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Immunization
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white border-t p-4 -mx-4 -mb-4">
        <div className="flex gap-3 items-center justify-between">
          {saveSuccess && (
            <p className="text-sm text-green-600 font-medium">✓ Medical history saved successfully!</p>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Medical History'}
          </Button>
        </div>
      </div>
    </div>
  );
}
