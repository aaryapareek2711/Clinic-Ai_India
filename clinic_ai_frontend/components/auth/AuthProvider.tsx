'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { Toaster } from 'react-hot-toast';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}
