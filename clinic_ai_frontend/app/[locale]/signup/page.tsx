'use client';

import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50 flex flex-col">
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
            href="/login"
            className="text-sm text-forest-600 hover:text-forest-700 font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            Already have an account?
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <Suspense fallback={<div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600"></div></div>}>
            <SignupForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/95 backdrop-blur-lg border-t border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-slate-500">
          <p>© 2026 MedGenie · <Link href="/security" className="hover:text-forest-600">Privacy & Security</Link> · <Link href="/support" className="hover:text-forest-600">Support</Link></p>
        </div>
      </footer>
    </div>
  );
}
