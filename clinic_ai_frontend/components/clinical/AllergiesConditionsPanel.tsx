'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onset_date?: string;
  notes?: string;
  status: 'active' | 'resolved';
}

interface Condition {
  id: string;
  name: string;
  icd10_code?: string;
  status: 'active' | 'resolved' | 'chronic';
  onset_date?: string;
  resolved_date?: string;
  notes?: string;
}

interface AllergiesConditionsPanelProps {
  patientId: string;
  allergies: Allergy[];
  conditions: Condition[];
  onAddAllergy?: (allergy: Omit<Allergy, 'id'>) => void;
  onAddCondition?: (condition: Omit<Condition, 'id'>) => void;
  onUpdateAllergy?: (id: string, allergy: Partial<Allergy>) => void;
  onUpdateCondition?: (id: string, condition: Partial<Condition>) => void;
  readOnly?: boolean;
}

export function AllergiesConditionsPanel({
  patientId,
  allergies,
  conditions,
  onAddAllergy,
  onAddCondition,
  onUpdateAllergy,
  onUpdateCondition,
  readOnly = false
}: AllergiesConditionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'allergies' | 'conditions'>('allergies');
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);
  const [isAddingCondition, setIsAddingCondition] = useState(false);

  const [newAllergy, setNewAllergy] = useState({
    allergen: '',
    reaction: '',
    severity: 'moderate' as const,
    onset_date: '',
    notes: '',
    status: 'active' as const
  });

  const [newCondition, setNewCondition] = useState({
    name: '',
    icd10_code: '',
    status: 'active' as const,
    onset_date: '',
    notes: ''
  });

  const handleAddAllergy = () => {
    if (!newAllergy.allergen || !newAllergy.reaction) {
      toast.error('Please fill in allergen and reaction');
      return;
    }

    if (onAddAllergy) {
      onAddAllergy(newAllergy);
      toast.success('Allergy added');
      setIsAddingAllergy(false);
      setNewAllergy({
        allergen: '',
        reaction: '',
        severity: 'moderate',
        onset_date: '',
        notes: '',
        status: 'active'
      });
    }
  };

  const handleAddCondition = () => {
    if (!newCondition.name) {
      toast.error('Please fill in condition name');
      return;
    }

    if (onAddCondition) {
      onAddCondition(newCondition);
      toast.success('Condition added');
      setIsAddingCondition(false);
      setNewCondition({
        name: '',
        icd10_code: '',
        status: 'active',
        onset_date: '',
        notes: ''
      });
    }
  };

  const handleICD10Lookup = () => {
    toast('🔌 ICD-10 Code Lookup\n\nRequires integration with medical coding database/API for ICD-10 code search and validation.', {
      icon: '🔍',
      duration: 4000
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'bg-yellow-100 text-yellow-800';
      case 'moderate':
        return 'bg-orange-100 text-orange-800';
      case 'severe':
        return 'bg-red-100 text-red-800';
      case 'life-threatening':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeAllergies = allergies.filter(a => a.status === 'active');
  const resolvedAllergies = allergies.filter(a => a.status === 'resolved');
  const activeConditions = conditions.filter(c => c.status === 'active' || c.status === 'chronic');
  const resolvedConditions = conditions.filter(c => c.status === 'resolved');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Allergies & Conditions</h3>
          <p className="text-sm text-gray-600">
            {activeAllergies.length} active allerg{activeAllergies.length !== 1 ? 'ies' : 'y'} • {activeConditions.length} active condition{activeConditions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('allergies')}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'allergies'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Allergies ({allergies.length})
          </button>
          <button
            onClick={() => setActiveTab('conditions')}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'conditions'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Conditions ({conditions.length})
          </button>
        </div>
      </div>

      {/* ALLERGIES TAB */}
      {activeTab === 'allergies' && (
        <div className="space-y-4">
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddingAllergy(true)}
            >
              + Add Allergy
            </Button>
          )}

          {/* Add Allergy Form */}
          {isAddingAllergy && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Add New Allergy</h4>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Allergen *"
                  value={newAllergy.allergen}
                  onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
                  placeholder="e.g., Penicillin, Peanuts"
                />
                <Input
                  label="Reaction *"
                  value={newAllergy.reaction}
                  onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
                  placeholder="e.g., Hives, Anaphylaxis"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity *
                  </label>
                  <select
                    value={newAllergy.severity}
                    onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="life-threatening">Life-Threatening</option>
                  </select>
                </div>
                <Input
                  label="Onset Date"
                  type="date"
                  value={newAllergy.onset_date}
                  onChange={(e) => setNewAllergy({ ...newAllergy, onset_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newAllergy.notes}
                  onChange={(e) => setNewAllergy({ ...newAllergy, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsAddingAllergy(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleAddAllergy}>
                  Add Allergy
                </Button>
              </div>
            </div>
          )}

          {/* Active Allergies */}
          {activeAllergies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                ⚠️ Active Allergies
              </h4>
              <div className="space-y-2">
                {activeAllergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="bg-red-50 border-2 border-red-300 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-gray-900">{allergy.allergen}</h5>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(allergy.severity)}`}>
                            {allergy.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          Reaction: {allergy.reaction}
                        </p>
                        {allergy.onset_date && (
                          <p className="text-xs text-gray-600 mt-1">
                            Since: {new Date(allergy.onset_date).toLocaleDateString()}
                          </p>
                        )}
                        {allergy.notes && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            {allergy.notes}
                          </p>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => onUpdateAllergy?.(allergy.id, { status: 'resolved' })}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved Allergies */}
          {resolvedAllergies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Past Allergies ({resolvedAllergies.length})
              </h4>
              <div className="space-y-2">
                {resolvedAllergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <h5 className="font-medium text-gray-700">{allergy.allergen}</h5>
                    <p className="text-sm text-gray-600">Reaction: {allergy.reaction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {allergies.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No known allergies</p>
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingAllergy(true)}
                  className="mt-3"
                >
                  + Add Allergy
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONDITIONS TAB */}
      {activeTab === 'conditions' && (
        <div className="space-y-4">
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddingCondition(true)}
              >
                + Add Condition
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleICD10Lookup}
              >
                🔍 ICD-10 Lookup
              </Button>
            </div>
          )}

          {/* Add Condition Form */}
          {isAddingCondition && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Add New Condition</h4>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Condition Name *"
                  value={newCondition.name}
                  onChange={(e) => setNewCondition({ ...newCondition, name: e.target.value })}
                  placeholder="e.g., Type 2 Diabetes"
                />
                <Input
                  label="ICD-10 Code"
                  value={newCondition.icd10_code}
                  onChange={(e) => setNewCondition({ ...newCondition, icd10_code: e.target.value })}
                  placeholder="e.g., E11.9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newCondition.status}
                    onChange={(e) => setNewCondition({ ...newCondition, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="chronic">Chronic</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <Input
                  label="Onset Date"
                  type="date"
                  value={newCondition.onset_date}
                  onChange={(e) => setNewCondition({ ...newCondition, onset_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newCondition.notes}
                  onChange={(e) => setNewCondition({ ...newCondition, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsAddingCondition(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleAddCondition}>
                  Add Condition
                </Button>
              </div>
            </div>
          )}

          {/* Active Conditions */}
          {activeConditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Conditions</h4>
              <div className="space-y-2">
                {activeConditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-gray-900">{condition.name}</h5>
                          {condition.icd10_code && (
                            <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                              {condition.icd10_code}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            condition.status === 'chronic' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {condition.status}
                          </span>
                        </div>
                        {condition.onset_date && (
                          <p className="text-xs text-gray-600 mt-1">
                            Since: {new Date(condition.onset_date).toLocaleDateString()}
                          </p>
                        )}
                        {condition.notes && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            {condition.notes}
                          </p>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => onUpdateCondition?.(condition.id, { status: 'resolved', resolved_date: new Date().toISOString().split('T')[0] })}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved Conditions */}
          {resolvedConditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Past Conditions ({resolvedConditions.length})
              </h4>
              <div className="space-y-2">
                {resolvedConditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <h5 className="font-medium text-gray-700">{condition.name}</h5>
                    {condition.resolved_date && (
                      <p className="text-xs text-gray-600">
                        Resolved: {new Date(condition.resolved_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {conditions.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No conditions recorded</p>
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingCondition(true)}
                  className="mt-3"
                >
                  + Add Condition
                </Button>
              )}
            </div>
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
              ICD-10 code lookup and automated problem list management require EHR integration.
              Current version supports manual tracking for documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
