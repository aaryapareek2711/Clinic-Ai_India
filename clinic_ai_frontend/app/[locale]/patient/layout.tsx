import { requireRole } from "@/lib/auth/middleware";
import { PatientHeader } from "@/components/layout/PatientHeader";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce patient role requirement
  await requireRole("patient");

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientHeader />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
