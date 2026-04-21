'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Copy,
  Share2,
  Edit,
  ChevronRight
} from 'lucide-react';

export default function TemplatesPage() {
  const features = [
    {
      title: 'Pre-built Templates',
      description: 'Start with professionally designed templates for common visit types.',
      icon: FileText,
    },
    {
      title: 'Clone & Customize',
      description: 'Duplicate any template and modify it to match your documentation style.',
      icon: Copy,
    },
    {
      title: 'Share with Team',
      description: 'Share your best templates with colleagues and standardize practice-wide.',
      icon: Share2,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-forest-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="base">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">Structured Documentation</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">Clinical Templates</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Speed up documentation with pre-built templates. Customize for your specialty and share across your team.
          </p>
          <Link href="/signup">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>Get Started</Button>
          </Link>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Template Features</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} variant="elevated" className="text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-forest-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-forest-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Document faster</h2>
          <p className="text-xl text-white/80 mb-8">Start your 14-day free trial today.</p>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">Start Free Trial</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
