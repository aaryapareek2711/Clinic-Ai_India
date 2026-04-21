import { getCurrentUser } from "@/lib/auth/middleware";
import SymptomChecker from "@/components/previsit/SymptomChecker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";

export default async function SymptomsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patient/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Symptom Checker</h1>
          <p className="text-gray-600 mt-1">Tell us about your symptoms</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Pre-Visit Symptom Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Please describe your symptoms in detail. Our AI-powered system will help analyze your symptoms and provide guidance for your upcoming visit.
          </p>
          <SymptomChecker />
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> This symptom checker is not a substitute for professional medical advice.
          Please discuss all symptoms with your healthcare provider during your visit.
        </p>
      </div>
    </div>
  );
}
