'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Calendar, AlertTriangle, Target, Pill, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PatientContextCard from '@/components/appoint-ready/PatientContextCard';
import RiskStratification from '@/components/appoint-ready/RiskStratification';
import CareGaps from '@/components/appoint-ready/CareGaps';
import axios from 'axios';
import toast from 'react-hot-toast';

interface PreVisitPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    patient: { id: string; name: string };
    time: string;
    reason: string;
    isNewPatient: boolean;
    careprepStatus: string;
  };
}

export default function PreVisitPrepModal({ isOpen, onClose, appointment }: PreVisitPrepModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'gaps'>('overview');
  const [isStarting, setIsStarting] = useState(false);

  const handleStartDocumentation = async () => {
    setIsStarting(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `/api/visits/from-appointment/${appointment.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/provider/visits/${response.data.id}`);
    } catch (error: any) {
      console.error('Error starting visit documentation:', error);
      toast.error(error.response?.data?.detail || 'Failed to start visit documentation');
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Patient Info', icon: User },
    { id: 'risk', label: 'Risk Assessment', icon: AlertTriangle },
    { id: 'gaps', label: 'Care Gaps', icon: Target },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{appointment.patient.name}</h2>
                <p className="text-blue-100 text-sm">Pre-Visit Preparation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Appointment Info */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-200" />
              <span>{appointment.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{appointment.reason}</span>
            </div>
            {appointment.isNewPatient && (
              <Badge className="bg-cyan-500 text-white">New Patient</Badge>
            )}
            {appointment.careprepStatus === 'completed' && (
              <Badge className="bg-green-500 text-white">CarePrep Complete</Badge>
            )}
            {appointment.careprepStatus === 'pending' && (
              <Badge className="bg-yellow-500 text-white">CarePrep Pending</Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[50vh]">
          {activeTab === 'overview' && (
            <PatientContextCard patientId={appointment.patient.id} />
          )}

          {activeTab === 'risk' && (
            <RiskStratification patientId={appointment.patient.id} />
          )}

          {activeTab === 'gaps' && (
            <CareGaps patientId={appointment.patient.id} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>ContextAI powered insights</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isStarting}
              onClick={handleStartDocumentation}
            >
              {isStarting ? 'Starting...' : 'Start Visit Documentation'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
