'use client';

import { X, FileText, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SOAPTemplate } from '@/lib/types/templates';
import { useState } from 'react';

interface TemplatePreviewModalProps {
  template: SOAPTemplate;
  onClose: () => void;
  onUse?: (template: SOAPTemplate) => void;
}

export default function TemplatePreviewModal({
  template,
  onClose,
  onUse
}: TemplatePreviewModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (section: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    { key: 'subjective', label: 'Subjective', content: template.content.subjective, color: 'blue' },
    { key: 'objective', label: 'Objective', content: template.content.objective, color: 'purple' },
    { key: 'assessment', label: 'Assessment', content: template.content.assessment, color: 'amber' },
    { key: 'plan', label: 'Plan', content: template.content.plan, color: 'forest' }
  ];

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
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-forest-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{template.name}</h2>
                <p className="text-sm text-slate-600">{template.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary" size="sm">
                {template.type === 'personal' && 'My Template'}
                {template.type === 'practice' && 'Practice'}
                {template.type === 'community' && 'Community'}
              </Badge>
              <Badge variant="secondary" size="sm">
                {template.metadata.category}
              </Badge>
              {template.metadata.specialty && (
                <Badge variant="secondary" size="sm">
                  {template.metadata.specialty}
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.key}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                {/* Section Header */}
                <div className={`bg-${section.color}-50 px-4 py-3 flex items-center justify-between border-b border-${section.color}-100`}>
                  <h3 className={`font-semibold text-${section.color}-900`}>
                    {section.label}
                  </h3>
                  <button
                    onClick={() => handleCopy(section.key, section.content)}
                    className={`text-${section.color}-600 hover:text-${section.color}-700 transition-colors flex items-center gap-1 text-sm`}
                  >
                    {copiedSection === section.key ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Section Content */}
                <div className="p-4 bg-white">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                    {section.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-3">Template Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Author</p>
                <p className="font-medium text-slate-900">{template.metadata.authorName}</p>
              </div>
              <div>
                <p className="text-slate-600">Version</p>
                <p className="font-medium text-slate-900">{template.metadata.version}</p>
              </div>
              <div>
                <p className="text-slate-600">Usage Count</p>
                <p className="font-medium text-slate-900">{template.metadata.usageCount} times</p>
              </div>
              <div>
                <p className="text-slate-600">Last Updated</p>
                <p className="font-medium text-slate-900">
                  {new Date(template.metadata.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4">
              <p className="text-slate-600 text-sm mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {template.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="outline" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Appointment Types */}
            <div className="mt-4">
              <p className="text-slate-600 text-sm mb-2">Suitable for</p>
              <div className="flex flex-wrap gap-2">
                {template.metadata.appointmentTypes.map((type) => (
                  <Badge key={type} variant="secondary" size="sm">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {onUse && (
            <Button
              variant="primary"
              onClick={() => {
                onUse(template);
                onClose();
              }}
              className="flex-1"
            >
              Use This Template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
