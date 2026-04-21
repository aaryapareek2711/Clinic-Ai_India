'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Handshake,
  CheckCircle2,
  Building2,
  Globe,
  Award,
  ChevronRight
} from 'lucide-react';

export default function PartnersPage() {
  const partnerTypes = [
    {
      title: 'EHR Vendors',
      description: 'Integrate MedGenie into your EHR platform to offer AI-powered documentation.',
      icon: Building2,
    },
    {
      title: 'Resellers',
      description: 'Join our reseller program and offer MedGenie to your healthcare clients.',
      icon: Globe,
    },
    {
      title: 'Technology Partners',
      description: 'Build integrations and joint solutions with MedGenie.',
      icon: Award,
    },
  ];

  const benefits = [
    'Revenue sharing opportunities',
    'Dedicated partner support',
    'Co-marketing programs',
    'API access and documentation',
    'Sales enablement resources',
    'Technical integration support',
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
            <a href="mailto:partners@medgenie.ai">
              <Button variant="primary" size="base">Contact Us</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center">
              <Handshake className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">Partner Program</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">Partners</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Join the MedGenie partner ecosystem and help transform healthcare documentation together.
          </p>
          <a href="mailto:partners@medgenie.ai">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>Become a Partner</Button>
          </a>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Partner Types</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {partnerTypes.map((type, idx) => (
              <Card key={idx} variant="elevated" className="text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-forest-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <type.icon className="w-7 h-7 text-forest-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{type.title}</h3>
                  <p className="text-sm text-slate-600">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Partner Benefits</h2>
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

      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to partner with us?</h2>
          <p className="text-xl text-white/80 mb-8">Contact our partnerships team to get started.</p>
          <a href="mailto:partners@medgenie.ai">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">Contact Partnerships</Button>
          </a>
        </div>
      </section>
    </div>
  );
}
