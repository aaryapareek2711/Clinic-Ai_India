"use client";

import React, { useState } from 'react';
import AudioTranscription from './AudioTranscription';
import SOAPNotesEditor from './SOAPNotesEditor';

interface VisitWorkflowProps {
  visitId: string;
}

export default function VisitWorkflow({ visitId }: VisitWorkflowProps) {
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);

  const handleTranscriptionComplete = (transcription: any) => {
    // When transcription completes, store its ID for SOAP generation
    setTranscriptionId(transcription.id);
  };

  return (
    <div className="space-y-6">
      {/* Audio Recording and Transcription */}
      <AudioTranscription
        visitId={visitId}
        onTranscriptionComplete={handleTranscriptionComplete}
      />

      {/* SOAP Notes Editor - shows after transcription */}
      {transcriptionId && (
        <SOAPNotesEditor
          visitId={visitId}
          transcriptId={transcriptionId}
        />
      )}
    </div>
  );
}
