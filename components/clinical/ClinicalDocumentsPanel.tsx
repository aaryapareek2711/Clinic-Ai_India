'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface ClinicalDocument {
  id: string;
  title: string;
  document_type: 'discharge_summary' | 'operative_report' | 'consultation' | 'referral' | 'lab_report' | 'imaging_report' | 'consent_form' | 'other';
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  upload_date: string;
  visit_id?: string;
  notes?: string;
  url?: string;
}

interface ClinicalDocumentsPanelProps {
  patientId: string;
  documents: ClinicalDocument[];
  visitId?: string;
  onUpload?: (file: File, metadata: { title: string; document_type: string; notes?: string }) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function ClinicalDocumentsPanel({
  patientId,
  documents,
  visitId,
  onUpload,
  onDelete,
  readOnly = false
}: ClinicalDocumentsPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    document_type: 'other',
    notes: ''
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, PNG, and DOC files are allowed');
        return;
      }

      setSelectedFile(file);
      // Auto-fill title from filename
      if (!uploadMetadata.title) {
        setUploadMetadata({ ...uploadMetadata, title: file.name.replace(/\.[^/.]+$/, "") });
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!uploadMetadata.title) {
      toast.error('Please enter a document title');
      return;
    }

    if (onUpload) {
      onUpload(selectedFile, uploadMetadata);
      toast.success('Document uploaded successfully');
      setIsUploading(false);
      setSelectedFile(null);
      setUploadMetadata({ title: '', document_type: 'other', notes: '' });
    } else {
      // Placeholder toast for MVP
      toast('🔌 Document Storage Integration Required\n\nThis feature requires:\n• Secure cloud storage (Azure Blob Storage)\n• Document encryption\n• Access control/audit logging\n\nCurrently in MVP phase.', {
        icon: '📁',
        duration: 5000
      });
    }
  };

  const handleGenerateDocument = () => {
    toast('🔌 Document Generation\n\nRequires integration with:\n• Medical document templates\n• Digital signature capability\n• PDF generation service\n\nFeature coming soon!', {
      icon: '📄',
      duration: 4000
    });
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'discharge_summary': return '📋';
      case 'operative_report': return '🏥';
      case 'consultation': return '👨‍⚕️';
      case 'referral': return '➡️';
      case 'lab_report': return '🧪';
      case 'imaging_report': return '🩻';
      case 'consent_form': return '✍️';
      default: return '📄';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, ClinicalDocument[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Clinical Documents</h3>
          <p className="text-sm text-gray-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} on file
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDocument}
            >
              📄 Generate Document
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploading(true)}
            >
              📤 Upload Document
            </Button>
          </div>
        )}
      </div>

      {/* Upload Form */}
      {isUploading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Upload Clinical Document</h4>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File *
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 cursor-pointer transition-colors text-center">
                  {selectedFile ? (
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-gray-600 text-xs mt-1">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Click to select file (PDF, JPG, PNG, DOC - max 10MB)
                    </p>
                  )}
                </div>
              </label>
              {selectedFile && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Document Title *"
              value={uploadMetadata.title}
              onChange={(e) => setUploadMetadata({ ...uploadMetadata, title: e.target.value })}
              placeholder="e.g., Lab Results - CBC"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type *
              </label>
              <select
                value={uploadMetadata.document_type}
                onChange={(e) => setUploadMetadata({ ...uploadMetadata, document_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="discharge_summary">Discharge Summary</option>
                <option value="operative_report">Operative Report</option>
                <option value="consultation">Consultation Note</option>
                <option value="referral">Referral</option>
                <option value="lab_report">Lab Report</option>
                <option value="imaging_report">Imaging Report</option>
                <option value="consent_form">Consent Form</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={uploadMetadata.notes}
              onChange={(e) => setUploadMetadata({ ...uploadMetadata, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes about this document..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              setIsUploading(false);
              setSelectedFile(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpload}>
              Upload Document
            </Button>
          </div>
        </div>
      )}

      {/* Documents List */}
      {Object.keys(groupedDocs).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedDocs).map(([type, docs]) => (
            <div key={type}>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-lg">{getDocumentIcon(type)}</span>
                {getDocumentTypeLabel(type)} ({docs.length})
              </h4>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getDocumentIcon(doc.document_type)}</span>
                          <div>
                            <h5 className="font-semibold text-gray-900">{doc.title}</h5>
                            <p className="text-xs text-gray-600 mt-1">
                              {doc.file_name} • {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.upload_date).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              By: {doc.uploaded_by}
                            </p>
                          </div>
                        </div>
                        {doc.notes && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            {doc.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (doc.url) {
                              window.open(doc.url, '_blank');
                            } else {
                              toast('Document viewing will be available after storage integration', {
                                icon: '📄'
                              });
                            }
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast('Download feature coming soon', { icon: '⬇️' })}
                        >
                          Download
                        </Button>
                        {!readOnly && (
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this document?')) {
                                onDelete?.(doc.id);
                                toast.success('Document deleted');
                              }
                            }}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No documents uploaded</p>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploading(true)}
              className="mt-3"
            >
              📤 Upload First Document
            </Button>
          )}
        </div>
      )}

      {/* Storage Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">MVP Version - Document Management</p>
            <p className="mt-1">
              Secure document storage requires Azure Blob Storage integration with encryption, access control, and audit logging.
              Current version provides UI structure for future implementation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
