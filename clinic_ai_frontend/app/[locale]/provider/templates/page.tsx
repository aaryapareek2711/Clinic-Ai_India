'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, FileText, Users, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TemplateCard from '@/components/templates/TemplateCard';
import FilterBar from '@/components/templates/FilterBar';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import CreateTemplateModal from '@/components/templates/CreateTemplateModal';
import PublishTemplateModal from '@/components/templates/PublishTemplateModal';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import type { SOAPTemplate, TemplateFilters, TemplateType } from '@/lib/types/templates';

type TabType = 'my' | 'practice' | 'community';

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    category: 'All',
    appointmentType: 'All',
    sortBy: 'recent'
  });
  const [previewTemplate, setPreviewTemplate] = useState<SOAPTemplate | null>(null);
  const [templates, setTemplates] = useState<SOAPTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCounts, setTotalCounts] = useState({ my: 0, practice: 0, community: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publishingTemplate, setPublishingTemplate] = useState<SOAPTemplate | null>(null);

  // Fetch templates on component mount and when tab changes
  useEffect(() => {
    fetchTemplates();
  }, [activeTab]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const typeMap: Record<TabType, TemplateType> = {
        my: 'personal',
        practice: 'practice',
        community: 'community'
      };

      const response = await apiClient.listTemplates({
        type: typeMap[activeTab],
        page: 1,
        page_size: 100
      });

      // Convert API response to SOAPTemplate format
      const formattedTemplates: SOAPTemplate[] = response.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        type: item.type as TemplateType,
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
          isPublished: item.is_published || false,
          lastUsed: item.last_used,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          version: item.version || '1.0',
          authorName: item.author_name,
          authorId: item.author_id,
          category: item.category,
        },
      }));

      setTemplates(formattedTemplates);

      // Fetch counts for all tabs
      const [myCount, practiceCount, communityCount] = await Promise.all([
        apiClient.listTemplates({ type: 'personal', page: 1, page_size: 1 }),
        apiClient.listTemplates({ type: 'practice', page: 1, page_size: 1 }),
        apiClient.listTemplates({ type: 'community', page: 1, page_size: 1 })
      ]);

      setTotalCounts({
        my: myCount.total,
        practice: practiceCount.total,
        community: communityCount.total
      });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates based on filters (tab filtering already done in API call)
  const filteredTemplates = useMemo(() => {
    let templatesList = [...templates];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      templatesList = templatesList.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.metadata.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filters.category !== 'All') {
      templatesList = templatesList.filter((t) => t.metadata.category === filters.category);
    }

    // Apply appointment type filter
    if (filters.appointmentType !== 'All') {
      templatesList = templatesList.filter((t) =>
        t.metadata.appointmentTypes.includes(filters.appointmentType as any)
      );
    }

    // Apply sorting
    templatesList.sort((a, b) => {
      switch (filters.sortBy) {
        case 'popular':
          return b.metadata.usageCount - a.metadata.usageCount;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          const dateA = a.metadata.lastUsed || a.metadata.updatedAt;
          const dateB = b.metadata.lastUsed || b.metadata.updatedAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
    });

    return templatesList;
  }, [templates, filters]);

  const tabs = [
    {
      id: 'my' as TabType,
      label: 'My Templates',
      icon: FileText,
      count: totalCounts.my,
      color: 'blue'
    },
    {
      id: 'practice' as TabType,
      label: 'Practice',
      icon: Users,
      count: totalCounts.practice,
      color: 'forest'
    },
    {
      id: 'community' as TabType,
      label: 'Community',
      icon: Sparkles,
      count: totalCounts.community,
      color: 'amber'
    }
  ];

  const handleUseTemplate = async (template: SOAPTemplate) => {
    try {
      // For community templates, duplicate to personal first
      if (template.type === 'community') {
        await apiClient.duplicateTemplate(template.id);
        toast.success(`Template "${template.name}" copied to your personal templates!`);

        // Refresh templates if on "my" tab
        if (activeTab === 'my') {
          fetchTemplates();
        }
      } else {
        // For personal/practice templates, just notify (would be used in SOAP editor)
        toast.success(`Template "${template.name}" ready to use`);
      }
    } catch (error: any) {
      console.error('Error using template:', error);
      toast.error(error.response?.data?.detail || 'Failed to use template');
    }
  };

  const handleFavorite = async (templateId: string) => {
    try {
      await apiClient.toggleTemplateFavorite(templateId);

      // Update local state optimistically
      setTemplates(prev =>
        prev.map(t =>
          t.id === templateId
            ? { ...t, metadata: { ...t.metadata, isFavorite: !t.metadata.isFavorite } }
            : t
        )
      );

      toast.success('Favorite updated');
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                SOAP Templates
              </h1>
              <p className="text-slate-600">
                Browse, preview, and use clinical documentation templates
              </p>
            </div>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create New Template
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-forest-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.label}</span>
                  <Badge
                    variant={isActive ? 'outline' : 'secondary'}
                    size="sm"
                    className={isActive ? 'bg-white/20 text-white border-white/30' : ''}
                  >
                    {tab.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FilterBar */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Community Stats Section - Only show on community tab */}
      {activeTab === 'community' && !isLoading && templates.length > 0 && (
        <div className="bg-white border-b border-slate-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Popular Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates
                .filter(t => t.metadata.usageCount > 0)
                .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
                .slice(0, 3)
                .map((template) => (
                  <div
                    key={template.id}
                    className="p-4 bg-cream-50 rounded-lg border border-slate-200 hover:border-forest-300 transition-colors cursor-pointer"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900 text-sm">{template.name}</h4>
                      <Badge variant="secondary" size="sm">
                        {template.metadata.usageCount} uses
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{template.metadata.category || template.category}</span>
                      {template.metadata.authorName && (
                        <>
                          <span>•</span>
                          <span>by {template.metadata.authorName}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
            <span className="ml-3 text-slate-600">Loading templates...</span>
          </div>
        ) : filteredTemplates.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-slate-600">
              Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={setPreviewTemplate}
                  onUse={handleUseTemplate}
                  onFavorite={handleFavorite}
                  onPublish={setPublishingTemplate}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No templates found
            </h3>
            <p className="text-slate-600 mb-6">
              {activeTab === 'community'
                ? 'No community templates available yet. Create and publish your own!'
                : 'Try adjusting your filters or create a new template'}
            </p>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create New Template
            </Button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Refresh templates after creation
            fetchTemplates();
            // Switch to "My Templates" tab to see the new template
            setActiveTab('my');
          }}
        />
      )}

      {/* Publish Template Modal */}
      {publishingTemplate && (
        <PublishTemplateModal
          template={publishingTemplate}
          onClose={() => setPublishingTemplate(null)}
          onSuccess={() => {
            // Refresh templates after publishing
            fetchTemplates();
            setPublishingTemplate(null);
          }}
        />
      )}
    </div>
  );
}
