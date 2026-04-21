'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CarePrepPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/provider/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">CarePrep Management</h1>
          <p className="text-gray-600">Send and manage pre-visit questionnaires</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            CarePrep Questionnaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            CarePrep questionnaires help gather patient information before their visit,
            allowing providers to be better prepared and make the most of appointment time.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Send New Questionnaire</h3>
                <p className="text-sm text-gray-500 mb-4">Send a CarePrep questionnaire to a patient</p>
                <Link href="/provider/dashboard">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Select Patient from Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">View Responses</h3>
                <p className="text-sm text-gray-500 mb-4">Review completed questionnaire responses</p>
                <Link href="/provider/dashboard">
                  <Button variant="outline">
                    View from Patient Context
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
