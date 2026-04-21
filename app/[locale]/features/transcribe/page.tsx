'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Mic,
  CheckCircle2,
  FileText,
  Clock,
  Languages,
  ChevronRight
} from 'lucide-react';

export default function TranscribePage() {
  const features = [
    {
      title: 'Real-time Transcription',
      description: 'Watch your words appear instantly as you speak. Natural language processing ensures accuracy.',
      icon: Mic,
    },
    {
      title: 'Clinical Terminology',
      description: 'Trained on medical vocabulary, procedures, and medication names for precise documentation.',
      icon: FileText,
    },
    {
      title: 'Multi-language Support',
      description: 'Support for multiple languages to serve diverse patient populations.',
      icon: Languages,
    },
    {
      title: 'Time-saving',
      description: 'Reduce documentation time by up to 50% compared to traditional typing.',
      icon: Clock,
    },
  ];

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
            <Link href="/signup">
              <Button variant="primary" size="base">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center">
              <Mic className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">
            AI-Powered Transcription
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Transcribe & Dictate
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Real-time medical transcription that understands clinical language. Dictate naturally and watch your words transform into structured notes.
          </p>
          <Link href="/signup">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>
              Try It Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Key Capabilities
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-forest-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-forest-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-slate-600">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your documentation?</h2>
          <p className="text-xl text-white/80 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
