'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface CreateTemplateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'General',
  'Cardiology',
  'Pediatrics',
  'Dermatology',
  'Mental Health',
  'Orthopedics',
  'Other'
];

const COMMON_APPOINTMENT_TYPES = [
  'Follow-up',
  'New Patient',
  'Annual Physical',
  'Chronic Care',
  'Acute Care',
  'Consultation',
  'Procedure',
  'Post-Op'
];

export default function CreateTemplateModal({
  onClose,
  onSuccess
}: CreateTemplateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    specialty: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    tags: [] as string[],
    appointmentTypes: [] as string[],
    isFavorite: false
  });
  const [tagInput, setTagInput] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleToggleAppointmentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      appointmentTypes: prev.appointmentTypes.includes(type)
        ? prev.appointmentTypes.filter(t => t !== type)
        : [...prev.appointmentTypes, type]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.createTemplate({
        name: formData.name,
        description: formData.description,
        type: 'personal',
        category: formData.category,
        specialty: formData.specialty,
        content: {
          subjective: formData.subjective,
          objective: formData.objective,
          assessment: formData.assessment,
          plan: formData.plan,
        },
        tags: formData.tags,
        appointment_types: formData.appointmentTypes,
        is_favorite: formData.isFavorite,
      });

      toast.success('Template created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(error.response?.data?.detail || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Create New Template</h2>
              <p className="text-sm text-slate-600 mt-1">Build a reusable SOAP note template</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Diabetes Follow-up Visit"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of when to use this template"
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Specialty (Optional)
                </label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  placeholder="e.g., Endocrinology"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* SOAP Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">SOAP Note Content</h3>
            <p className="text-sm text-slate-600">
              Use [placeholders] for values that will be filled in later (e.g., [patient_name], [blood_pressure])
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subjective
              </label>
              <textarea
                name="subjective"
                value={formData.subjective}
                onChange={handleInputChange}
                placeholder="Patient reports [chief_complaint]. Symptoms started [duration] ago..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Objective
              </label>
              <textarea
                name="objective"
                value={formData.objective}
                onChange={handleInputChange}
                placeholder="Vital Signs: BP [bp], HR [hr], Temp [temp]&#10;Examination findings..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assessment
              </label>
              <textarea
                name="assessment"
                value={formData.assessment}
                onChange={handleInputChange}
                placeholder="Primary diagnosis: [diagnosis]&#10;Differential diagnoses..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Plan
              </label>
              <textarea
                name="plan"
                value={formData.plan}
                onChange={handleInputChange}
                placeholder="1. Treatment plan: [treatment]&#10;2. Follow-up: [follow_up]&#10;3. Labs: [labs]"
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Tags & Classification</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag (press Enter)"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Appointment Types
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_APPOINTMENT_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={formData.appointmentTypes.includes(type) ? 'primary' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleToggleAppointmentType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFavorite"
                checked={formData.isFavorite}
                onChange={(e) => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
                className="w-4 h-4 text-forest-600 border-slate-300 rounded focus:ring-forest-500"
              />
              <label htmlFor="isFavorite" className="text-sm font-medium text-slate-700">
                Mark as favorite
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={isSubmitting}
            leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          >
            {isSubmitting ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
