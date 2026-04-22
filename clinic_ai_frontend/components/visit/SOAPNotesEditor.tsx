"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Save, Edit3, X, FileText, Bookmark } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import SaveTemplateModal from '@/components/templates/SaveTemplateModal';
import RecordingControls from './RecordingControls';
import type { PatientData } from '@/lib/utils/templatePopulation';

interface SOAPNotes {
  doctor_notes: string;
  chief_complaint: string;
  assessment: string;
  plan: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route?: string;
    food_instruction?: string;
  }>;
  investigations?: Array<{
    name: string;
    urgency?: string;
    preparation_instructions?: string;
  }>;
  follow_up?: string;
  red_flags?: string[];
  data_gaps?: string[];
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
    doctor_notes: initialNotes?.doctor_notes || '',
    chief_complaint: initialNotes?.chief_complaint || '',
    assessment: initialNotes?.assessment || '',
    plan: initialNotes?.plan || '',
    medications: initialNotes?.medications || [],
    investigations: initialNotes?.investigations || [],
    follow_up: initialNotes?.follow_up || '',
    red_flags: initialNotes?.red_flags || [],
    data_gaps: initialNotes?.data_gaps || [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isInsertingTemplate, setIsInsertingTemplate] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [currentTranscriptId, setCurrentTranscriptId] = useState<string | undefined>(transcriptId);
  const [hasRecording, setHasRecording] = useState(false);
  const localDraftKey = `soap_notes_draft_${visitId}`;

  useEffect(() => {
    if (!transcriptId) return;
    setCurrentTranscriptId(transcriptId);
    setHasRecording(true);
  }, [transcriptId]);

  useEffect(() => {
    const hydrateTranscriptContext = async () => {
      if (!patientId || transcriptId) return;
      try {
        const status = await apiClient.getVisitTranscriptionStatus(patientId, visitId);
        const normalized = String(status?.status || '').toLowerCase();
        if (normalized === 'completed' && status?.transcription_id) {
          setCurrentTranscriptId(String(status.transcription_id));
          setHasRecording(true);
          return;
        }
        const dialogue = await apiClient.getVisitDialogue(patientId, visitId);
        if (dialogue.status === 200 && String(dialogue?.data?.transcript || '').trim()) {
          const inferred = String((dialogue?.data as any)?.transcription_id || status?.transcription_id || '').trim();
          if (inferred) setCurrentTranscriptId(inferred);
          setHasRecording(true);
        }
      } catch {
        // Keep manual flow if transcript status endpoint is unavailable.
      }
    };
    hydrateTranscriptContext();
  }, [patientId, visitId, transcriptId]);

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

  const handleTranscriptionComplete = (transcriptionId: string) => {
    setCurrentTranscriptId(transcriptionId);
    setHasRecording(true);
    toast.success('Transcription ready! You can now generate clinical note.');
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
        note_type: 'india_clinical',
      });
      const payload = response?.payload || {};
      const doctorNotes = String(payload?.doctor_notes || '');
      const subjectiveMatch = doctorNotes.match(/subjective:\s*([\s\S]*?)(?:\nobjective:|$)/i);
      const objectiveMatch = doctorNotes.match(/objective:\s*([\s\S]*)$/i);
      const generatedNotes = {
        doctor_notes: doctorNotes.trim() || [subjectiveMatch?.[1], objectiveMatch?.[1]].filter(Boolean).join('\n\n').trim(),
        chief_complaint: String(payload?.chief_complaint || '').trim(),
        assessment: String(payload?.assessment || '').trim(),
        plan: [
          String(payload?.plan || '').trim(),
          Array.isArray(payload?.investigations) && payload.investigations.length > 0
            ? `Investigations: ${payload.investigations.map((i: any) => i?.test_name).filter(Boolean).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        medications: Array.isArray(payload?.rx)
          ? payload.rx.map((item: any) => ({
              name: String(item?.medicine_name || '').trim() || 'Medication',
              dosage: String(item?.dose || '').trim() || '-',
              frequency: String(item?.frequency || '').trim() || '-',
              duration: String(item?.duration || '').trim() || '-',
              route: String(item?.route || '').trim(),
              food_instruction: String(item?.food_instruction || '').trim(),
            }))
          : [],
        investigations: Array.isArray(payload?.investigations)
          ? payload.investigations.map((item: any) => ({
              name: String(item?.test_name || '').trim() || 'Investigation',
              urgency: String(item?.urgency || '').trim(),
              preparation_instructions: String(item?.preparation_instructions || '').trim(),
            }))
          : [],
        follow_up: String(payload?.follow_up_in || payload?.follow_up_date || '').trim(),
        red_flags: Array.isArray(payload?.red_flags) ? payload.red_flags : [],
        data_gaps: Array.isArray(payload?.data_gaps) ? payload.data_gaps : [],
      };

      setSOAPNotes({
        doctor_notes: generatedNotes.doctor_notes || '',
        chief_complaint: generatedNotes.chief_complaint || '',
        assessment: generatedNotes.assessment || '',
        plan: generatedNotes.plan || '',
        medications: generatedNotes.medications || [],
        investigations: generatedNotes.investigations || [],
        follow_up: generatedNotes.follow_up || '',
        red_flags: generatedNotes.red_flags || [],
        data_gaps: generatedNotes.data_gaps || [],
      });

      toast.success('Clinical note generated successfully!');
    } catch (error: any) {
      console.error('Error generating clinical note:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate clinical note');
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
      toast.success('Clinical note draft saved');

      if (onSave) {
        onSave(soapNotes);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertTemplate = async () => {
    setIsInsertingTemplate(true);
    try {
      const template = await apiClient.getClinicalNoteTemplate({
        doctor_type: 'Allopathic',
        language_style: 'English clinical',
        region: 'India OPD',
      });
      setSOAPNotes((prev) => ({
        ...prev,
        doctor_notes:
          prev.doctor_notes + (prev.doctor_notes ? '\n\n' : '') + String(template.doctor_notes || ''),
        chief_complaint: prev.chief_complaint || String(template.chief_complaint || ''),
        assessment: prev.assessment + (prev.assessment ? '\n\n' : '') + String(template.assessment || ''),
        plan: prev.plan + (prev.plan ? '\n\n' : '') + String(template.plan || ''),
        medications: Array.isArray(template.rx)
          ? template.rx.map((item) => ({
              name: String(item.medicine_name || ''),
              dosage: String(item.dose || ''),
              frequency: String(item.frequency || ''),
              duration: String(item.duration || ''),
              route: String(item.route || ''),
              food_instruction: String(item.food_instruction || ''),
            }))
          : prev.medications,
        investigations: Array.isArray(template.investigations)
          ? template.investigations.map((item) => ({
              name: String(item.test_name || ''),
              urgency: String(item.urgency || ''),
              preparation_instructions: String(item.preparation_instructions || ''),
            }))
          : prev.investigations,
        follow_up: prev.follow_up || String(template.follow_up_in || template.follow_up_date || ''),
        red_flags:
          Array.isArray(template.red_flags) && template.red_flags.length > 0
            ? Array.from(new Set([...(prev.red_flags || []), ...template.red_flags.map(String)]))
            : prev.red_flags,
        data_gaps:
          Array.isArray(template.data_gaps) && template.data_gaps.length > 0
            ? Array.from(new Set([...(prev.data_gaps || []), ...template.data_gaps.map(String)]))
            : prev.data_gaps,
      }));
      toast.success('Clinical note template inserted');
    } catch (error: any) {
      console.error('Error loading clinical note template:', error);
      toast.error(error?.response?.data?.detail || 'Failed to load clinical note template');
    } finally {
      setIsInsertingTemplate(false);
    }
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
          subjective: soapNotes.doctor_notes,
          objective: '',
          assessment: soapNotes.assessment,
          plan: soapNotes.plan,
        },
        tags: templateData.tags || [],
        appointment_types: templateData.appointmentTypes || [],
        is_favorite: templateData.isFavorite || false,
      });
      toast.success('Template saved successfully!');
      setShowSaveTemplateModal(false);

      // no-op
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
              <CardTitle>Clinical Note</CardTitle>
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
                  onClick={handleInsertTemplate}
                  variant="outline"
                  size="sm"
                  disabled={isInsertingTemplate}
                >
                  {isInsertingTemplate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inserting...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Insert Template
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveAsTemplate}
                  variant="outline"
                  size="sm"
                  disabled={!soapNotes.doctor_notes && !soapNotes.assessment && !soapNotes.plan}
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
                      Generate Clinical Note
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

      {/* Clinical Note Sections */}
      <div className="space-y-4">
        {renderSection('doctor_notes', 'Doctor Notes', 'Narrative notes generated from transcript')}
        {renderSection('chief_complaint', 'Chief Complaint', 'Primary concern for this visit')}
        {renderSection('assessment', 'Assessment', 'Medical diagnoses and clinical interpretation')}
        {renderSection('plan', 'Plan', 'Treatment plan and recommendations')}
        {renderSection('follow_up', 'Follow Up', 'Follow-up timeline/date')}
      </div>

      {/* Additional Information */}
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
                    {(med.route || med.food_instruction) && (
                      <p className="text-xs text-gray-500">
                        {[med.route, med.food_instruction].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(soapNotes.investigations && soapNotes.investigations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Investigations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {soapNotes.investigations.map((investigation, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{investigation.name}</p>
                  {(investigation.urgency || investigation.preparation_instructions) && (
                    <p className="text-sm text-gray-600">
                      {[investigation.urgency, investigation.preparation_instructions].filter(Boolean).join(' • ')}
                    </p>
                  )}
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

      {soapNotes.data_gaps && soapNotes.data_gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {soapNotes.data_gaps.map((gap, index) => (
                <li key={index} className="text-gray-700">
                  {String(gap).replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <SaveTemplateModal
          soapNotes={{
            subjective: soapNotes.doctor_notes,
            objective: '',
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
