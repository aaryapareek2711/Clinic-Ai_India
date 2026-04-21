'use client';

import { useState, useMemo } from 'react';
import { X, Search, Sparkles, FileText, Users, Eye, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SOAPTemplate, TemplateType } from '@/lib/types/templates';

interface TemplateBrowserModalProps {
  templates: SOAPTemplate[];
  onClose: () => void;
  onSelectTemplate: (template: SOAPTemplate) => void;
  activeTab?: TemplateType;
}

export default function TemplateBrowserModal({
  templates,
  onClose,
  onSelectTemplate,
  activeTab = 'personal'
}: TemplateBrowserModalProps) {
  const [selectedTab, setSelectedTab] = useState<TemplateType>(activeTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<SOAPTemplate | null>(null);

  // Filter templates by tab and search
  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter((t) => t.type === selectedTab);

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.metadata.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by usage count (most popular first)
    return filtered.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
  }, [templates, selectedTab, searchTerm]);

  const tabs = [
    { id: 'personal' as TemplateType, label: 'My Templates', icon: FileText, color: 'text-blue-600' },
    { id: 'practice' as TemplateType, label: 'Practice', icon: Users, color: 'text-forest-600' },
    { id: 'community' as TemplateType, label: 'Community', icon: Sparkles, color: 'text-amber-600' }
  ];

  const typeConfig = {
    personal: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    practice: { iconBg: 'bg-forest-100', iconColor: 'text-forest-600' },
    community: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600' }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Browse Templates</h2>
              <p className="text-sm text-slate-600 mt-1">Select a template to insert into your SOAP note</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = selectedTab === tab.id;
              const count = templates.filter((t) => t.type === tab.id).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-forest-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <Badge
                    variant={isActive ? 'outline' : 'secondary'}
                    size="sm"
                    className={isActive ? 'bg-white/20 text-white border-white/30' : ''}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {previewTemplate ? (
            // Preview View
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-forest-600 hover:text-forest-700 font-medium text-sm flex items-center gap-1"
                >
                  ← Back to templates
                </button>
                <Button
                  variant="primary"
                  onClick={() => onSelectTemplate(previewTemplate)}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Insert This Template
                </Button>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">{previewTemplate.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{previewTemplate.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" size="sm">
                    {previewTemplate.metadata.category}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {previewTemplate.metadata.usageCount} uses
                  </Badge>
                </div>
              </div>

              {/* SOAP Sections Preview */}
              <div className="space-y-4">
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
                    <div className={`bg-${section.color}-50 px-4 py-3 border-b border-${section.color}-100`}>
                      <h4 className={`font-semibold text-${section.color}-900`}>
                        {section.label}
                      </h4>
                    </div>
                    <div className="p-4 bg-white">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                        {previewTemplate.content[section.key as keyof typeof previewTemplate.content]}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Template List View
            <div>
              {filteredTemplates.length > 0 ? (
                <>
                  <div className="mb-4 text-sm text-slate-600">
                    Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTemplates.map((template) => {
                      const config = typeConfig[template.type];

                      return (
                        <Card
                          key={template.id}
                          variant="bordered"
                          className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <FileText className={`w-5 h-5 ${config.iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                                <p className="text-xs text-slate-600 line-clamp-2">{template.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex gap-1.5 flex-wrap">
                                <Badge variant="secondary" size="sm">
                                  {template.metadata.category}
                                </Badge>
                                <Badge variant="outline" size="sm" className="text-xs">
                                  {template.metadata.usageCount} uses
                                </Badge>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewTemplate(template)}
                                className="flex-1"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Preview
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onSelectTemplate(template)}
                                className="flex-1"
                              >
                                Insert
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No templates found
                  </h3>
                  <p className="text-slate-600">
                    {searchTerm
                      ? 'Try adjusting your search terms'
                      : 'No templates available in this category'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!previewTemplate && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Templates with placeholders like [Patient Name] will be auto-populated</span>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
