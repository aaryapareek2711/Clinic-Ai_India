'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Clipboard,
  FileText,
  Mic,
  Brain,
  Heart,
  CheckCircle2,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      phase: 'Before',
      step: '01',
      title: 'Pre-Visit Questionnaire',
      description: 'The clinical team sends patients a tailored questionnaire based on their appointment reason. Patients complete it from home at their convenience.',
      icon: Clipboard,
      color: 'blue',
    },
    {
      phase: 'Before',
      step: '02',
      title: 'Physician Reviews',
      description: 'Before the appointment, physicians review patient-submitted information to understand symptoms and concerns ahead of time.',
      icon: FileText,
      color: 'blue',
    },
    {
      phase: 'During',
      step: '03',
      title: 'Ambient AI Listening',
      description: 'During the visit, MedGenie\'s AI captures the conversation so you can focus entirely on the patient without typing.',
      icon: Mic,
      color: 'forest',
    },
    {
      phase: 'After',
      step: '04',
      title: 'AI Summary',
      description: 'After the visit, an AI-generated clinical summary is ready for your review and signature. Edit as needed before finalizing.',
      icon: Brain,
      color: 'emerald',
    },
    {
      phase: 'After',
      step: '05',
      title: 'Patient Summary',
      description: 'An easy-to-understand after-visit summary is automatically generated and shared with the patient.',
      icon: Heart,
      color: 'emerald',
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
          <Badge variant="primary" size="lg" className="mb-6">
            Your Clinical Journey
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            How MedGenie Works
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            MedGenie supports you before, during, and after every patient visit—reducing documentation time so you can focus on care.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-8 items-start">
                {/* Step Number */}
                <div className="flex-shrink-0 w-24">
                  <div className={`text-xs font-semibold uppercase tracking-wide text-${step.color}-600 mb-1`}>
                    {step.phase}
                  </div>
                  <div className="text-4xl font-bold text-slate-300">{step.step}</div>
                </div>

                {/* Content */}
                <Card variant="elevated" className="flex-1">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 bg-${step.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <step.icon className={`w-7 h-7 text-${step.color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                        <p className="text-lg text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">The Result?</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { stat: '50%', label: 'Less documentation time' },
              { stat: '2+ hrs', label: 'Saved per day' },
              { stat: '100%', label: 'Physician control' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-forest-600 mb-2">{item.stat}</div>
                <p className="text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-white/80 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90" rightIcon={<ChevronRight className="w-5 h-5" />}>
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
