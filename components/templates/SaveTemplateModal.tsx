'use client';

import { useState } from 'react';
import { X, AlertTriangle, FileText, Sparkles, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { scrubPHI, validateTemplateText } from '@/lib/utils/templatePopulation';
import type { TemplateCategory, AppointmentType } from '@/lib/types/templates';
import toast from 'react-hot-toast';

interface SaveTemplateModalProps {
  soapNotes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  onClose: () => void;
  onSave?: (template: {
    name: string;
    description: string;
    category: TemplateCategory;
    appointmentTypes: AppointmentType[];
    tags: string[];
    content: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
  }) => void;
}

export default function SaveTemplateModal({
  soapNotes,
  onClose,
  onSave
}: SaveTemplateModalProps) {
  const [step, setStep] = useState<'review' | 'metadata'>('review');
  const [scrubbedContent, setScrubbedContent] = useState({
    subjective: scrubPHI(soapNotes.subjective),
    objective: scrubPHI(soapNotes.objective),
    assessment: scrubPHI(soapNotes.assessment),
    plan: scrubPHI(soapNotes.plan),
  });
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Metadata form
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('General');
  const [selectedAppointmentTypes, setSelectedAppointmentTypes] = useState<AppointmentType[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Validate all sections
  const validations = {
    subjective: validateTemplateText(scrubbedContent.subjective),
    objective: validateTemplateText(scrubbedContent.objective),
    assessment: validateTemplateText(scrubbedContent.assessment),
    plan: validateTemplateText(scrubbedContent.plan),
  };

  const hasWarnings = Object.values(validations).some(v => !v.isValid);
  const allWarnings = Object.entries(validations)
    .filter(([_, v]) => !v.isValid)
    .flatMap(([section, v]) => v.warnings.map(w => `${section}: ${w}`));

  const categories: TemplateCategory[] = [
    'General',
    'Cardiology',
    'Pediatrics',
    'Dermatology',
    'Mental Health',
    'Orthopedics',
    'Other'
  ];

  const appointmentTypes: AppointmentType[] = [
    'Follow-up',
    'Annual Physical',
    'New Patient',
    'Acute Visit',
    'Chronic Care',
    'Preventive'
  ];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleAppointmentType = (type: AppointmentType) => {
    setSelectedAppointmentTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (selectedAppointmentTypes.length === 0) {
      toast.error('Please select at least one appointment type');
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onSave) {
        onSave({
          name: templateName,
          description,
          category,
          appointmentTypes: selectedAppointmentTypes,
          tags,
          content: scrubbedContent,
        });
      }

      toast.success(`Template "${templateName}" saved successfully!`);
      onClose();
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
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
              <h2 className="text-2xl font-bold text-slate-900">
                {step === 'review' ? 'Review PHI Scrubbing' : 'Template Details'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {step === 'review'
                  ? 'Ensure all protected health information has been removed'
                  : 'Add metadata to help organize and find your template'}
              </p>
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
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'review' ? (
            // PHI Review Step
            <div className="space-y-6">
              {hasWarnings && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900 mb-2">
                          Potential PHI Detected
                        </h3>
                        <ul className="text-sm text-amber-800 space-y-1">
                          {allWarnings.map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <p className="text-sm text-slate-700">
                  We've automatically scrubbed patient-identifiable information from your SOAP notes.
                  Please review each section to ensure no PHI remains before saving as a template.
                </p>

                {/* Scrubbed Sections */}
                {[
                  { key: 'subjective', label: 'Subjective', color: 'blue' },
                  { key: 'objective', label: 'Objective', color: 'purple' },
                  { key: 'assessment', label: 'Assessment', color: 'amber' },
                  { key: 'plan', label: 'Plan', color: 'forest' }
                ].map((section) => (
                  <div
                    key={section.key}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className={`bg-${section.color}-50 px-4 py-3 border-b border-${section.color}-100 flex items-center justify-between`}>
                      <h4 className={`font-semibold text-${section.color}-900`}>
                        {section.label}
                      </h4>
                      {!validations[section.key as keyof typeof validations].isValid && (
                        <Badge variant="warning" size="sm">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Review needed
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 bg-white">
                      <textarea
                        value={scrubbedContent[section.key as keyof typeof scrubbedContent]}
                        onChange={(e) =>
                          setScrubbedContent(prev => ({
                            ...prev,
                            [section.key]: e.target.value
                          }))
                        }
                        className="w-full min-h-[120px] p-3 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                        placeholder="Content has been removed due to lack of information..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmation Checkbox */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 text-forest-600 focus:ring-forest-500 border-slate-300 rounded"
                  />
                  <div>
                    <p className="font-medium text-slate-900">
                      I confirm that all PHI has been removed
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      I have reviewed the scrubbed content above and confirm that no patient-identifiable
                      information (names, dates of birth, MRNs, specific dates, phone numbers, addresses, etc.)
                      remains in the template.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            // Metadata Step
            <div className="space-y-6">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Diabetes Follow-up Visit"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of when to use this template..."
                  className="w-full min-h-[80px] px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Appointment Types */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Suitable for Appointment Types *
                </label>
                <div className="flex flex-wrap gap-2">
                  {appointmentTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleAppointmentType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedAppointmentTypes.includes(type)
                          ? 'bg-forest-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Tags (Optional)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tags for easier searching..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    Add Tag
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 hover:text-slate-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 'metadata' && (
              <Button
                variant="outline"
                onClick={() => setStep('review')}
              >
                ← Back to Review
              </Button>
            )}
            {step === 'review' ? (
              <Button
                variant="primary"
                onClick={() => setStep('metadata')}
                disabled={!accepted}
              >
                Continue to Details
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSaveTemplate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
