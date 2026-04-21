"use client";

import React, { useRef, useState } from 'react';
import type { Transcription, TranscriptionStatus } from '@/lib/types/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileAudio, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';

interface TranscriptionManagerProps {
  transcriptions: Transcription[];
  onUpload: (file: File) => Promise<void>;
  onGenerate: (transcriptionId: string) => Promise<void>;
  isUploading: boolean;
  isGenerating: boolean;
  activeTranscriptionId: string | null;
}

const statusConfig: Record<TranscriptionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-700',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function TranscriptionManager({
  transcriptions,
  onUpload,
  onGenerate,
  isUploading,
  isGenerating,
  activeTranscriptionId,
}: TranscriptionManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    // Validate file type (audio files only)
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('File size must be less than 100MB');
      return;
    }

    await onUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const hasCompletedTranscription = transcriptions.some(t => t.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-blue-600" />
          Audio Transcription
        </CardTitle>
        <CardDescription>
          Upload audio recordings from the visit to generate transcriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />

          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-600">Uploading audio file...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop an audio file here, or
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: MP3, WAV, M4A (Max 100MB)
              </p>
            </>
          )}
        </div>

        {/* Transcriptions List */}
        {transcriptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Transcriptions ({transcriptions.length})</h3>
            {transcriptions.map((transcription) => {
              const config = statusConfig[transcription.status];
              const isActive = activeTranscriptionId === transcription.id;

              return (
                <div
                  key={transcription.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileAudio className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          Audio {transcription.id.slice(0, 8)}...
                        </p>
                        <Badge className={config.color}>
                          <span className="flex items-center gap-1">
                            {config.icon}
                            {config.label}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(transcription.created_at).toLocaleString()}
                      </p>
                      {transcription.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {transcription.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  {transcription.status === 'completed' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onGenerate(transcription.id)}
                      disabled={isGenerating}
                    >
                      {isActive && isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate SOAP Notes
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {transcriptions.length === 0 && !isUploading && (
          <p className="text-sm text-gray-500 text-center py-4">
            No transcriptions yet. Upload an audio file to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
