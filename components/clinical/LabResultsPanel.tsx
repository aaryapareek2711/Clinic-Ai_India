'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface LabResult {
  id: string;
  test_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  status: 'normal' | 'abnormal' | 'critical';
  date_collected: string;
  date_resulted: string;
  ordered_by?: string;
  lab_name?: string;
  notes?: string;
}

interface LabOrder {
  id: string;
  test_name: string;
  ordered_date: string;
  status: 'pending' | 'collected' | 'resulted' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
}

interface LabResultsPanelProps {
  patientId: string;
  results: LabResult[];
  orders: LabOrder[];
  onAddResult?: (result: Omit<LabResult, 'id'>) => void;
  onAddOrder?: (order: Omit<LabOrder, 'id'>) => void;
  readOnly?: boolean;
}

export function LabResultsPanel({
  patientId,
  results,
  orders,
  onAddResult,
  onAddOrder,
  readOnly = false
}: LabResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'orders'>('results');
  const [isAdding, setIsAdding] = useState(false);
  const [newResult, setNewResult] = useState({
    test_name: '',
    result_value: '',
    unit: '',
    reference_range: '',
    status: 'normal' as const,
    date_collected: new Date().toISOString().split('T')[0],
    date_resulted: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleAddResult = () => {
    if (!newResult.test_name || !newResult.result_value) {
      toast.error('Please fill in test name and result value');
      return;
    }

    if (onAddResult) {
      onAddResult(newResult);
      toast.success('Lab result added');
      setIsAdding(false);
      setNewResult({
        test_name: '',
        result_value: '',
        unit: '',
        reference_range: '',
        status: 'normal',
        date_collected: new Date().toISOString().split('T')[0],
        date_resulted: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  };

  const handleOrderLabs = () => {
    toast('🔌 Lab Ordering Integration Required\n\nThis feature requires integration with:\n• Lab Information System (LIS)\n• HL7/FHIR interfaces\n• Insurance pre-authorization\n\nCurrently in MVP phase - manual entry available.', {
      icon: '🧪',
      duration: 5000
    });
  };

  const handleImportResults = () => {
    toast('🔌 Lab Results Import\n\nRequires HL7/FHIR integration with lab systems for automatic result import.', {
      icon: '📥',
      duration: 4000
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'abnormal':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Laboratory Results</h3>
          <p className="text-sm text-gray-600">
            {results.length} result{results.length !== 1 ? 's' : ''} • {orders.filter(o => o.status === 'pending').length} pending order{orders.filter(o => o.status === 'pending').length !== 1 ? 's' : ''}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportResults}
            >
              📥 Import from Lab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOrderLabs}
            >
              🧪 Order Labs
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              + Add Result
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Results ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Add New Result Form */}
      {isAdding && activeTab === 'results' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Add Lab Result</h4>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Test Name *"
              value={newResult.test_name}
              onChange={(e) => setNewResult({ ...newResult, test_name: e.target.value })}
              placeholder="e.g., Hemoglobin A1c"
            />
            <Input
              label="Result Value *"
              value={newResult.result_value}
              onChange={(e) => setNewResult({ ...newResult, result_value: e.target.value })}
              placeholder="e.g., 6.5"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Unit"
              value={newResult.unit}
              onChange={(e) => setNewResult({ ...newResult, unit: e.target.value })}
              placeholder="e.g., %"
            />
            <Input
              label="Reference Range"
              value={newResult.reference_range}
              onChange={(e) => setNewResult({ ...newResult, reference_range: e.target.value })}
              placeholder="e.g., 4.0-5.6"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={newResult.status}
                onChange={(e) => setNewResult({ ...newResult, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="normal">Normal</option>
                <option value="abnormal">Abnormal</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date Collected"
              type="date"
              value={newResult.date_collected}
              onChange={(e) => setNewResult({ ...newResult, date_collected: e.target.value })}
            />
            <Input
              label="Date Resulted"
              type="date"
              value={newResult.date_resulted}
              onChange={(e) => setNewResult({ ...newResult, date_resulted: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={newResult.notes}
              onChange={(e) => setNewResult({ ...newResult, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes or interpretation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddResult}>
              Add Result
            </Button>
          </div>
        </div>
      )}

      {/* Results Tab Content */}
      {activeTab === 'results' && (
        <div>
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-gray-900">{result.test_name}</h5>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Result</p>
                          <p className="text-sm font-medium text-gray-900">
                            {result.result_value} {result.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reference Range</p>
                          <p className="text-sm text-gray-900">{result.reference_range || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Resulted Date</p>
                          <p className="text-sm text-gray-900">
                            {new Date(result.date_resulted).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {result.notes && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          Note: {result.notes}
                        </p>
                      )}
                      {result.lab_name && (
                        <p className="text-xs text-gray-500 mt-1">Lab: {result.lab_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No lab results recorded</p>
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAdding(true)}
                  className="mt-3"
                >
                  + Add First Result
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <div>
          {orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-gray-900">{order.test_name}</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Ordered: {new Date(order.ordered_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'collected' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'resulted' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {order.priority === 'stat' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          STAT
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No pending lab orders</p>
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOrderLabs}
                  className="mt-3"
                >
                  🧪 Order Labs
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* EHR Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">MVP Version - Manual Entry</p>
            <p className="mt-1">
              Lab ordering and automatic result import require LIS/FHIR integration.
              Current version supports manual lab result tracking for documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
