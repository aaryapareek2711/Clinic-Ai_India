'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Activity,
  CreditCard,
  BarChart3,
  Stethoscope,
  Bell,
  User,
  ClipboardList,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RegionLanguageSwitcher } from '@/components/ui/RegionLanguageSwitcher';
import { RegionProvider } from '@/contexts/RegionContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

const navItems: NavItem[] = [
  { href: '/clinic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clinic/registered-patients', label: 'Register patient', icon: UserPlus },
  { href: '/clinic/manage-appointments', label: 'Manage appointments', icon: ClipboardList },
  { href: '/careprep', label: 'CarePrep', icon: Stethoscope },
  { href: '/clinic/visits', label: 'Visit workspace', icon: FileText },
  { href: '/clinic/calendar', label: 'Calendar', icon: Calendar },
  { href: '/clinic/patients', label: 'Patients', icon: User },
  { href: '/clinic/templates', label: 'Templates', icon: FileText },
  { href: '/clinic/settings', label: 'Settings', icon: Settings },
];

const clinicStaffRoles = ['doctor', 'nurse', 'admin', 'staff', 'super_admin', 'provider'];

export default function ClinicWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!clinicStaffRoles.includes(user?.role || '')) {
      router.replace('/login');
    } else {
      setIsReady(true);
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  const isActive = (href: string) => {
    const currentPath = pathname || '';
    if (href === '/clinic/dashboard') {
      return currentPath.endsWith('/clinic/dashboard') || currentPath.endsWith('/clinic');
    }
    if (href === '/careprep') {
      return currentPath.startsWith('/careprep');
    }
    return currentPath.startsWith(href);
  };

  const headerTitle =
    navItems.find((i) => isActive(i.href))?.label ||
    (pathname?.includes('/clinic/visits/') ? 'Visit' : 'Clinic');

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <RegionProvider>
      <div className="flex h-screen bg-slate-100">
        <aside className="hidden w-72 flex-col bg-slate-900 md:flex">
          <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-6">
            <Link href="/clinic/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">MedGenie</span>
                <Badge variant="outline" size="sm" className="ml-2 border-emerald-500 text-emerald-300">
                  Clinic
                </Badge>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Workspace
              </p>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant={typeof item.badge === 'number' ? 'danger' : 'secondary'} size="sm">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>

            {(user?.role === 'admin' || user?.role === 'doctor') && (
              <div className="mt-8 space-y-1">
                <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Administration
                </p>
                <Link
                  href="/provider/admin/subscription"
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    pathname?.includes('/provider/admin/subscription')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <CreditCard className="mr-3 h-5 w-5" />
                    <span>Subscription</span>
                  </div>
                </Link>
                <Link
                  href="/provider/admin/analytics"
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    pathname?.includes('/provider/admin/analytics')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <BarChart3 className="mr-3 h-5 w-5" />
                    <span>Analytics</span>
                  </div>
                </Link>
              </div>
            )}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name || user?.email || 'Clinic staff'}
                </p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-slate-900">{headerTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              <RegionLanguageSwitcher variant="dropdown" />
              <button
                type="button"
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <Activity className="w-4 h-4" />
                <span>System operational</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
        </div>
      </div>
    </RegionProvider>
  );
}
