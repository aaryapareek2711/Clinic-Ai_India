'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SOAPTemplate } from '@/lib/types/templates';
import {
  FileText,
  Star,
  Users,
  TrendingUp,
  Clock,
  Eye,
  Sparkles,
  Globe
} from 'lucide-react';

interface TemplateCardProps {
  template: SOAPTemplate;
  onPreview?: (template: SOAPTemplate) => void;
  onUse?: (template: SOAPTemplate) => void;
  onFavorite?: (templateId: string) => void;
  onPublish?: (template: SOAPTemplate) => void;
}

export default function TemplateCard({
  template,
  onPreview,
  onUse,
  onFavorite,
  onPublish
}: TemplateCardProps) {
  const typeConfig = {
    personal: {
      icon: FileText,
      badge: 'My Template',
      badgeVariant: 'primary' as const,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    practice: {
      icon: Users,
      badge: 'Practice',
      badgeVariant: 'success' as const,
      iconBg: 'bg-forest-100',
      iconColor: 'text-forest-600'
    },
    community: {
      icon: Sparkles,
      badge: 'Community',
      badgeVariant: 'warning' as const,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    }
  };

  const config = typeConfig[template.type];
  const IconComponent = config.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <Card variant="interactive" className="group h-full">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
              <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 group-hover:text-forest-600 transition-colors line-clamp-1">
                {template.name}
              </h3>
              <Badge variant={config.badgeVariant} size="sm" className="mt-1">
                {config.badge}
              </Badge>
            </div>
          </div>
          {onFavorite && (
            <button
              onClick={() => onFavorite(template.id)}
              className="text-slate-400 hover:text-amber-500 transition-colors flex-shrink-0"
              aria-label={template.metadata.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`w-5 h-5 ${
                  template.metadata.isFavorite ? 'fill-amber-500 text-amber-500' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" size="sm">
            {template.metadata.category}
          </Badge>
          {template.metadata.specialty && (
            <Badge variant="secondary" size="sm">
              {template.metadata.specialty}
            </Badge>
          )}
          {template.metadata.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" size="sm">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Metadata Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{template.metadata.usageCount} uses</span>
          </div>
          {template.metadata.lastUsed && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(template.metadata.lastUsed)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon={<Eye className="w-4 h-4" />}
                onClick={() => onPreview(template)}
              >
                Preview
              </Button>
            )}
            {onUse && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => onUse(template)}
              >
                Use Template
              </Button>
            )}
          </div>

          {/* Publish Button - Only for personal templates not yet published */}
          {template.type === 'personal' && !template.metadata.isPublished && onPublish && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              leftIcon={<Globe className="w-4 h-4" />}
              onClick={() => onPublish(template)}
            >
              Publish to Community
            </Button>
          )}
        </div>

        {/* Author Info (for community templates) */}
        {template.type === 'community' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              By <span className="font-medium text-slate-700">{template.metadata.authorName}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
