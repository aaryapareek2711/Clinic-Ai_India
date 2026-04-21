"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Save, Edit3, Check, X, FileText, Bookmark } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import TemplateBrowserModal from '@/components/templates/TemplateBrowserModal';
import SaveTemplateModal from '@/components/templates/SaveTemplateModal';
import RecordingControls from './RecordingControls';
import { populateTemplate, type PatientData } from '@/lib/utils/templatePopulation';
import type { SOAPTemplate } from '@/lib/types/templates';

interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses?: string[];
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  follow_up?: string;
  red_flags?: string[];
  vitals?: Record<string, any>;
}

interface SOAPNotesEditorProps {
  visitId: string;
  initialNotes?: Partial<SOAPNotes>;
  transcriptId?: string;
  onSave?: (notes: SOAPNotes) => void;
  patientData?: PatientData;
  patientId?: string;
}

export default function SOAPNotesEditor({ visitId, initialNotes, transcriptId, onSave, patientData, patientId }: SOAPNotesEditorProps) {
  const [soapNotes, setSOAPNotes] = useState<SOAPNotes>({
    subjective: initialNotes?.subjective || '',
    objective: initialNotes?.objective || '',
    assessment: initialNotes?.assessment || '',
    plan: initialNotes?.plan || '',
    diagnoses: initialNotes?.diagnoses || [],
    medications: initialNotes?.medications || [],
    follow_up: initialNotes?.follow_up || '',
    red_flags: initialNotes?.red_flags || [],
    vitals: initialNotes?.vitals || {},
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<SOAPTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [currentTranscriptId, setCurrentTranscriptId] = useState<string | undefined>(transcriptId);
  const [hasRecording, setHasRecording] = useState(false);
  const localDraftKey = `soap_notes_draft_${visitId}`;

  useEffect(() => {
    try {
      const cached = localStorage.getItem(localDraftKey);
      if (!cached) return;
      const parsed = JSON.parse(cached) as Partial<SOAPNotes>;
      setSOAPNotes((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore malformed local draft and continue with provided notes.
    }
  }, [localDraftKey]);

  // Fetch templates when modal opens
  useEffect(() => {
    if (showTemplateBrowser && templates.length === 0) {
      fetchTemplates();
    }
  }, [showTemplateBrowser]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await apiClient.listTemplates({ page_size: 100 });

      // Convert API response to SOAPTemplate format
      const formattedTemplates: SOAPTemplate[] = response.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        type: item.type as 'personal' | 'practice' | 'community',
        category: item.category,
        specialty: item.specialty,
        content: {
          subjective: item.content.subjective || '',
          objective: item.content.objective || '',
          assessment: item.content.assessment || '',
          plan: item.content.plan || '',
        },
        metadata: {
          tags: item.tags || [],
          appointmentTypes: item.appointment_types || [],
          usageCount: item.usage_count || 0,
          isFavorite: item.is_favorite || false,
          lastUsed: item.last_used,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          version: item.version || '1.0',
          authorName: item.author_name,
          authorId: item.author_id,
        },
      }));

      setTemplates(formattedTemplates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTranscriptionComplete = (transcriptionId: string, transcriptionText: string) => {
    setCurrentTranscriptId(transcriptionId);
    setHasRecording(true);
    toast.success('Transcription ready! You can now generate SOAP notes.');
  };

  const handleGenerateSOAP = async () => {
    if (!patientId) {
      toast.error('Patient ID is missing for note generation');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await apiClient.generateClinicalNote({
        patient_id: patientId,
        visit_id: visitId,
        transcription_job_id: currentTranscriptId,
        note_type: 'soap',
      });
      const payload = response?.payload || {};
      const doctorNotes = String(payload?.doctor_notes || '');
      const subjectiveMatch = doctorNotes.match(/subjective:\s*([\s\S]*?)(?:\nobjective:|$)/i);
      const objectiveMatch = doctorNotes.match(/objective:\s*([\s\S]*)$/i);
      const generatedNotes = {
        subjective: (subjectiveMatch?.[1] || '').trim(),
        objective: (objectiveMatch?.[1] || '').trim(),
        assessment: String(payload?.assessment || '').trim(),
        plan: String(payload?.plan || '').trim(),
        diagnoses: [],
        medications: [],
        follow_up: String(payload?.follow_up_in || payload?.follow_up_date || '').trim(),
        red_flags: Array.isArray(payload?.red_flags) ? payload.red_flags : [],
        vitals: {},
      };

      setSOAPNotes({
        subjective: generatedNotes.subjective || '',
        objective: generatedNotes.objective || '',
        assessment: generatedNotes.assessment || '',
        plan: generatedNotes.plan || '',
        diagnoses: generatedNotes.diagnoses || [],
        medications: generatedNotes.medications || [],
        follow_up: generatedNotes.follow_up || '',
        red_flags: generatedNotes.red_flags || [],
        vitals: generatedNotes.vitals || {},
      });

      toast.success('SOAP notes generated successfully!');
    } catch (error: any) {
      console.error('Error generating SOAP notes:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate SOAP notes');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineSection = async (section: string) => {
    if (!refinementInstructions.trim()) {
      toast.error('Please provide refinement instructions');
      return;
    }

    setIsRefining(true);
    try {
      const originalText = String(soapNotes[section as keyof SOAPNotes] || '');
      setSOAPNotes(prev => ({
        ...prev,
        [section]: `${originalText}\n\n[Refinement note]: ${refinementInstructions.trim()}`.trim(),
      }));
      setEditingSection(null);
      setRefinementInstructions('');
      toast.success('Refinement applied locally');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(localDraftKey, JSON.stringify(soapNotes));
      toast.success('SOAP draft saved');

      if (onSave) {
        onSave(soapNotes);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertTemplate = async (template: SOAPTemplate) => {
    // Populate template with patient data
    const populatedContent = populateTemplate(template, patientData || {});

    // Insert the populated template into SOAP notes
    setSOAPNotes(prev => ({
      ...prev,
      subjective: prev.subjective + (prev.subjective ? '\n\n' : '') + populatedContent.subjective,
      objective: prev.objective + (prev.objective ? '\n\n' : '') + populatedContent.objective,
      assessment: prev.assessment + (prev.assessment ? '\n\n' : '') + populatedContent.assessment,
      plan: prev.plan + (prev.plan ? '\n\n' : '') + populatedContent.plan,
    }));

    // Record template usage
    try {
      await apiClient.recordTemplateUsage(template.id, visitId, patientId);
    } catch (error) {
      console.error('Error recording template usage:', error);
      // Don't show error to user, this is just analytics
    }

    setShowTemplateBrowser(false);
    toast.success(`Template "${template.name}" inserted successfully!`);
  };

  const handleSaveAsTemplate = () => {
    setShowSaveTemplateModal(true);
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      await apiClient.createTemplate({
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        specialty: templateData.specialty,
        type: templateData.type,
        content: {
          subjective: soapNotes.subjective,
          objective: soapNotes.objective,
          assessment: soapNotes.assessment,
          plan: soapNotes.plan,
        },
        tags: templateData.tags || [],
        appointment_types: templateData.appointmentTypes || [],
        is_favorite: templateData.isFavorite || false,
      });
      toast.success('Template saved successfully!');
      setShowSaveTemplateModal(false);

      // Refresh templates list if browser was opened before
      if (templates.length > 0) {
        fetchTemplates();
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.detail || 'Failed to save template');
    }
  };

  const renderSection = (
    section: keyof SOAPNotes,
    title: string,
    description: string
  ) => {
    const content = soapNotes[section];
    if (typeof content !== 'string') return null;

    const isEditing = editingSection === section;

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingSection(isEditing ? null : section)}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          </Button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setSOAPNotes(prev => ({ ...prev, [section]: e.target.value }))}
          className="w-full min-h-[150px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
          placeholder={`Enter ${title.toLowerCase()} notes...`}
        />

        {isEditing && (
          <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
            <label className="text-sm font-medium text-gray-900">
              AI Refinement Instructions
            </label>
            <textarea
              value={refinementInstructions}
              onChange={(e) => setRefinementInstructions(e.target.value)}
              placeholder="Example: Make this more concise, Add more detail about symptoms, Use simpler language..."
              className="w-full min-h-[80px] p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 bg-white"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleRefineSection(section)}
                disabled={isRefining || !refinementInstructions.trim()}
                size="sm"
              >
                {isRefining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Refine with AI
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSection(null);
                  setRefinementInstructions('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>SOAP Notes</CardTitle>
              <CardDescription>
                Generate and edit structured clinical documentation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Recording Controls - Primary Action */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <RecordingControls
                patientId={patientId || ''}
                visitId={visitId}
                onTranscriptionComplete={handleTranscriptionComplete}
                onGenerateSOAP={handleGenerateSOAP}
              />

              {/* Secondary Actions */}
              <div className="flex gap-2 flex-wrap ml-auto">
                <Button
                  onClick={() => setShowTemplateBrowser(true)}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Insert Template
                </Button>
                <Button
                  onClick={handleSaveAsTemplate}
                  variant="outline"
                  size="sm"
                  disabled={!soapNotes.subjective && !soapNotes.objective && !soapNotes.assessment && !soapNotes.plan}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save as Template
                </Button>
                <Button
                  onClick={handleGenerateSOAP}
                  disabled={isGenerating || !hasRecording}
                  variant="outline"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate from Transcription
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Notes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOAP Sections */}
      <div className="space-y-4">
        {renderSection('subjective', 'Subjective', "Patient's symptoms and concerns in their own words")}
        {renderSection('objective', 'Objective', 'Clinical findings, vital signs, and examination results')}
        {renderSection('assessment', 'Assessment', 'Medical diagnoses and clinical interpretation')}
        {renderSection('plan', 'Plan', 'Treatment plan, medications, and follow-up')}
      </div>

      {/* Additional Information */}
      {(soapNotes.diagnoses && soapNotes.diagnoses.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnoses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {soapNotes.diagnoses.map((diagnosis, index) => (
                <Badge key={index} variant="secondary">
                  {diagnosis}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(soapNotes.medications && soapNotes.medications.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {soapNotes.medications.map((med, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{med.name}</span>
                    <p className="text-sm text-gray-600">
                      {med.dosage} • {med.frequency} • {med.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {soapNotes.red_flags && soapNotes.red_flags.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Red Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {soapNotes.red_flags.map((flag, index) => (
                <li key={index} className="text-red-800">
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {soapNotes.vitals && Object.keys(soapNotes.vitals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vital Signs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(soapNotes.vitals).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <p className="font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Browser Modal */}
      {showTemplateBrowser && (
        <TemplateBrowserModal
          templates={templates}
          onClose={() => setShowTemplateBrowser(false)}
          onSelectTemplate={handleInsertTemplate}
          activeTab="personal"
        />
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <SaveTemplateModal
          soapNotes={{
            subjective: soapNotes.subjective,
            objective: soapNotes.objective,
            assessment: soapNotes.assessment,
            plan: soapNotes.plan,
          }}
          onClose={() => setShowSaveTemplateModal(false)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}
