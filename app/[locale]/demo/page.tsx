"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SymptomChecker from '@/components/previsit/SymptomChecker';
import MedicalHistoryForm from '@/components/previsit/MedicalHistoryForm';
import PatientContextCard from '@/components/appoint-ready/PatientContextCard';
import RiskStratification from '@/components/appoint-ready/RiskStratification';
import CareGaps from '@/components/appoint-ready/CareGaps';
import VisitDocumentation from '@/components/visit/VisitDocumentation';
import { useAuthStore } from '@/lib/stores/authStore';
import { User, Stethoscope, LogOut, FileText, FileAudio, LayoutDashboard, Brain, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DemoPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('516439f3-7727-44e6-b23d-18ec5249e865');
  const [selectedVisitId, setSelectedVisitId] = useState<string>('84fc2847-fcca-438f-884c-50c8c660561d');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const isProvider = user.role === 'doctor' || user.role === 'nurse' || user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Healthcare AI Demo
                </h1>
                <p className="text-sm text-gray-600">
                  MedGenie PreVisit & MedGenie Context Features
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <Badge variant="secondary" className="text-xs">
                  {user.role}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue={isProvider ? "visit-documentation" : "previsit"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="previsit">
              <User className="h-4 w-4 mr-2" />
              Symptom Checker
            </TabsTrigger>
            <TabsTrigger value="medical-history">
              <FileText className="h-4 w-4 mr-2" />
              Medical History
            </TabsTrigger>
            <TabsTrigger value="visit-documentation" disabled={!isProvider}>
              <FileAudio className="h-4 w-4 mr-2" />
              Visit Docs
            </TabsTrigger>
            <TabsTrigger value="appoint-ready" disabled={!isProvider}>
              <Stethoscope className="h-4 w-4 mr-2" />
              MedGenie AI
            </TabsTrigger>
          </TabsList>

          {/* PreVisit.ai Tab */}
          <TabsContent value="previsit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MedGenie PreVisit - Patient Symptom Checker</CardTitle>
                <CardDescription>
                  AI-powered symptom analysis and triage assessment for patients before their visit
                </CardDescription>
              </CardHeader>
            </Card>
            <SymptomChecker />
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="medical-history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Medical History Form</CardTitle>
                <CardDescription>
                  Complete your medical history to help your healthcare provider prepare for your visit
                </CardDescription>
              </CardHeader>
            </Card>
            <MedicalHistoryForm />
          </TabsContent>

          {/* Visit Documentation Tab */}
          <TabsContent value="visit-documentation" className="space-y-6">
            {!isProvider ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">
                    Visit documentation features are only available to healthcare providers
                  </p>
                </CardContent>
              </Card>
            ) : (
              <VisitDocumentation visitId={selectedVisitId} />
            )}
          </TabsContent>

          {/* Appoint-Ready Tab */}
          <TabsContent value="appoint-ready" className="space-y-6">
            {!isProvider ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">
                    MedGenie AI features are only available to healthcare providers
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>MedGenie AI - Provider Dashboard</CardTitle>
                    <CardDescription>
                      Comprehensive patient context, risk assessment, and care gaps for appointment preparation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6">
                      {/* Patient Context */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Patient Context</h2>
                        <PatientContextCard patientId={selectedPatientId} />
                      </div>

                      {/* Risk Stratification */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Risk Stratification</h2>
                        <RiskStratification patientId={selectedPatientId} />
                      </div>

                      {/* Care Gaps */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Care Gaps</h2>
                        <CareGaps patientId={selectedPatientId} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>MedGenie - Demo Environment</p>
            <p className="mt-1">Docker-first development • Phase 0: Local Testing</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
