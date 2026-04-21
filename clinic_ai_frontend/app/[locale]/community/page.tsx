'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  Star,
  Users,
  FileText,
  Search,
  Sparkles,
  Award,
  Clock,
  Heart
} from 'lucide-react';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import { mockTemplates } from '@/lib/data/mockTemplates';
import type { SOAPTemplate } from '@/lib/types/templates';

export default function CommunityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewTemplate, setPreviewTemplate] = useState<SOAPTemplate | null>(null);

  const communityTemplates = mockTemplates.filter((t) => t.type === 'community');

  const filteredTemplates = useMemo(() => {
    let templates = communityTemplates;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.metadata.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    if (selectedCategory !== 'All') {
      templates = templates.filter((t) => t.metadata.category === selectedCategory);
    }

    return templates;
  }, [searchTerm, selectedCategory, communityTemplates]);

  // Calculate community stats
  const stats = {
    totalTemplates: communityTemplates.length,
    totalUsage: communityTemplates.reduce((sum, t) => sum + t.metadata.usageCount, 0),
    contributors: new Set(communityTemplates.map((t) => t.metadata.authorId)).size,
    avgRating: 4.8 // Mock rating
  };

  const topContributors = [
    { name: 'Dr. Maria Lopez', templates: 15, specialty: 'Psychiatry' },
    { name: 'Dr. Robert Chen', templates: 12, specialty: 'Orthopedics' },
    { name: 'Dr. Anita Patel', templates: 10, specialty: 'Neurology' },
    { name: 'Dr. James Wilson', templates: 8, specialty: 'Cardiology' }
  ];

  const categories = ['All', 'General', 'Cardiology', 'Pediatrics', 'Dermatology', 'Mental Health', 'Orthopedics'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-forest-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="base">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="base">
                  Join Community
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Community Template Library
            </h1>
            <p className="text-xl text-forest-200 max-w-3xl mx-auto">
              Access hundreds of peer-reviewed SOAP note templates shared by healthcare professionals worldwide
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {[
              { icon: FileText, label: 'Templates', value: stats.totalTemplates },
              { icon: TrendingUp, label: 'Total Uses', value: stats.totalUsage.toLocaleString() },
              { icon: Users, label: 'Contributors', value: stats.contributors },
              { icon: Star, label: 'Avg Rating', value: stats.avgRating }
            ].map((stat, idx) => (
              <Card key={idx} variant="elevated" className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <stat.icon className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-forest-200">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Filter */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search community templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-forest-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Top Contributors */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Top Contributors
                </h3>
                <div className="space-y-3">
                  {topContributors.map((contributor, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-forest-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-forest-700">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {contributor.name}
                        </p>
                        <p className="text-xs text-slate-600">{contributor.templates} templates</p>
                        <p className="text-xs text-slate-500">{contributor.specialty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Featured Badge */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <h3 className="font-semibold text-amber-900 mb-2">
                  Share Your Templates
                </h3>
                <p className="text-sm text-amber-700 mb-4">
                  Help the community by sharing your best clinical templates
                </p>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Template Grid */}
          <div className="lg:col-span-3">
            {filteredTemplates.length > 0 ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Updated daily</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onPreview={setPreviewTemplate}
                      onUse={(t) => alert(`Sign in to use "${t.name}"`)}
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
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={(t) => alert(`Sign in to use "${t.name}"`)}
        />
      )}
    </div>
  );
}
