"use client";

import { User } from "@/lib/auth/middleware";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Settings } from "lucide-react";
import { useState } from "react";

/**
 * Renders the user navigation menu in the header with logout functionality.
 */
export function UserNav({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    // 1. Clear Zustand state
    logout();

    // 2. Remove the auth_token cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // 3. Redirect to the login page
    router.push('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-4 focus:outline-none"
      >
        <div className="hidden sm:flex flex-col items-end">
          <span className="font-medium text-sm text-gray-800">{user.name}</span>
          <span className="text-xs text-gray-500 capitalize">{user.role} Portal</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white border-2 border-white shadow-lg hover:shadow-xl transition-shadow">
          {user.name.charAt(0)}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="p-2">
              {/* User Info Section */}
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>

              {/* Menu Items */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/${user.role}/settings`);
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md mt-1"
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/${user.role}/profile`);
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <UserIcon className="h-4 w-4 mr-3" />
                Profile
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md mt-1"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
