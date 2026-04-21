'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, isAuthenticated, user, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      // Normalize role: both "doctor" and "provider" should be treated as provider
      const normalizedRole = (user.role === 'doctor' || user.role === 'provider') ? 'provider' : user.role;

      // Redirect based on role
      if (user.role === 'super_admin') {
        router.push('/admin');
      } else if (normalizedRole === 'patient') {
        router.push('/patient/dashboard');
      } else {
        router.push('/provider/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }

    try {
      await login(username, password);
      toast.success('Login successful!');
    } catch (err) {
      // Error already handled by store
    }
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
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoading}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link href="/signup" className="text-forest-600 hover:text-forest-700 font-medium">
                  Start your free trial
                </Link>
              </p>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-slate-600">
                <p><span className="font-medium">Patient:</span> newpatient / SecurePass123!</p>
                <p><span className="font-medium">Doctor:</span> drjane2 / SecurePass123!</p>
              </div>
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
