'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

interface QuestionnaireResponse {
  id: string;
  templateName: string;
  submittedAt: string;
  status: 'completed' | 'partial' | 'pending';
  responses: {
    question: string;
    answer: string;
    flagged?: boolean;
  }[];
}

// Mock data for demonstration
const mockResponses: QuestionnaireResponse[] = [
  {
    id: 'resp-1',
    templateName: 'General Pre-Visit',
    submittedAt: '2025-11-22T10:30:00Z',
    status: 'completed',
    responses: [
      { question: 'What is the main reason for your visit today?', answer: 'Annual checkup and medication review' },
      { question: 'Are you currently experiencing any symptoms?', answer: 'Mild headaches occasionally', flagged: true },
      { question: 'Have you had any changes in your medications?', answer: 'No changes' },
      { question: 'Do you have any allergies we should be aware of?', answer: 'Penicillin allergy' },
      { question: 'How would you rate your overall health?', answer: 'Good' },
      { question: 'Have you been hospitalized in the past year?', answer: 'No' },
    ]
  },
  {
    id: 'resp-2',
    templateName: 'Symptom Assessment',
    submittedAt: '2025-11-20T14:15:00Z',
    status: 'completed',
    responses: [
      { question: 'Primary symptom', answer: 'Persistent cough' },
      { question: 'Duration of symptoms', answer: '2 weeks', flagged: true },
      { question: 'Severity (1-10)', answer: '6' },
      { question: 'Any associated symptoms?', answer: 'Slight fever, fatigue' },
    ]
  }
];

export default function CarePrepResponsesPage({ params }: { params: { patientId: string } }) {
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<QuestionnaireResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading responses
    setTimeout(() => {
      setResponses(mockResponses);
      setIsLoading(false);
    }, 500);
  }, [params.patientId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/provider/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">CarePrep Responses</h1>
          <p className="text-gray-600">Patient ID: {params.patientId}</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Responses Yet</h3>
            <p className="text-gray-500 mb-4">This patient hasn't submitted any CarePrep questionnaires.</p>
            <Link href={`/careprep/send/${params.patientId}`}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Send Questionnaire
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Response List */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Submitted Questionnaires</h2>
            {responses.map((response) => (
              <Card
                key={response.id}
                className={`cursor-pointer transition-all ${
                  selectedResponse?.id === response.id
                    ? 'border-2 border-purple-500 bg-purple-50'
                    : 'hover:border-purple-300'
                }`}
                onClick={() => setSelectedResponse(response)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{response.templateName}</h3>
                    {getStatusBadge(response.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(response.submittedAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {response.responses.length} responses
                    {response.responses.some(r => r.flagged) && (
                      <span className="ml-2 text-amber-600">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Has flagged items
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Response Details */}
          <div>
            {selectedResponse ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedResponse.templateName}</CardTitle>
                  <CardDescription>
                    Submitted on {formatDate(selectedResponse.submittedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedResponse.responses.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          item.flagged ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {item.flagged && (
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{item.question}</p>
                            <p className="mt-1 text-gray-900">{item.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="p-12 text-center flex flex-col items-center justify-center h-full">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">Select a questionnaire to view responses</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <Link href="/provider/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
        <Link href={`/careprep/send/${params.patientId}`}>
          <Button className="bg-purple-600 hover:bg-purple-700">
            Send New Questionnaire
          </Button>
        </Link>
      </div>
    </div>
  );
}
