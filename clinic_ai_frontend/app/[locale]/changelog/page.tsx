'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  History,
  CheckCircle2,
  Star,
  Zap,
  Bug,
  ChevronRight
} from 'lucide-react';

export default function ChangelogPage() {
  const releases = [
    {
      version: '2.4.0',
      date: 'January 2026',
      type: 'Feature',
      icon: Star,
      changes: [
        'New ambient listening mode for real-time transcription',
        'Enhanced patient context panel with care gap alerts',
        'Improved template customization options',
      ],
    },
    {
      version: '2.3.5',
      date: 'December 2025',
      type: 'Improvement',
      icon: Zap,
      changes: [
        'Faster AI summarization (40% speed improvement)',
        'Better multi-language support',
        'UI/UX refinements across the platform',
      ],
    },
    {
      version: '2.3.0',
      date: 'November 2025',
      type: 'Bug Fix',
      icon: Bug,
      changes: [
        'Fixed session timeout issues',
        'Resolved template sync bugs',
        'Improved EHR integration stability',
      ],
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
              <History className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">What's New</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">Changelog</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and fixes in MedGenie.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {releases.map((release, idx) => (
              <Card key={idx} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-forest-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <release.icon className="w-6 h-6 text-forest-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-slate-900">v{release.version}</span>
                        <Badge variant="secondary" size="sm">{release.type}</Badge>
                        <span className="text-sm text-slate-500">{release.date}</span>
                      </div>
                      <ul className="space-y-2">
                        {release.changes.map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-600">
                            <CheckCircle2 className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
