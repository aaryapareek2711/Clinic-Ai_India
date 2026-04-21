"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileAudio, FileText, Activity } from 'lucide-react';
import AudioTranscription from './AudioTranscription';
import SOAPNotesEditor from './SOAPNotesEditor';

interface VisitDocumentationProps {
  visitId: string;
}

export default function VisitDocumentation({ visitId }: VisitDocumentationProps) {
  const [latestTranscriptId, setLatestTranscriptId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('transcription');

  const handleTranscriptionComplete = (transcription: any) => {
    // When transcription is complete, update the latest transcript ID
    // and switch to SOAP notes tab
    if (transcription.status === 'COMPLETED') {
      setLatestTranscriptId(transcription.id);
      setActiveTab('soap');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visit Documentation</CardTitle>
          <CardDescription>
            Record audio, generate transcriptions, and create SOAP notes with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-lg">
              <TabsTrigger value="transcription">
                <FileAudio className="h-4 w-4 mr-2" />
                Transcription
              </TabsTrigger>
              <TabsTrigger value="soap">
                <FileText className="h-4 w-4 mr-2" />
                SOAP Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcription" className="mt-6">
              <AudioTranscription
                visitId={visitId}
                onTranscriptionComplete={handleTranscriptionComplete}
              />
            </TabsContent>

            <TabsContent value="soap" className="mt-6">
              <SOAPNotesEditor
                visitId={visitId}
                transcriptId={latestTranscriptId}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">How to Use Visit Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Upload or Record Audio</p>
              <p className="text-sm text-blue-700">
                Either upload a pre-recorded audio file or use the microphone to record the clinical visit in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Automatic Transcription</p>
              <p className="text-sm text-blue-700">
                The audio will be automatically transcribed using AI. You can view the transcription text once processing is complete.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Generate SOAP Notes</p>
              <p className="text-sm text-blue-700">
                Navigate to the SOAP Notes tab and click "Generate from Transcription" to automatically create structured clinical notes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div>
              <p className="font-medium">Edit and Refine</p>
              <p className="text-sm text-blue-700">
                Review and edit each SOAP section. Use the AI refinement feature to improve clarity, add detail, or adjust the tone.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              5
            </div>
            <div>
              <p className="font-medium">Save Documentation</p>
              <p className="text-sm text-blue-700">
                Click "Save Notes" to persist the SOAP notes to the patient's visit record. These notes become part of the permanent medical record.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
