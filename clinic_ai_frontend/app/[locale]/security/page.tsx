'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle2,
  Server,
  Eye,
  FileCheck,
  Users,
  ChevronRight
} from 'lucide-react';

export default function SecurityPage() {
  const certifications = [
    {
      title: 'HIPAA Compliant',
      description: 'Full compliance with Health Insurance Portability and Accountability Act requirements',
      icon: Shield,
    },
    {
      title: 'SOC 2 Type II',
      description: 'Audited security controls for availability, processing integrity, and confidentiality',
      icon: FileCheck,
    },
    {
      title: '256-bit Encryption',
      description: 'Bank-grade AES-256 encryption for all data at rest and in transit',
      icon: Lock,
    },
    {
      title: 'FHIR R4 Compatible',
      description: 'Industry-standard healthcare interoperability for secure data exchange',
      icon: Server,
    },
  ];

  const features = [
    'End-to-end encryption for all patient data',
    'Role-based access controls (RBAC)',
    'Audit logging for all system access',
    'Automatic session timeout',
    'Multi-factor authentication (MFA)',
    'Business Associate Agreements (BAAs) for all customers',
    'Regular third-party security audits',
    'Secure cloud infrastructure on Azure',
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
              <Shield className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">
            Enterprise-Grade Security
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Security & Compliance
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Your patients' data deserves the highest level of protection. MedGenie is built with security at its core.
          </p>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Certifications & Standards
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, idx) => (
              <Card key={idx} variant="elevated" className="text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-forest-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <cert.icon className="w-7 h-7 text-forest-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{cert.title}</h3>
                  <p className="text-sm text-slate-600">{cert.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Security Features
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
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Eye className="w-12 h-12 text-forest-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Transparency & Trust
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            We believe in complete transparency. All AI-generated summaries require physician review and approval before becoming part of the medical record. You're always in control.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Questions about security?</h2>
          <p className="text-xl text-white/80 mb-8">
            Our team is here to help. Contact us to discuss your organization's specific compliance needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:security@medgenie.ai">
              <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">
                Contact Security Team
              </Button>
            </a>
            <Link href="/signup">
              <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90" rightIcon={<ChevronRight className="w-5 h-5" />}>
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
