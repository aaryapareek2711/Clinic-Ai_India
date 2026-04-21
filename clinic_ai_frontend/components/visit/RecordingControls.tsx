"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, FileText, Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface RecordingControlsProps {
  patientId: string;
  visitId: string;
  onTranscriptionComplete?: (transcriptionJobId: string, transcriptionText: string) => void;
  onGenerateSOAP?: () => void;
}

export default function RecordingControls({
  patientId,
  visitId,
  onTranscriptionComplete,
  onGenerateSOAP
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Start visualization
      visualize();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      });

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setLiveTranscript('');
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  // Visualize audio
  const visualize = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume (0-100)
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const volume = Math.round((average / 255) * 100);

      // Update visualization (you can use this value for visual feedback)
      // For now, we'll just use it to confirm audio is being captured
    };

    draw();
  };

  // Upload and transcribe
  const uploadAndTranscribe = async () => {
    if (!patientId) {
      toast.error('Patient ID missing for transcription upload');
      return;
    }
    if (!audioBlob) {
      toast.error('No recording available');
      return;
    }

    setIsProcessing(true);
    try {
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      const upload = await apiClient.uploadVisitTranscription(patientId, visitId, audioFile);
      const jobId = String(upload?.job_id || upload?.message_id || '');
      if (!jobId) {
        throw new Error('Transcription job id missing from upload response');
      }

      setTranscriptionId(jobId);
      setLiveTranscript('Processing transcription...');
      toast.success('Audio uploaded. Transcription queued.');

      const start = Date.now();
      const timeoutMs = 3 * 60 * 1000;
      while (Date.now() - start < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const status = await apiClient.getVisitTranscriptionStatus(patientId, visitId);
        const normalized = String(status?.status || '').toLowerCase();
        if (normalized === 'failed') {
          throw new Error(String(status?.error || status?.error_message || 'Transcription failed'));
        }
        if (normalized === 'completed') {
          const dialogueResponse = await apiClient.getVisitDialogue(patientId, visitId);
          const dialogueData = dialogueResponse.data || {};
          const transcriptText = String(dialogueData.transcript || '').trim();
          setLiveTranscript(transcriptText || 'Transcription completed');
          if (onTranscriptionComplete) {
            onTranscriptionComplete(jobId, transcriptText);
          }
          if (onGenerateSOAP) {
            toast.success('Transcription complete! Click "Generate SOAP Notes".');
          }
          return;
        }
      }

      throw new Error('Timed out waiting for transcription completion');
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to upload audio');
      setLiveTranscript('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Discard recording
  const discardRecording = () => {
    setAudioBlob(null);
    setLiveTranscript('');
    setTranscriptionId(null);
    setRecordingTime(0);
    toast.success('Recording discarded');
  };

  // Render idle state (no recording)
  if (!isRecording && !audioBlob) {
    return (
      <Button
        onClick={startRecording}
        variant="default"
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        <Mic className="mr-2 h-4 w-4" />
        Record
      </Button>
    );
  }

  // Render active recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
        <Button
          onClick={stopRecording}
          variant="destructive"
          size="sm"
        >
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>

        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-900">
            Recording... {formatTime(recordingTime)}
          </span>
        </div>

        {/* Audio visualizer - pulsing dots */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-600 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render post-recording state (recording stopped, ready to process)
  if (audioBlob && !liveTranscript) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={discardRecording}
          variant="outline"
          size="sm"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Discard & Re-record
        </Button>

        <Button
          onClick={uploadAndTranscribe}
          disabled={isProcessing}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Transcribe Recording
            </>
          )}
        </Button>

        <span className="text-sm text-gray-600">
          Duration: {formatTime(recordingTime)}
        </span>
      </div>
    );
  }

  // Render post-transcription state (transcription available)
  if (liveTranscript) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={discardRecording}
            variant="outline"
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Discard
          </Button>

          <Button
            onClick={onGenerateSOAP}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate SOAP Notes
          </Button>

          <span className="text-sm text-green-600 font-medium">
            ✓ Transcription ready
          </span>
        </div>

        {/* Live transcription preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-blue-900 mb-2">Transcription Preview:</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {liveTranscript}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
