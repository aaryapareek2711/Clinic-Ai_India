'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, ArrowLeft, Send, Eye } from 'lucide-react';
import Link from 'next/link';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';

export default function CarePrepPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: '/clinic/dashboard' },
          { label: 'CarePrep Center' },
        ]}
        className="mb-3"
      />
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clinic/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">CarePrep Management</h1>
          <p className="text-gray-600">Send and manage pre-visit questionnaires</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            CarePrep Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Use this page as the single hub for intake actions: send questionnaire and review responses.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Recommended flow: <strong>Appointments Center</strong> to schedule first, then <strong>send CarePrep</strong>.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Send Questionnaire</h3>
            <p className="text-sm text-gray-500 mb-4">Open dashboard queue and send intake for a selected patient.</p>
            <Link href="/clinic/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-700" leftIcon={<Send className="w-4 h-4" />}>
                Open Dashboard Queue
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">View Responses</h3>
            <p className="text-sm text-gray-500 mb-4">Open response history from the selected patient/visit card.</p>
            <Link href="/clinic/dashboard">
              <Button variant="outline" leftIcon={<Eye className="w-4 h-4" />}>
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
