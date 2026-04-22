"use client"

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Mic, Pause, Play, StopCircle, Loader2, CheckCircle, XCircle, FileAudio } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Transcription {
  id: string;
  transcription_text: string;
  confidence_score: number;
  status: string;
  created_at: string;
  audio_duration_seconds?: number;
  diarized_turns?: Array<{ speaker: string; text: string }>;
}

interface AudioTranscriptionProps {
  visitId: string;
  patientId: string;
  onTranscriptionComplete?: (transcription: Transcription) => void;
}

export default function AudioTranscription({ visitId, patientId, onTranscriptionComplete }: AudioTranscriptionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const normalizeTurns = (turns: any[]): Array<{ speaker: string; text: string }> => {
    if (!Array.isArray(turns)) return [];
    return turns
      .map((turn) => {
        // Handles diarization rows like { "Doctor": "..." } or { "Patient": "..." }
        if (turn && typeof turn === 'object' && !Array.isArray(turn)) {
          const keys = Object.keys(turn);
          if (keys.length === 1 && typeof (turn as any)[keys[0]] === 'string') {
            return {
              speaker: String(keys[0] || 'Speaker'),
              text: String((turn as any)[keys[0]] || '').trim(),
            };
          }
        }
        const speakerRaw = turn?.speaker || turn?.role || turn?.speaker_label || turn?.name || 'Speaker';
        const textRaw = turn?.utterance || turn?.text || turn?.content || turn?.message || '';
        return {
          speaker: String(speakerRaw || 'Speaker'),
          text: String(textRaw || '').trim(),
        };
      })
      .filter((turn) => turn.text.length > 0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading || isProcessing || isRecording) return;
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid audio file (WAV, MP3, WebM, OGG, M4A)');
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
    if (!patientId) {
      toast.error('Patient ID missing');
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiClient.uploadVisitTranscription(patientId, visitId, selectedFile);
      const newTranscription: Transcription = {
        id: response?.job_id || response?.message_id || `job-${Date.now()}`,
        transcription_text: '',
        confidence_score: 0,
        status: 'PROCESSING',
        created_at: new Date().toISOString(),
      };
      setTranscriptions(prev => [newTranscription, ...prev]);
      setIsProcessing(true);
      setProcessingMessage('Transcription queued...');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Audio uploaded to transcript route');

      if (onTranscriptionComplete) {
        onTranscriptionComplete(newTranscription);
      }

      await refreshFromBackend(newTranscription.id, true);
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      const detail = error.response?.data?.detail;
      if (detail === 'PREVISIT_MISSING') {
        toast.error('Cannot transcribe yet: intake/previsit summary is missing.');
      } else {
        toast.error(detail || error.message || 'Failed to upload audio');
      }
    } finally {
      setIsProcessing(false);
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
      setIsPaused(false);
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
      setIsPaused(false);
      toast.success('Recording stopped');
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording || isPaused) return;
    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.success('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current || !isRecording || !isPaused) return;
    if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.success('Recording resumed');
    }
  };

  const refreshFromBackend = async (fallbackId?: string, waitUntilDone: boolean = false) => {
    const start = Date.now();
    const timeoutMs = 3 * 60 * 1000;
    do {
      const status = await apiClient.getVisitTranscriptionStatus(patientId, visitId);
      const normalized = String(status?.status || '').toLowerCase();
      const message = String(status?.message || 'Transcription processing...');
      setProcessingMessage(message);

      // No active transcription yet — but dialogue may still exist (e.g. status lag). Try transcript fetch.
      if (!waitUntilDone && (normalized === '' || normalized === 'pending' || normalized === 'not_started')) {
        try {
          const dialogue = await apiClient.getVisitDialogue(patientId, visitId);
          if (dialogue.status === 200 && String(dialogue?.data?.transcript || '').trim()) {
            const inferredId = String(
              (dialogue.data as any)?.transcription_id ||
                status?.transcription_id ||
                fallbackId ||
                `visit-${visitId}`
            );
            const base: Transcription = {
              id: inferredId,
              transcription_text: String(dialogue.data.transcript),
              confidence_score: 0,
              status: 'COMPLETED',
              created_at: (dialogue.data as any)?.started_at || status?.started_at || new Date().toISOString(),
              audio_duration_seconds: (dialogue.data as any)?.audio_duration_seconds ?? status?.audio_duration_seconds,
            };
            let diarizedTurns = normalizeTurns((dialogue.data as any)?.structured_dialogue || []);
            if (!diarizedTurns.length) {
              try {
                const structured = await apiClient.structureVisitDialogue(patientId, visitId);
                diarizedTurns = normalizeTurns(structured?.dialogue || []);
              } catch {
                // keep plain transcript
              }
            }
            base.diarized_turns = diarizedTurns;
            setTranscriptions([base]);
            setIsProcessing(false);
            if (onTranscriptionComplete) onTranscriptionComplete(base);
            return;
          }
        } catch {
          // fall through to empty state
        }
        setTranscriptions([]);
        setIsProcessing(false);
        return;
      }

      const inferredId = String(status?.transcription_id || fallbackId || `job-${Date.now()}`);
      const base: Transcription = {
        id: inferredId,
        transcription_text: '',
        confidence_score: 0,
        status: normalized === 'completed' ? 'COMPLETED' : normalized === 'failed' ? 'FAILED' : 'PROCESSING',
        created_at: status?.started_at || new Date().toISOString(),
        audio_duration_seconds: status?.audio_duration_seconds,
      };

      if (normalized === 'completed') {
        const dialogue = await apiClient.getVisitDialogue(patientId, visitId);
        base.transcription_text = String(dialogue?.data?.transcript || '');
        let diarizedTurns = normalizeTurns(dialogue?.data?.structured_dialogue || []);
        if (!diarizedTurns.length) {
          try {
            const structured = await apiClient.structureVisitDialogue(patientId, visitId);
            diarizedTurns = normalizeTurns(structured?.dialogue || []);
          } catch {
            // Non-blocking: keep plain transcript view when structuring is unavailable.
          }
        }
        base.diarized_turns = diarizedTurns;
        setTranscriptions([base]);
        setIsProcessing(false);
        if (onTranscriptionComplete) onTranscriptionComplete(base);
        return;
      }

      if (normalized === 'failed' || normalized === 'stale_processing') {
        setTranscriptions([base]);
        setIsProcessing(false);
        throw new Error(String(status?.error || status?.error_message || 'Transcription failed'));
      }

      setTranscriptions([base]);
      setIsProcessing(['queued', 'processing', 'stale_processing', 'pending'].includes(normalized));
      if (!waitUntilDone) return;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } while (Date.now() - start < timeoutMs);

    setIsProcessing(false);
    throw new Error('Timed out waiting for transcription');
  };

  const loadTranscriptions = async () => {
    try {
      await refreshFromBackend(undefined, false);
    } catch {
      // no active transcription session yet
    }
  };

  React.useEffect(() => {
    loadTranscriptions();
  }, [visitId, patientId]);

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
        return <Badge variant="danger">Failed</Badge>;
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
                disabled={isUploading || isProcessing || isRecording}
                className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || isProcessing || isRecording}
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
                  disabled={isUploading || isProcessing || !!selectedFile}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="danger"
                  className="flex-1"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}
            </div>
            {isRecording && (
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${isPaused ? 'text-amber-600' : 'text-red-600 animate-pulse'}`}>
                  <div className={`h-2 w-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-600'}`} />
                  {isPaused ? 'Recording paused' : 'Recording in progress...'}
                </div>
                <div className="flex gap-2">
                  {!isPaused ? (
                    <Button variant="outline" size="sm" onClick={pauseRecording}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={resumeRecording}>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            )}
            {isProcessing && (
              <p className="text-sm text-blue-700">{processingMessage || 'Transcription processing...'}</p>
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

                {transcription.status.toLowerCase() === 'completed' && transcription.transcription_text && (
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
                      {(transcription.diarized_turns || []).length > 0 ? (
                        <div className="space-y-2">
                          {(transcription.diarized_turns || []).map((turn, idx) => (
                            <div key={`${transcription.id}-turn-${idx}`} className="text-sm text-gray-900">
                              <span className="font-semibold text-blue-700 mr-2">{turn.speaker}:</span>
                              <span className="whitespace-pre-wrap">{turn.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {transcription.transcription_text}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {transcription.status.toLowerCase() === 'processing' && (
                  <p className="text-sm text-gray-600">
                    Transcription is being processed. This may take a few moments...
                  </p>
                )}

                {transcription.status.toLowerCase() === 'failed' && (
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
