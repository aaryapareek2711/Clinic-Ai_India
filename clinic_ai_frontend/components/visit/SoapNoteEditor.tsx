"use client";

import React, { useState } from 'react';
import type { SOAPNote } from '@/lib/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Save, Sparkles, X } from 'lucide-react';

interface SoapNoteEditorProps {
  note: SOAPNote;
  onRefine: (
    section: 'subjective' | 'objective' | 'assessment' | 'plan',
    originalText: string,
    instructions: string
  ) => Promise<void>;
  onSave: () => Promise<void>;
  onChange: (note: SOAPNote) => void;
}

type SoapSection = 'subjective' | 'objective' | 'assessment' | 'plan';

const sectionConfig = {
  subjective: { label: 'Subjective', color: 'text-blue-600', description: 'Patient\'s symptoms and concerns' },
  objective: { label: 'Objective', color: 'text-green-600', description: 'Observable findings and measurements' },
  assessment: { label: 'Assessment', color: 'text-purple-600', description: 'Clinical diagnosis and interpretation' },
  plan: { label: 'Plan', color: 'text-orange-600', description: 'Treatment plan and next steps' },
};

export default function SoapNoteEditor({ note, onRefine, onSave, onChange }: SoapNoteEditorProps) {
  const [refiningSection, setRefiningSection] = useState<SoapSection | null>(null);
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSectionChange = (section: SoapSection, value: string) => {
    onChange({
      ...note,
      [section]: value,
    });
  };

  const handleRefine = async (section: SoapSection) => {
    if (!refinementInstructions.trim()) {
      alert('Please enter refinement instructions');
      return;
    }

    await onRefine(section, note[section], refinementInstructions);
    setRefiningSection(null);
    setRefinementInstructions('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            SOAP Notes
          </CardTitle>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Notes
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.keys(sectionConfig) as SoapSection[]).map((section) => {
          const config = sectionConfig[section];
          const isRefining = refiningSection === section;

          return (
            <div key={section} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-bold ${config.color}`}>
                    {config.label}
                  </h3>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                {!isRefining && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefiningSection(section)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Refine
                  </Button>
                )}
              </div>

              <textarea
                value={note[section]}
                onChange={(e) => handleSectionChange(section, e.target.value)}
                className="w-full min-h-[120px] p-3 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Enter ${config.label.toLowerCase()} information...`}
              />

              {isRefining && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-900">
                      Refine this section with AI
                    </p>
                    <button
                      onClick={() => {
                        setRefiningSection(null);
                        setRefinementInstructions('');
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    value={refinementInstructions}
                    onChange={(e) => setRefinementInstructions(e.target.value)}
                    className="w-full min-h-[80px] p-3 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter instructions for refinement (e.g., 'Make it more concise', 'Add more clinical detail', 'Use layman's terms')"
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRefiningSection(null);
                        setRefinementInstructions('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRefine(section)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Apply Refinement
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            These SOAP notes are generated by AI and should be reviewed by a licensed healthcare provider before being finalized.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
