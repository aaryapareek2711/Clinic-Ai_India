'use client';

import { useRouter } from 'next/navigation';
import { Search, Bell, MessageSquare, Menu, TrendingUp, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    // Remove the auth_token cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6">
      {/* Mobile Menu Button */}
      <Button variant="ghost" size="sm" className="md:hidden">
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Month Income Indicator */}
      <div className="hidden items-center gap-2 md:flex">
        <TrendingUp className="h-4 w-4 text-green-600" />
        <div className="text-sm">
          <p className="text-gray-600">Jul Income</p>
          <p className="font-semibold text-gray-900">$100.00</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative hidden w-full max-w-md md:block mx-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          placeholder="Search clients..."
          className="w-full rounded-md bg-gray-50 pl-9 border-gray-200 text-gray-900"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" className="hidden sm:flex">
          <span className="text-sm text-gray-700">+ Create</span>
        </Button>
        <Button variant="ghost" size="sm">
          <MessageSquare className="h-5 w-5 text-gray-600" />
          <span className="sr-only">Messages</span>
        </Button>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          <Badge variant="danger" className="h-5 w-5 rounded-full p-0 flex items-center justify-center absolute -top-1 -right-1">
            3
          </Badge>
          <span className="sr-only">Notifications</span>
        </Button>
        <div className="flex items-center space-x-3 ml-2 pl-2 border-l">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden text-sm md:block">
            <p className="font-medium text-gray-900">{user?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'Member'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-600"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
