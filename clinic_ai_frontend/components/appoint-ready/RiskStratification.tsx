"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertCircle, Heart, Activity } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface RiskStratificationProps {
  patientId: string;
}

interface RiskScore {
  risk_type: string;
  score: number;
  category: 'low' | 'moderate' | 'high' | 'very_high';
  factors: string[];
  recommendations: string[];
}

interface RiskAssessment {
  patient_id: string;
  assessed_at: string;
  risk_scores: RiskScore[];
  overall_risk_level: string;
}

export default function RiskStratification({ patientId }: RiskStratificationProps) {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRiskAssessment();
  }, [patientId]);

  const loadRiskAssessment = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getRiskAssessment(patientId);
      setAssessment(data);
    } catch (err: any) {
      console.error('Error loading risk assessment:', err);
      toast.error('Failed to load risk assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'low':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'high':
      case 'very_high':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRiskIcon = (riskType: string) => {
    if (riskType.toLowerCase().includes('cardiovascular')) {
      return <Heart className="h-5 w-5" />;
    }
    return <Activity className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading risk assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-600">
          No risk assessment available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Risk Level */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Risk Stratification</CardTitle>
                <CardDescription>
                  Assessed: {new Date(assessment.assessed_at).toLocaleString()}
                </CardDescription>
              </div>
            </div>
            <Badge variant={getRiskColor(assessment.overall_risk_level)} className="text-sm">
              {assessment.overall_risk_level.toUpperCase()} RISK
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Individual Risk Scores */}
      {assessment.risk_scores.map((risk, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRiskIcon(risk.risk_type)}
                <div>
                  <CardTitle className="text-lg capitalize">{risk.risk_type} Risk</CardTitle>
                  <CardDescription>Risk Score: {risk.score}/100</CardDescription>
                </div>
              </div>
              <Badge variant={getRiskColor(risk.category)}>
                {risk.category.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Score Bar */}
            <div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    risk.category === 'low'
                      ? 'bg-green-600'
                      : risk.category === 'moderate'
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${risk.score}%` }}
                ></div>
              </div>
            </div>

            {/* Risk Factors */}
            {risk.factors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Risk Factors
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {risk.factors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-gray-600">
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {risk.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">
                  Recommendations
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {risk.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-blue-800">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
