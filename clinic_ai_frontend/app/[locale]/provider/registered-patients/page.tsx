'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisteredPatientsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ patient_id: string; whatsapp_triggered: boolean } | null>(null);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'en_US'>('en');
  const [travelledRecently, setTravelledRecently] = useState(false);
  const [constant, setConstant] = useState(true);

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
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        age: Number(age),
        gender: gender.trim(),
        preferred_language: preferredLanguage,
        travelled_recently: travelledRecently,
        constant,
      };

      const response = await apiClient.registerPatient(payload);
      setResult(response);
      toast.success('Patient registered successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registered Patients</h1>
          <p className="text-gray-600 mt-1">Register a patient using the same fields as the Swagger registration route</p>
        </div>
        <Link href="/provider/visits/new">
          <Button>Go to New Visit Form</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Patient Registration
          </CardTitle>
          <CardDescription>POST `/api/patients/register`</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Phone number"
              required
            />
            <Input
              type="number"
              min={0}
              max={130}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              required
            />
            <Input
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="Gender"
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'hi' | 'en_US')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="en">en</option>
                <option value="hi">hi</option>
                <option value="en_US">en_US</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={travelledRecently}
                onChange={(e) => setTravelledRecently(e.target.checked)}
              />
              travelled_recently
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={constant}
                onChange={(e) => setConstant(e.target.checked)}
              />
              constant
            </label>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Patient'}
            </Button>
          </form>

          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p><strong>patient_id:</strong> {result.patient_id}</p>
              <p><strong>whatsapp_triggered:</strong> {String(result.whatsapp_triggered)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
