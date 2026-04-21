'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescriber?: string;
  notes?: string;
  status: 'active' | 'discontinued' | 'completed';
}

interface MedicationsPanelProps {
  patientId: string;
  medications: Medication[];
  onAdd?: (medication: Omit<Medication, 'id'>) => void;
  onUpdate?: (id: string, medication: Partial<Medication>) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function MedicationsPanel({
  patientId,
  medications,
  onAdd,
  onUpdate,
  onDelete,
  readOnly = false
}: MedicationsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'active' as const
  });

  const handleAdd = () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency) {
      toast.error('Please fill in medication name, dosage, and frequency');
      return;
    }

    if (onAdd) {
      onAdd(newMed);
      toast.success('Medication added');
      setIsAdding(false);
      setNewMed({
        name: '',
        dosage: '',
        frequency: '',
        route: 'oral',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'active'
      });
    }
  };

  const handleEPrescribe = () => {
    toast('🔌 E-Prescribe Integration Required\n\nThis feature requires integration with:\n• SureScripts for e-prescribing\n• Insurance verification system\n• Pharmacy network\n\nCurrently in MVP phase - manual entry available.', {
      icon: '💊',
      duration: 5000
    });
  };

  const handleDrugInteraction = () => {
    toast('🔌 Drug Interaction Check\n\nRequires integration with clinical decision support system (e.g., First Databank, Lexicomp)', {
      icon: '⚠️',
      duration: 4000
    });
  };

  const activeMeds = medications.filter(m => m.status === 'active');
  const inactiveMeds = medications.filter(m => m.status !== 'active');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Medications</h3>
          <p className="text-sm text-gray-600">
            {activeMeds.length} active medication{activeMeds.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDrugInteraction}
            >
              🔍 Check Interactions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEPrescribe}
            >
              💊 E-Prescribe
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              + Add Medication
            </Button>
          </div>
        )}
      </div>

      {/* Add New Medication Form */}
      {isAdding && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Add New Medication</h4>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Medication Name *"
              value={newMed.name}
              onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
              placeholder="e.g., Lisinopril"
            />
            <Input
              label="Dosage *"
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              placeholder="e.g., 10mg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Frequency *"
              value={newMed.frequency}
              onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
              placeholder="e.g., Once daily"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route of Administration
              </label>
              <select
                value={newMed.route}
                onChange={(e) => setNewMed({ ...newMed, route: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="oral">Oral</option>
                <option value="topical">Topical</option>
                <option value="injection">Injection</option>
                <option value="inhalation">Inhalation</option>
                <option value="sublingual">Sublingual</option>
                <option value="transdermal">Transdermal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Start Date"
            type="date"
            value={newMed.start_date}
            onChange={(e) => setNewMed({ ...newMed, start_date: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={newMed.notes}
              onChange={(e) => setNewMed({ ...newMed, notes: e.target.value })}
              rows={2}
              placeholder="Additional instructions or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              Add Medication
            </Button>
          </div>
        </div>
      )}

      {/* Active Medications */}
      {activeMeds.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Medications</h4>
          <div className="space-y-2">
            {activeMeds.map((med) => (
              <div
                key={med.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-gray-900">{med.name}</h5>
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {med.dosage} • {med.frequency} • {med.route}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Started: {new Date(med.start_date).toLocaleDateString()}
                      {med.prescriber && ` • Prescribed by: ${med.prescriber}`}
                    </p>
                    {med.notes && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        Note: {med.notes}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onUpdate?.(med.id, { status: 'discontinued' })}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        Discontinue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Medications */}
      {inactiveMeds.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Past Medications ({inactiveMeds.length})
          </h4>
          <div className="space-y-2">
            {inactiveMeds.map((med) => (
              <div
                key={med.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-gray-700">{med.name}</h5>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                        {med.status === 'discontinued' ? 'Discontinued' : 'Completed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {med.dosage} • {med.frequency}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(med.start_date).toLocaleDateString()} - {med.end_date ? new Date(med.end_date).toLocaleDateString() : 'Discontinued'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {medications.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No medications recorded</p>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="mt-3"
            >
              + Add First Medication
            </Button>
          )}
        </div>
      )}

      {/* EHR Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">MVP Version - Manual Entry</p>
            <p className="mt-1">
              E-prescribing, drug interaction checks, and pharmacy integration require EHR/pharmacy system connection.
              Current version supports manual medication tracking for documentation purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
