"use client"

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Mic, StopCircle, Loader2, CheckCircle, XCircle, FileAudio } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Transcription {
  id: string;
  transcription_text: string;
  confidence_score: number;
  status: string;
  created_at: string;
  audio_duration_seconds?: number;
}

interface AudioTranscriptionProps {
  visitId: string;
  onTranscriptionComplete?: (transcription: Transcription) => void;
}

export default function AudioTranscription({ visitId, onTranscriptionComplete }: AudioTranscriptionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid audio file (WAV, MP3, WebM, OGG)');
        return;
      }

      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }

      setSelectedFile(file);
      toast.success('Audio file selected');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an audio file first');
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiClient.uploadAudioTranscription(visitId, selectedFile);
      const newTranscription = response.data;

      setTranscriptions(prev => [newTranscription, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Audio uploaded and transcription started!');

      if (onTranscriptionComplete) {
        onTranscriptionComplete(newTranscription);
      }
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload audio');
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

        setSelectedFile(audioFile);
        toast.success('Recording saved. Click Upload to transcribe.');

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const loadTranscriptions = async () => {
    try {
      const response = await apiClient.getVisitTranscriptions(visitId);
      setTranscriptions(response.data);
    } catch (error) {
      console.error('Error loading transcriptions:', error);
    }
  };

  React.useEffect(() => {
    loadTranscriptions();
  }, [visitId]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileAudio className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="info">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Transcription</CardTitle>
          <CardDescription>
            Upload an audio file or record audio to generate transcription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Upload Audio File</label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Record Audio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Record Audio</label>
            <div className="flex gap-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  variant="outline"
                  className="flex-1"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-red-600 animate-pulse">
                <div className="h-2 w-2 bg-red-600 rounded-full" />
                Recording in progress...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcriptions List */}
      {transcriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transcriptions ({transcriptions.length})</CardTitle>
            <CardDescription>
              View all transcriptions for this visit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(transcription.status)}
                    <span className="font-medium text-gray-900">
                      {new Date(transcription.created_at).toLocaleString()}
                    </span>
                  </div>
                  {getStatusBadge(transcription.status)}
                </div>

                {transcription.status === 'COMPLETED' && transcription.transcription_text && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {transcription.confidence_score && (
                        <span>Confidence: {transcription.confidence_score}%</span>
                      )}
                      {transcription.audio_duration_seconds && (
                        <span>Duration: {transcription.audio_duration_seconds}s</span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {transcription.transcription_text}
                      </p>
                    </div>
                  </div>
                )}

                {transcription.status === 'PROCESSING' && (
                  <p className="text-sm text-gray-600">
                    Transcription is being processed. This may take a few moments...
                  </p>
                )}

                {transcription.status === 'FAILED' && (
                  <p className="text-sm text-red-600">
                    Transcription failed. Please try uploading the audio again.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
