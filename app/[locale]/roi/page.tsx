'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  DollarSign,
  Calculator,
  TrendingUp,
  Clock,
  Users,
  ChevronRight
} from 'lucide-react';

export default function ROIPage() {
  const [providers, setProviders] = useState(5);
  const [patientsPerDay, setPatientsPerDay] = useState(20);

  const timeSavedPerPatient = 4; // minutes
  const hourlyRate = 150; // $/hour
  const workingDays = 250; // per year

  const annualTimeSaved = providers * patientsPerDay * timeSavedPerPatient * workingDays / 60; // hours
  const annualSavings = annualTimeSaved * hourlyRate;

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
              <DollarSign className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <Badge variant="primary" size="lg" className="mb-6">Calculate Your Savings</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">ROI Calculator</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            See how much time and money MedGenie can save your practice.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card variant="elevated">
            <CardContent className="p-8">
              <div className="grid sm:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Providers
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={providers}
                    onChange={(e) => setProviders(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-2xl font-bold text-forest-600 mt-2">{providers}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Patients Per Provider Per Day
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={patientsPerDay}
                    onChange={(e) => setPatientsPerDay(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-2xl font-bold text-forest-600 mt-2">{patientsPerDay}</div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-6 text-center">Your Estimated Annual Savings</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-forest-50 rounded-xl">
                    <Clock className="w-8 h-8 text-forest-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-forest-600">{annualTimeSaved.toLocaleString()} hrs</div>
                    <p className="text-slate-600">Time Saved Per Year</p>
                  </div>
                  <div className="text-center p-6 bg-forest-50 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-forest-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-forest-600">${annualSavings.toLocaleString()}</div>
                    <p className="text-slate-600">Estimated Annual Value</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 bg-gradient-forest text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to see real savings?</h2>
          <p className="text-xl text-white/80 mb-8">Start your 14-day free trial today.</p>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="bg-white text-forest-700 border-white hover:bg-white/90">Start Free Trial</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
