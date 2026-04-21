"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Minus, Activity, Beaker } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface RelevantTestResultsProps {
  patientId: string;
}

interface TestResult {
  test_name: string;
  value: number | string;
  unit: string;
  reference_range: string;
  status: 'normal' | 'abnormal_high' | 'abnormal_low' | 'critical';
  date: string;
  trend?: 'up' | 'down' | 'stable';
  category: string;
}

interface TestResultsResponse {
  patient_id: string;
  results: TestResult[];
  abnormal_count: number;
  critical_count: number;
  last_updated: string;
}

export default function RelevantTestResults({ patientId }: RelevantTestResultsProps) {
  const [testResults, setTestResults] = useState<TestResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'abnormal'>('all');

  useEffect(() => {
    loadTestResults();
  }, [patientId]);

  const loadTestResults = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getTestResults(patientId);
      setTestResults(data);
    } catch (err: any) {
      console.error('Error loading test results:', err);
      toast.error('Failed to load test results');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'abnormal_high':
      case 'abnormal_low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'critical':
        return 'destructive';
      case 'abnormal_high':
      case 'abnormal_low':
        return 'warning';
      case 'normal':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical':
        return 'CRITICAL';
      case 'abnormal_high':
        return 'HIGH';
      case 'abnormal_low':
        return 'LOW';
      case 'normal':
        return 'NORMAL';
      default:
        return status.toUpperCase();
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const filteredResults = testResults?.results.filter(result =>
    filter === 'all' || result.status !== 'normal'
  ) || [];

  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading test results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!testResults || testResults.results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Beaker className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Test Results Available
          </h3>
          <p className="text-gray-600">
            No recent lab results found for this patient
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Beaker className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>Recent Test Results</CardTitle>
                <CardDescription>
                  Last updated: {new Date(testResults.last_updated).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {testResults.critical_count > 0 && (
                <Badge variant="destructive">
                  {testResults.critical_count} Critical
                </Badge>
              )}
              {testResults.abnormal_count > 0 && (
                <Badge variant="warning">
                  {testResults.abnormal_count} Abnormal
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Results ({testResults.results.length})
            </Button>
            <Button
              variant={filter === 'abnormal' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('abnormal')}
            >
              Abnormal Only ({testResults.abnormal_count + testResults.critical_count})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results by Category */}
      {Object.entries(groupedResults).map(([category, results]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg capitalize flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              {category.replace('_', ' ')}
            </CardTitle>
            <CardDescription>{results.length} test(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.status === 'critical'
                      ? 'border-red-300 bg-red-50'
                      : result.status.startsWith('abnormal')
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{result.test_name}</h4>
                        {result.trend && getTrendIcon(result.trend)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(result.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(result.status)}>
                      {getStatusLabel(result.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">Value</p>
                      <p className="text-lg font-bold text-gray-900">
                        {result.value} <span className="text-sm font-normal text-gray-600">{result.unit}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reference Range</p>
                      <p className="text-sm font-medium text-gray-900">{result.reference_range}</p>
                    </div>
                  </div>

                  {result.status === 'critical' && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-800">
                        <strong>Critical Value:</strong> Immediate clinical review recommended
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No {filter === 'abnormal' ? 'abnormal' : ''} results to display</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
