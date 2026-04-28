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
  ListOrdered,
  GitBranchPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RegionProvider } from '@/contexts/RegionContext';
import { localizedWorkspacePath, normalizeWorkspacePath } from '@/lib/workspace/resolver';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: '/clinic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clinic/queue', label: 'Queue Board', icon: ListOrdered },
  { href: '/clinic/follow-through', label: 'Follow-through', icon: GitBranchPlus },
  { href: '/clinic/calendar', label: 'Calendar', icon: Calendar },
  { href: '/clinic/visits', label: 'Visits', icon: Stethoscope },
  { href: '/clinic/patients', label: 'Patients', icon: User },
  { href: '/clinic/templates', label: 'Templates', icon: FileText },
  { href: '/clinic/settings', label: 'Settings', icon: Settings },
];

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const withLocale = (href: string) => localizedWorkspacePath(pathname, href);

  useEffect(() => {
    // Wait for hydration to complete
    if (pathname?.includes('/provider')) {
      router.replace(normalizeWorkspacePath(pathname));
      return;
    }
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!['doctor', 'nurse', 'admin', 'staff', 'super_admin', 'provider'].includes(user?.role || '')) {
      router.replace('/login');
    } else {
      setIsReady(true);
    }
  }, [isAuthenticated, pathname, user, router]);

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
    return currentPath.startsWith(href);
  };

  // Show nothing until we've confirmed auth status to prevent flicker
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RegionProvider>
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col bg-slate-900 md:flex">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-6">
          <Link href={withLocale('/clinic/dashboard')} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">MedGeni</span>
              <Badge variant="outline" size="sm" className="ml-2 border-blue-500 text-blue-400">
                Provider
              </Badge>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Practice
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={withLocale(item.href)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive(item.href)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={typeof item.badge === 'number' ? 'danger' : 'secondary'}
                    size="sm"
                  >
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
                href={withLocale('/provider/admin/subscription')}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${pathname?.includes('/provider/admin/subscription')
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className="flex items-center">
                  <CreditCard className="mr-3 h-5 w-5" />
                  <span>Subscription</span>
                </div>
              </Link>
              <Link
                href={withLocale('/provider/admin/analytics')}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${pathname?.includes('/provider/admin/analytics')
                  ? 'bg-blue-600 text-white shadow-md'
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

        {/* User Section */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
              {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || user?.email || 'Provider'}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-900">
              {navItems.find(i => isActive(i.href))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
              <Activity className="w-4 h-4" />
              <span>System Operational</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
    </RegionProvider>
  );
}
