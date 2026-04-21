'use client';

import { useState } from 'react';
import { X, Loader2, Globe, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import type { SOAPTemplate } from '@/lib/types/templates';

interface PublishTemplateModalProps {
  template: SOAPTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PublishTemplateModal({
  template,
  onClose,
  onSuccess
}: PublishTemplateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    authorName: '',
    description: template.description || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.authorName.trim()) {
      toast.error('Author name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.publishTemplate(template.id, {
        author_name: formData.authorName,
        description: formData.description
      });

      toast.success('Template published to community!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error publishing template:', error);
      toast.error(error.response?.data?.detail || 'Failed to publish template');
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
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Publish to Community</h2>
                <p className="text-sm text-slate-600">Share your template with other providers</p>
              </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Preview */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">{template.name}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" size="sm">
                {template.metadata.category || template.category}
              </Badge>
              {template.specialty && (
                <Badge variant="outline" size="sm">
                  {template.specialty}
                </Badge>
              )}
              {template.metadata.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              {template.description || 'No description provided'}
            </p>
          </div>

          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 mb-1">Before Publishing</p>
              <ul className="text-amber-800 space-y-1 list-disc list-inside">
                <li>Ensure template contains NO patient-identifiable information (PHI)</li>
                <li>Template will be visible to all platform users</li>
                <li>Other providers can copy and modify your template</li>
                <li>You'll be credited as the author</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Name (Author) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                placeholder="e.g., Dr. Jane Smith"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Your name will be displayed publicly as the template author
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Community Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when and how other providers should use this template..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Help other providers understand the best use cases for your template
              </p>
            </div>
          </form>

          {/* Stats Preview */}
          <div className="bg-cream-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">Current Template Stats:</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Your Usage:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {template.metadata.usageCount} times
                </span>
              </div>
              <div>
                <span className="text-slate-600">Version:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {template.metadata.version}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            You can unpublish this template at any time
          </p>
          <div className="flex gap-3">
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
              leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            >
              {isSubmitting ? 'Publishing...' : 'Publish to Community'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
