'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Shield,
  Users,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function HospitalsPage() {
  const features = [
    'Enterprise-grade security and compliance',
    'SSO and Active Directory integration',
    'Custom AI model training on your workflows',
    'Unlimited provider accounts',
    'Dedicated customer success manager',
    'SLA guarantees and 24/7 support',
    'Advanced analytics and reporting',
    'Multi-location deployment',
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
            <Link href="/partners">
              <Button variant="primary" size="base">
                Contact Sales
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
              <Building2 className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">
            Enterprise Solutions
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Built for Health Systems
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Scale efficiently across your organization. Enterprise-grade security, custom integrations, and dedicated support for large healthcare systems.
          </p>
          <Link href="/partners">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>
              Talk to Sales
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Enterprise Features
          </h2>
          <Card variant="elevated">
            <CardContent className="p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-6 h-6 text-forest-600" />
              <span className="font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Lock className="w-6 h-6 text-forest-600" />
              <span className="font-medium">SOC 2 Type II</span>
            </div>
          </div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Trusted by healthcare organizations of all sizes. Our security-first approach ensures your data is protected.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to scale your documentation?</h2>
          <p className="text-xl text-white/80 mb-8">
            Contact our enterprise team to discuss your organization's needs.
          </p>
          <Link href="/partners">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">
              Schedule a Demo
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
