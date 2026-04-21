import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { UserNav } from "./UserNav";
import { Activity } from "lucide-react";

/**
 * The header component for the patient portal.
 */
export async function PatientHeader() {
  const user = await getCurrentUser();

  const navLinks = [
    { href: "/patient/dashboard", label: "Home" },
    { href: "/patient/appointments", label: "Appointments" },
    { href: "/patient/records", label: "My Records" },
    { href: "/patient/messages", label: "Messages" },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/patient/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">HealthAI</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center">
            {user && <UserNav user={user} />}
          </div>
        </div>
      </div>
    </header>
  );
}
