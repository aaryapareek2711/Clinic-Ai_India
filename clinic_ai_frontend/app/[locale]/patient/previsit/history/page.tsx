import { getCurrentUser } from "@/lib/auth/middleware";
import MedicalHistoryForm from "@/components/previsit/MedicalHistoryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default async function MedicalHistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patient/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical History</h1>
          <p className="text-gray-600 mt-1">Update your medical information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Your Medical History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Please review and update your medical history. Accurate information helps your healthcare provider provide better care.
          </p>
          <MedicalHistoryForm />
        </CardContent>
      </Card>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900">
          <strong>Privacy:</strong> Your medical information is encrypted and securely stored in compliance with HIPAA regulations.
        </p>
      </div>
    </div>
  );
}
