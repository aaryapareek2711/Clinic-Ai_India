'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarClock, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';

export default function RegisteredPatientsPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    patient_id: string;
    visit_id: string;
    existing_patient: boolean;
    whatsapp_triggered?: boolean;
    pending_schedule_for_intake?: boolean;
  } | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('IND');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'en_US'>('en_US');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [consent, setConsent] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!['doctor', 'nurse', 'admin', 'staff', 'super_admin'].includes(user?.role || '')) {
      toast.error('Access denied');
      router.push('/login');
      return;
    }

  }, [isAuthenticated, user?.role, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const payload = {
        name: `${firstName} ${lastName}`.trim(),
        phone_number: phoneNumber.trim(),
        age: Number(age),
        gender: gender.trim(),
        preferred_language: preferredLanguage,
        travelled_recently: false,
        consent,
        workflow_type: 'schedule',
        country: country.trim(),
        emergency_contact: emergencyContact.trim(),
        address: address.trim(),
      };

      const response = await apiClient.registerPatient(payload);
      setResult(response);
      const base = response.existing_patient ? 'Existing patient found. New visit created.' : 'New patient and visit created.';
      toast.success(`${base} Choose whether to schedule appointment now or later.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: `${ws}/dashboard` },
          { label: 'Register Patient' },
        ]}
      />

      <div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Register Patient</h1>
          <p className="text-slate-600 mt-1">
            Clean flow: patient registration first, then choose appointment action.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            New Registration
          </CardTitle>
          <CardDescription>Creates patient and initial visit in one step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <p className="text-sm font-medium text-slate-900 mt-1">Patient basics</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
              <p className="text-sm font-medium text-slate-900 mt-1">Create patient + visit</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
              <p className="text-sm font-medium text-slate-900 mt-1">Fix appointment now/later</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-md border p-3">
              <p className="text-sm font-semibold text-slate-900 mb-3">Patient information</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Patient First Name" required />
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Patient Last Name" />
                <Input
                  type="number"
                  min={0}
                  max={130}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Patient Age"
                  required
                />
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Patient Mobile Number"
                  required
                />
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Patient Country" />
                <Input
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'hi' | 'en_US')}
                  placeholder="Patient Language"
                />
                <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Emergency Contact (optional)" />
              </div>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address (optional)"
              />
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Consent
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">
                  Step 1 complete: create patient and visit first.
                </p>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Patient + Visit'}
                </Button>
              </div>
            </div>
          </form>

          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 space-y-1">
              <p className="font-semibold text-green-900">Registration completed</p>
              <p><strong>Patient ID:</strong> {result.patient_id}</p>
              <p><strong>Visit ID:</strong> {result.visit_id}</p>
              <p><strong>Existing patient:</strong> {result.existing_patient ? 'Yes' : 'No'}</p>
              <p><strong>WhatsApp intake triggered:</strong> {result.whatsapp_triggered ? 'Yes' : 'No'}</p>
              <p className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Visit created successfully
              </p>
              <div className="mt-2 rounded-md border border-green-300 bg-white p-3">
                <p className="font-semibold text-slate-900 mb-1">Next action</p>
                <p className="text-slate-700">
                  Fix the appointment before opening the visit workspace (vitals, transcription, clinical note).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`${ws}/fix-appointment/${encodeURIComponent(result.visit_id)}`}>
                    <Button type="button" leftIcon={<CalendarClock className="h-4 w-4" />}>
                      Fix appointment
                    </Button>
                  </Link>
                  <Link href={`${ws}/manage-appointments`}>
                    <Button size="sm" variant="outline" leftIcon={<ArrowRight className="h-4 w-4" />}>
                      Do it later
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
