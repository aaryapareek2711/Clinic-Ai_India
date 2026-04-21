'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Users,
  TrendingUp,
  Shield,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function PracticesPage() {
  const benefits = [
    'Standardize documentation across all providers',
    'Reduce charting time by up to 50%',
    'Improve coding accuracy and revenue capture',
    'Enhance provider satisfaction and retention',
    'HIPAA-compliant cloud infrastructure',
    'Dedicated onboarding and support',
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
              <Building className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">
            For Medical Practices
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Standardize Quality Care
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Streamline documentation across your practice. Improve consistency, reduce burnout, and focus on what matters most—your patients.
          </p>
          <Link href="/signup">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Why Practices Choose MedGenie
          </h2>
          <Card variant="elevated">
            <CardContent className="p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { stat: '50%', label: 'Less documentation time' },
              { stat: '30%', label: 'Improved coding accuracy' },
              { stat: '95%', label: 'Provider satisfaction' },
            ].map((item, idx) => (
              <div key={idx}>
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
          <h2 className="text-3xl font-bold mb-4">Ready to transform your practice?</h2>
          <p className="text-xl text-white/80 mb-8">
            Join hundreds of practices already using MedGenie.
          </p>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
