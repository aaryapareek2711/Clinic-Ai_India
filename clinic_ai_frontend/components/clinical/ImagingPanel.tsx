'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface ImagingStudy {
  id: string;
  study_type: string;
  body_part: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'PET' | 'Nuclear Medicine' | 'Other';
  study_date: string;
  ordering_provider?: string;
  radiologist?: string;
  findings: string;
  impression: string;
  status: 'ordered' | 'scheduled' | 'completed' | 'cancelled';
  accession_number?: string;
  facility?: string;
  notes?: string;
}

interface ImagingPanelProps {
  patientId: string;
  studies: ImagingStudy[];
  onAddStudy?: (study: Omit<ImagingStudy, 'id'>) => void;
  onUpdateStudy?: (id: string, study: Partial<ImagingStudy>) => void;
  readOnly?: boolean;
}

export function ImagingPanel({
  patientId,
  studies,
  onAddStudy,
  onUpdateStudy,
  readOnly = false
}: ImagingPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newStudy, setNewStudy] = useState({
    study_type: '',
    body_part: '',
    modality: 'X-Ray' as const,
    study_date: new Date().toISOString().split('T')[0],
    findings: '',
    impression: '',
    status: 'completed' as const,
    notes: ''
  });

  const handleAddStudy = () => {
    if (!newStudy.study_type || !newStudy.body_part) {
      toast.error('Please fill in study type and body part');
      return;
    }

    if (onAddStudy) {
      onAddStudy(newStudy);
      toast.success('Imaging study added');
      setIsAdding(false);
      setNewStudy({
        study_type: '',
        body_part: '',
        modality: 'X-Ray',
        study_date: new Date().toISOString().split('T')[0],
        findings: '',
        impression: '',
        status: 'completed',
        notes: ''
      });
    }
  };

  const handleOrderImaging = () => {
    toast('🔌 Imaging Order Integration Required\n\nThis feature requires integration with:\n• PACS (Picture Archiving System)\n• RIS (Radiology Information System)\n• HL7/DICOM interfaces\n• Insurance pre-authorization\n\nCurrently in MVP phase - manual entry available.', {
      icon: '🩻',
      duration: 5000
    });
  };

  const handleViewDICOM = () => {
    toast('🔌 DICOM Viewer Integration\n\nRequires PACS integration to view actual imaging studies (DICOM files).', {
      icon: '🖼️',
      duration: 4000
    });
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'X-Ray': return '🩻';
      case 'CT': return '🔍';
      case 'MRI': return '🧲';
      case 'Ultrasound': return '🔊';
      case 'PET': return '☢️';
      default: return '📷';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completedStudies = studies.filter(s => s.status === 'completed');
  const pendingStudies = studies.filter(s => s.status === 'ordered' || s.status === 'scheduled');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Imaging & Diagnostics</h3>
          <p className="text-sm text-gray-600">
            {completedStudies.length} completed stud{completedStudies.length !== 1 ? 'ies' : 'y'} • {pendingStudies.length} pending
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDICOM}
            >
              🖼️ View Images
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOrderImaging}
            >
              🩻 Order Imaging
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              + Add Study
            </Button>
          </div>
        )}
      </div>

      {/* Add New Study Form */}
      {isAdding && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Add Imaging Study</h4>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Study Type *"
              value={newStudy.study_type}
              onChange={(e) => setNewStudy({ ...newStudy, study_type: e.target.value })}
              placeholder="e.g., Chest X-Ray"
            />
            <Input
              label="Body Part *"
              value={newStudy.body_part}
              onChange={(e) => setNewStudy({ ...newStudy, body_part: e.target.value })}
              placeholder="e.g., Chest"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modality *
              </label>
              <select
                value={newStudy.modality}
                onChange={(e) => setNewStudy({ ...newStudy, modality: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="X-Ray">X-Ray</option>
                <option value="CT">CT Scan</option>
                <option value="MRI">MRI</option>
                <option value="Ultrasound">Ultrasound</option>
                <option value="PET">PET Scan</option>
                <option value="Nuclear Medicine">Nuclear Medicine</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Study Date"
              type="date"
              value={newStudy.study_date}
              onChange={(e) => setNewStudy({ ...newStudy, study_date: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={newStudy.status}
                onChange={(e) => setNewStudy({ ...newStudy, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="ordered">Ordered</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Findings
            </label>
            <textarea
              value={newStudy.findings}
              onChange={(e) => setNewStudy({ ...newStudy, findings: e.target.value })}
              rows={3}
              placeholder="Detailed findings from the radiologist report..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impression
            </label>
            <textarea
              value={newStudy.impression}
              onChange={(e) => setNewStudy({ ...newStudy, impression: e.target.value })}
              rows={2}
              placeholder="Summary/interpretation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={newStudy.notes}
              onChange={(e) => setNewStudy({ ...newStudy, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddStudy}>
              Add Study
            </Button>
          </div>
        </div>
      )}

      {/* Completed Studies */}
      {completedStudies.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Completed Studies</h4>
          <div className="space-y-3">
            {completedStudies.map((study) => (
              <div
                key={study.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getModalityIcon(study.modality)}</span>
                      <div>
                        <h5 className="font-semibold text-gray-900">
                          {study.study_type} - {study.body_part}
                        </h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            {study.modality} • {new Date(study.study_date).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(study.status)}`}>
                            {study.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {study.accession_number && (
                      <p className="text-xs text-gray-500 mt-2">
                        Accession #: {study.accession_number}
                      </p>
                    )}

                    {study.findings && (
                      <div className="mt-3 bg-gray-50 rounded p-3">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                          Findings
                        </p>
                        <p className="text-sm text-gray-900">{study.findings}</p>
                      </div>
                    )}

                    {study.impression && (
                      <div className="mt-2 bg-blue-50 rounded p-3">
                        <p className="text-xs font-medium text-blue-900 uppercase tracking-wide mb-1">
                          Impression
                        </p>
                        <p className="text-sm text-blue-900 font-medium">{study.impression}</p>
                      </div>
                    )}

                    {study.notes && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        Note: {study.notes}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      {study.radiologist && <span>Radiologist: {study.radiologist}</span>}
                      {study.facility && <span>Facility: {study.facility}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewDICOM}
                    >
                      View Images
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Studies */}
      {pendingStudies.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Studies</h4>
          <div className="space-y-2">
            {pendingStudies.map((study) => (
              <div
                key={study.id}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getModalityIcon(study.modality)}</span>
                      <h5 className="font-medium text-gray-900">
                        {study.study_type} - {study.body_part}
                      </h5>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(study.status)}`}>
                        {study.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {study.modality} • Ordered: {new Date(study.study_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {studies.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No imaging studies recorded</p>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="mt-3"
            >
              + Add First Study
            </Button>
          )}
        </div>
      )}

      {/* PACS/RIS Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">MVP Version - Manual Entry</p>
            <p className="mt-1">
              Imaging ordering, DICOM image viewing, and PACS integration require specialized radiology systems.
              Current version supports manual documentation of imaging studies and reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
