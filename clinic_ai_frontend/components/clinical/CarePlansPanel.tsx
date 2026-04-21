'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface CareGoal {
  id: string;
  title: string;
  description: string;
  target_date?: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'discontinued';
  progress_notes?: string;
  created_date: string;
}

interface FollowUpInstruction {
  id: string;
  instruction: string;
  category: 'medication' | 'lifestyle' | 'appointment' | 'monitoring' | 'diet' | 'exercise' | 'other';
  priority: 'high' | 'medium' | 'low';
  frequency?: string;
  created_date: string;
}

interface CarePlan {
  id: string;
  title: string;
  diagnosis?: string;
  goals: CareGoal[];
  instructions: FollowUpInstruction[];
  created_by: string;
  created_date: string;
  last_updated: string;
}

interface CarePlansPanelProps {
  patientId: string;
  carePlans: CarePlan[];
  onAddGoal?: (planId: string, goal: Omit<CareGoal, 'id' | 'created_date'>) => void;
  onUpdateGoal?: (planId: string, goalId: string, goal: Partial<CareGoal>) => void;
  onAddInstruction?: (planId: string, instruction: Omit<FollowUpInstruction, 'id' | 'created_date'>) => void;
  readOnly?: boolean;
}

export function CarePlansPanel({
  patientId,
  carePlans,
  onAddGoal,
  onUpdateGoal,
  onAddInstruction,
  readOnly = false
}: CarePlansPanelProps) {
  const [activeTab, setActiveTab] = useState<'goals' | 'instructions'>('goals');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(carePlans[0]?.id || '');

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_date: '',
    status: 'not_started' as const,
    progress_notes: ''
  });

  const [newInstruction, setNewInstruction] = useState({
    instruction: '',
    category: 'other' as const,
    priority: 'medium' as const,
    frequency: ''
  });

  const currentPlan = carePlans.find(p => p.id === selectedPlanId);

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.description) {
      toast.error('Please fill in goal title and description');
      return;
    }

    if (onAddGoal && selectedPlanId) {
      onAddGoal(selectedPlanId, newGoal);
      toast.success('Care goal added');
      setIsAddingGoal(false);
      setNewGoal({
        title: '',
        description: '',
        target_date: '',
        status: 'not_started',
        progress_notes: ''
      });
    }
  };

  const handleAddInstruction = () => {
    if (!newInstruction.instruction) {
      toast.error('Please enter an instruction');
      return;
    }

    if (onAddInstruction && selectedPlanId) {
      onAddInstruction(selectedPlanId, newInstruction);
      toast.success('Instruction added');
      setIsAddingInstruction(false);
      setNewInstruction({
        instruction: '',
        category: 'other',
        priority: 'medium',
        frequency: ''
      });
    }
  };

  const handleGenerateCarePlan = () => {
    toast('🤖 AI Care Plan Generation\n\nThis feature will use AI to generate personalized care plans based on:\n• Patient diagnosis\n• Treatment guidelines\n• Patient goals and preferences\n\nFeature coming soon!', {
      icon: '📋',
      duration: 5000
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'achieved':
        return 'bg-green-100 text-green-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication': return '💊';
      case 'lifestyle': return '🌟';
      case 'appointment': return '📅';
      case 'monitoring': return '📊';
      case 'diet': return '🥗';
      case 'exercise': return '🏃';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Care Plans</h3>
          <p className="text-sm text-gray-600">
            {currentPlan ? `${currentPlan.goals.length} goal${currentPlan.goals.length !== 1 ? 's' : ''} • ${currentPlan.instructions.length} instruction${currentPlan.instructions.length !== 1 ? 's' : ''}` : 'No active care plan'}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCarePlan}
            >
              🤖 Generate Care Plan
            </Button>
          </div>
        )}
      </div>

      {/* Care Plan Selector */}
      {carePlans.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Care Plan
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            {carePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} {plan.diagnosis && `(${plan.diagnosis})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {currentPlan && (
        <>
          {/* Care Plan Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900">{currentPlan.title}</h4>
            {currentPlan.diagnosis && (
              <p className="text-sm text-gray-700 mt-1">Diagnosis: {currentPlan.diagnosis}</p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              Created by {currentPlan.created_by} on {new Date(currentPlan.created_date).toLocaleDateString()}
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('goals')}
                className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'goals'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Care Goals ({currentPlan.goals.length})
              </button>
              <button
                onClick={() => setActiveTab('instructions')}
                className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'instructions'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Instructions ({currentPlan.instructions.length})
              </button>
            </div>
          </div>

          {/* GOALS TAB */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingGoal(true)}
                >
                  + Add Goal
                </Button>
              )}

              {/* Add Goal Form */}
              {isAddingGoal && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Add Care Goal</h4>

                  <Input
                    label="Goal Title *"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g., Lower HbA1c to < 7%"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      rows={3}
                      placeholder="Detailed description of the goal and how to achieve it..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Target Date"
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Status
                      </label>
                      <select
                        value={newGoal.status}
                        onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingGoal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleAddGoal}>
                      Add Goal
                    </Button>
                  </div>
                </div>
              )}

              {/* Goals List */}
              {currentPlan.goals.length > 0 ? (
                <div className="space-y-3">
                  {currentPlan.goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="bg-white border-2 border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-gray-900">{goal.title}</h5>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                              {goal.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{goal.description}</p>
                          {goal.target_date && (
                            <p className="text-xs text-gray-600 mt-2">
                              Target: {new Date(goal.target_date).toLocaleDateString()}
                            </p>
                          )}
                          {goal.progress_notes && (
                            <div className="mt-3 bg-blue-50 rounded p-3">
                              <p className="text-xs font-medium text-blue-900 uppercase tracking-wide mb-1">
                                Progress Notes
                              </p>
                              <p className="text-sm text-blue-900">{goal.progress_notes}</p>
                            </div>
                          )}
                        </div>
                        {!readOnly && (
                          <div className="flex gap-1">
                            <select
                              value={goal.status}
                              onChange={(e) => onUpdateGoal?.(selectedPlanId, goal.id, { status: e.target.value as any })}
                              className="px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="achieved">Achieved</option>
                              <option value="discontinued">Discontinued</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600">No care goals defined</p>
                  {!readOnly && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddingGoal(true)}
                      className="mt-3"
                    >
                      + Add First Goal
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INSTRUCTIONS TAB */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingInstruction(true)}
                >
                  + Add Instruction
                </Button>
              )}

              {/* Add Instruction Form */}
              {isAddingInstruction && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Add Follow-up Instruction</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instruction *
                    </label>
                    <textarea
                      value={newInstruction.instruction}
                      onChange={(e) => setNewInstruction({ ...newInstruction, instruction: e.target.value })}
                      rows={3}
                      placeholder="e.g., Take medication twice daily with meals"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newInstruction.category}
                        onChange={(e) => setNewInstruction({ ...newInstruction, category: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      >
                        <option value="medication">Medication</option>
                        <option value="lifestyle">Lifestyle</option>
                        <option value="appointment">Appointment</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="diet">Diet</option>
                        <option value="exercise">Exercise</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newInstruction.priority}
                        onChange={(e) => setNewInstruction({ ...newInstruction, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <Input
                      label="Frequency"
                      value={newInstruction.frequency}
                      onChange={(e) => setNewInstruction({ ...newInstruction, frequency: e.target.value })}
                      placeholder="e.g., Daily"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingInstruction(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleAddInstruction}>
                      Add Instruction
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions List */}
              {currentPlan.instructions.length > 0 ? (
                <div className="space-y-2">
                  {currentPlan.instructions.map((instruction) => (
                    <div
                      key={instruction.id}
                      className={`bg-white border-2 rounded-lg p-4 ${getPriorityColor(instruction.priority)}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getCategoryIcon(instruction.category)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase text-gray-600">
                              {instruction.category.replace('_', ' ')}
                            </span>
                            {instruction.priority === 'high' && (
                              <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">
                                PRIORITY
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 mt-1 font-medium">
                            {instruction.instruction}
                          </p>
                          {instruction.frequency && (
                            <p className="text-xs text-gray-600 mt-1">
                              Frequency: {instruction.frequency}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600">No instructions added</p>
                  {!readOnly && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddingInstruction(true)}
                      className="mt-3"
                    >
                      + Add First Instruction
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* No Care Plan State */}
      {carePlans.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No care plans created</p>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateCarePlan}
              className="mt-3"
            >
              🤖 Generate Care Plan
            </Button>
          )}
        </div>
      )}

      {/* AI Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">MVP Version - Manual Care Planning</p>
            <p className="mt-1">
              AI-powered care plan generation based on clinical guidelines and patient data is a future enhancement.
              Current version supports manual creation and tracking of care goals and instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
