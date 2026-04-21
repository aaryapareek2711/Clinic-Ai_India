'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  CreditCard,
  BarChart2,
  Activity,
  Bell,
  Settings,
  History,
  LayoutDashboard,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NavItem } from '@/lib/types';

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/insurance', label: 'Insurance', icon: Shield },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/activity', label: 'Account Activity', icon: Activity },
  { href: '/dashboard/reminders', label: 'Reminders', icon: Bell, badge: 1 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/history', label: 'Recently Viewed', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-white md:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <h1 className="text-xl font-bold text-blue-600">HealthAI</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-4">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge variant="destructive" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700 px-2">Switch Dashboard</p>
          <Link
            href="/provider/dashboard"
            className="flex items-center text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50"
          >
            Provider Dashboard →
          </Link>
          <Link
            href="/patient/dashboard"
            className="flex items-center text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50"
          >
            Patient Dashboard →
          </Link>
        </div>
        <p className="text-xs text-gray-500 text-center pt-2">© 2025 HealthAI</p>
      </div>
    </aside>
  );
}
