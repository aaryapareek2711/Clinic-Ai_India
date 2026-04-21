"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Symptom {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  description?: string;
}

interface SymptomAnalysisResponse {
  urgency: string;
  severity: string;
  triage_level: number;
  chief_complaint: string;
  summary: string;
  possible_conditions: string[];
  recommendations: string[];
  red_flags: string[];
  follow_up: string;
}

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState<Symptom>({
    name: '',
    severity: 'mild',
    duration: '',
    description: '',
  });
  const [analysis, setAnalysis] = useState<SymptomAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addSymptom = () => {
    if (!currentSymptom.name.trim() || !currentSymptom.duration.trim()) {
      toast.error('Please enter symptom name and duration');
      return;
    }

    setSymptoms([...symptoms, currentSymptom]);
    setCurrentSymptom({
      name: '',
      severity: 'mild',
      duration: '',
      description: '',
    });
    toast.success('Symptom added');
  };

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
    toast.success('Symptom removed');
  };

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) {
      toast.error('Please add at least one symptom');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiClient.analyzeSymptoms({ symptoms });
      setAnalysis(response);
      toast.success('Analysis complete');
    } catch (error: any) {
      console.error('Error analyzing symptoms:', error);
      toast.error(error.response?.data?.detail || 'Failed to analyze symptoms');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'mild':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'severe':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'low':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'high':
      case 'urgent':
      case 'emergency':
        return 'destructive';
      default:
        return 'info';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Symptom Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add Your Symptoms</CardTitle>
          <CardDescription>
            Describe your symptoms to help us assess your condition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symptom-name">Symptom Name *</Label>
              <Input
                id="symptom-name"
                placeholder="e.g., Headache"
                value={currentSymptom.name}
                onChange={(e) => setCurrentSymptom({ ...currentSymptom, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={currentSymptom.severity}
                onValueChange={(value: any) => setCurrentSymptom({ ...currentSymptom, severity: value })}
              >
                <SelectTrigger id="severity">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                placeholder="e.g., 2 days"
                value={currentSymptom.duration}
                onChange={(e) => setCurrentSymptom({ ...currentSymptom, duration: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Additional Details (Optional)</Label>
              <Input
                id="description"
                placeholder="Describe the symptom..."
                value={currentSymptom.description}
                onChange={(e) => setCurrentSymptom({ ...currentSymptom, description: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={addSymptom} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Symptom
          </Button>

          {/* Symptoms List */}
          {symptoms.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Your Symptoms ({symptoms.length})</h3>
              {symptoms.map((symptom, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{symptom.name}</span>
                      <Badge variant={getSeverityColor(symptom.severity)}>
                        {symptom.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Duration: {symptom.duration}
                      {symptom.description && ` • ${symptom.description}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSymptom(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                onClick={analyzeSymptoms}
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Analyze Symptoms
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Analysis Results</CardTitle>
              <Badge variant={getUrgencyColor(analysis.urgency)}>
                {analysis.urgency.toUpperCase()} PRIORITY
              </Badge>
            </div>
            <CardDescription>{analysis.chief_complaint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-700">{analysis.summary}</p>
            </div>

            {/* Triage Level */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Triage Level</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{analysis.triage_level}</span>
                <span className="text-gray-600">
                  (1 = Emergency, 5 = Routine)
                </span>
              </div>
            </div>

            {/* Possible Conditions */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Possible Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.possible_conditions.map((condition, index) => (
                  <Badge key={index} variant="secondary">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
              <ul className="list-disc list-inside space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-gray-700">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags */}
            {analysis.red_flags.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">
                      Warning Signs to Watch For
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.red_flags.map((flag, index) => (
                        <li key={index} className="text-red-800">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Follow-up</h3>
              <p className="text-blue-800">{analysis.follow_up}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
