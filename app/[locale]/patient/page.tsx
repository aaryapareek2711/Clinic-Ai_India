'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import toast, { Toaster } from 'react-hot-toast';

interface AnalysisResult {
  severity: string;
  urgency: string;
  summary: string;
  recommendations: string[];
  possible_conditions: Array<{
    condition: string;
    probability: string;
    description: string;
  }>;
  next_steps: string[];
  red_flags?: string[];
}

export default function PatientPortal() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'patient') {
      toast.error('Access denied. Patient portal only.');
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await apiClient.analyzeSymptoms({
        symptoms,
        duration,
        severity,
      });

      setAnalysis(response.data);
      toast.success('Symptoms analyzed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to analyze symptoms');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated || user?.role !== 'patient') {
    return null;
  }

  const getSeverityColor = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
      case 'mild':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.full_name || user?.username}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Symptom Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">MedGenie PreVisit Symptom Checker</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe Your Symptoms
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="E.g., I have a headache and feel dizzy. I also have a fever."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[120px]"
                />
              </div>

              <Input
                label="Duration (Optional)"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="E.g., 3 days, 1 week"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="mild">Mild - Minor discomfort</option>
                  <option value="moderate">Moderate - Noticeable impact</option>
                  <option value="severe">Severe - Significant impact</option>
                </select>
              </div>

              <Button
                onClick={handleAnalyzeSymptoms}
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isAnalyzing}
              >
                Analyze Symptoms
              </Button>

              <p className="text-xs text-gray-500 text-center">
                This is not a substitute for professional medical advice. Always consult a healthcare provider.
              </p>
            </div>
          </div>

          {/* Analysis Results Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
            </div>

            {!analysis ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">Enter your symptoms and click "Analyze Symptoms" to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Severity & Urgency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border ${getSeverityColor(analysis.severity)}`}>
                    <p className="text-xs font-medium uppercase mb-1">Severity</p>
                    <p className="text-lg font-bold capitalize">{analysis.severity}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${getSeverityColor(analysis.urgency)}`}>
                    <p className="text-xs font-medium uppercase mb-1">Urgency</p>
                    <p className="text-lg font-bold capitalize">{analysis.urgency}</p>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700">{analysis.summary}</p>
                </div>

                {/* Red Flags */}
                {analysis.red_flags && analysis.red_flags.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-red-900 mb-2">Warning Signs</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                          {analysis.red_flags.map((flag, idx) => (
                            <li key={idx}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Possible Conditions */}
                {analysis.possible_conditions && analysis.possible_conditions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Possible Conditions</h3>
                    <div className="space-y-2">
                      {analysis.possible_conditions.map((condition, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-gray-900">{condition.condition}</h4>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {condition.probability}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{condition.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {analysis.next_steps && analysis.next_steps.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      {analysis.next_steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
