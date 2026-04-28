'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { homePathForRole } from '@/lib/workspace/resolver';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, isAuthenticated, user, clearError } = useAuthStore();
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = searchParams?.get('redirect');
      const safeRedirect = redirectPath && redirectPath.startsWith('/') ? redirectPath : null;
      router.push(safeRedirect || homePathForRole(user.role));
    }
  }, [isAuthenticated, user, router, searchParams]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const submitLogin = async (submittedUsername: string, submittedPassword: string) => {
    if (!submittedUsername || !submittedPassword) {
      toast.error('Please enter both username and password');
      return;
    }

    try {
      await login(submittedUsername, submittedPassword);
      toast.success('Login successful!');
    } catch (err) {
      // Error already handled by store
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const submittedUsername = String(formData.get('username') || usernameRef.current?.value || '').trim();
    const submittedPassword = String(formData.get('password') || passwordRef.current?.value || '');
    await submitLogin(submittedUsername, submittedPassword);
  };

  const handleButtonClick = async () => {
    const submittedUsername = String(usernameRef.current?.value || '').trim();
    const submittedPassword = String(passwordRef.current?.value || '');
    await submitLogin(submittedUsername, submittedPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50 flex flex-col">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-forest rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">MedGenie</span>
          </Link>
          <Link
            href="/signup"
            className="text-sm text-forest-600 hover:text-forest-700 font-medium"
          >
            Create an account
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-600 mt-2">Sign in to access your MedGenie account</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-xl p-8 border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Username or Email"
                name="username"
                type="text"
                ref={usernameRef}
                placeholder="Enter your username"
                autoComplete="username"
              />

              <Input
                label="Password"
                name="password"
                type="password"
                ref={passwordRef}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoading}
                onClick={handleButtonClick}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-slate-600">
                <Link href="/forgot-password" className="text-forest-600 hover:text-forest-700 font-medium">
                  Forgot password?
                </Link>
              </p>
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-forest-600 hover:text-forest-700 font-medium">
                  Start your free trial
                </Link>
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Access note</p>
              <p>Use a valid clinic account to sign in. If you do not have one, create an account or use forgot password.</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Protected by HIPAA-compliant security
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/95 backdrop-blur-lg border-t border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-slate-500">
          <p>© 2026 MedGenie · <Link href="/security" className="hover:text-forest-600">Privacy & Security</Link></p>
        </div>
      </footer>
    </div>
  );
}
