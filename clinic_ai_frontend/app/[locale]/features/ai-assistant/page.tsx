'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Brain,
  MessageSquare,
  Lightbulb,
  ChevronRight
} from 'lucide-react';

export default function AIAssistantPage() {
  const capabilities = [
    {
      title: 'Smart Suggestions',
      description: 'Get real-time coding suggestions and documentation prompts based on the clinical context.',
      icon: Lightbulb,
    },
    {
      title: 'Natural Queries',
      description: 'Ask questions in plain language—"What\'s the patient\'s last A1C?" and get instant answers.',
      icon: MessageSquare,
    },
    {
      title: 'Clinical Decision Support',
      description: 'Evidence-based recommendations and care gap alerts integrated into your workflow.',
      icon: Brain,
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
              <Sparkles className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">
            Intelligent Assistance
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            AI Assistant
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Your intelligent clinical companion. Get smart suggestions, answer queries, and receive decision support—all while you focus on the patient.
          </p>
          <Link href="/signup">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>
              Try It Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            What It Can Do
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {capabilities.map((cap, idx) => (
              <Card key={idx} variant="elevated" className="text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-forest-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <cap.icon className="w-7 h-7 text-forest-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{cap.title}</h3>
                  <p className="text-sm text-slate-600">{cap.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Experience intelligent documentation</h2>
          <p className="text-xl text-white/80 mb-8">
            Start your 14-day free trial today.
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
