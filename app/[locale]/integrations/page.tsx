'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  Database,
  Shield,
  Zap,
  ChevronRight
} from 'lucide-react';

export default function IntegrationsPage() {
  const integrations = [
    {
      name: 'Epic',
      description: 'Seamless integration with Epic EHR systems.',
      status: 'Available',
    },
    {
      name: 'Cerner',
      description: 'Connect with Cerner for unified patient data.',
      status: 'Available',
    },
    {
      name: 'Athenahealth',
      description: 'Integrate with Athenahealth practice management.',
      status: 'Available',
    },
    {
      name: 'Allscripts',
      description: 'Connect with Allscripts EHR platform.',
      status: 'Coming Soon',
    },
    {
      name: 'NextGen',
      description: 'Integration with NextGen Healthcare.',
      status: 'Coming Soon',
    },
    {
      name: 'Custom API',
      description: 'Build custom integrations with our REST API.',
      status: 'Available',
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
              <Globe className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">Connect Your Systems</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">Integrations</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            MedGenie connects with your existing EHR and practice management systems for a seamless workflow.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration, idx) => (
              <Card key={idx} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Database className="w-6 h-6 text-slate-600" />
                    </div>
                    <Badge variant={integration.status === 'Available' ? 'success' : 'secondary'} size="sm">
                      {integration.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{integration.name}</h3>
                  <p className="text-sm text-slate-600">{integration.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Shield className="w-10 h-10 text-forest-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">HIPAA Compliant</h3>
              <p className="text-sm text-slate-600">All integrations meet HIPAA security standards.</p>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-10 h-10 text-forest-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Real-time Sync</h3>
              <p className="text-sm text-slate-600">Data syncs instantly between systems.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Need a custom integration?</h2>
          <p className="text-xl text-white/80 mb-8">Contact our team to discuss your specific needs.</p>
          <a href="mailto:integrations@medgenie.ai">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">Contact Us</Button>
          </a>
        </div>
      </section>
    </div>
  );
}
