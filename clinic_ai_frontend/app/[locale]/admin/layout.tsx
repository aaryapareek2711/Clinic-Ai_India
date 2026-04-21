'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Shield,
  Bell,
  LogOut,
  ChevronDown,
  Heart,
  Activity,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2, badge: 'New' },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/roles', label: 'Roles', icon: Shield },
  { href: '/admin/support-access', label: 'Support Access', icon: HelpCircle },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/audit', label: 'Audit Logs', icon: Shield },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const secondaryNavItems: NavItem[] = [
  { href: '/admin/security', label: 'Security', icon: Shield },
  { href: '/admin/alerts', label: 'Alerts', icon: AlertTriangle, badge: 3 },
  { href: '/admin/support', label: 'Support', icon: HelpCircle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col bg-slate-900 md:flex">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-6">
          <Link href="/admin" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">MedGenie</span>
              <Badge variant="outline" size="sm" className="ml-2 border-emerald-500 text-emerald-400">
                Admin
              </Badge>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Main
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive(item.href)
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={typeof item.badge === 'number' ? 'danger' : 'primary'}
                    size="sm"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-8 space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              System
            </p>
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive(item.href)
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="danger" size="sm">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email || 'Admin User'}
              </p>
              <p className="text-xs text-slate-500">System Administrator</p>
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
            <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
              <Activity className="w-4 h-4" />
              <span>System Healthy</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
