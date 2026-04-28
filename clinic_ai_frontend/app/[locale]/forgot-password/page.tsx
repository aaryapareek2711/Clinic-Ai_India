'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.forgotPassword(normalizedEmail);
      setSubmitted(true);
      toast.success(response?.message || response?.detail || 'If this account exists, reset instructions were sent.');
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 405) {
        toast.error('Password reset is not enabled yet. Please contact clinic admin for manual reset.');
        return;
      }
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50 flex flex-col">
      <header className="bg-white/95 backdrop-blur-lg border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-forest rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">MedGenie</span>
          </Link>
          <Link href="/login" className="text-sm text-forest-600 hover:text-forest-700 font-medium">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset password</h1>
          <p className="text-slate-600 text-sm mb-6">
            Enter your account email and we will send reset instructions if your account exists.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@clinic.com"
              autoComplete="email"
              required
            />
            <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
              Send reset link
            </Button>
          </form>

          {submitted && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-900">
              Request submitted. Please check your email inbox and spam folder.
            </div>
          )}

          {resetToken && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-900">
              <p className="mb-3">Reset token generated for this environment. Continue directly to set a new password.</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
              >
                Continue to reset password
              </Button>
            </div>
          )}

          <Link href="/login" className="block mt-5">
            <Button variant="outline" className="w-full">
              Return to login
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
