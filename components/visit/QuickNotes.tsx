'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, CheckCircle, Info, Sparkles } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface Task {
  id: string;
  title: string;
  category: string;
  priority: string;
  due_date: string;
}

interface QuickNotesProps {
  visitId: string;
  onTasksCreated?: (tasks: Task[]) => void;
}

const SHORTCUTS = [
  { code: '!followup', description: 'Schedule follow-up appointment', example: '!followup in 2 weeks' },
  { code: '!lab', description: 'Order laboratory test', example: '!lab lipid panel' },
  { code: '!imaging', description: 'Order imaging study', example: '!imaging chest x-ray' },
  { code: '!call', description: 'Call patient for follow-up', example: '!call if fever worsens' },
  { code: '!refer', description: 'Refer to specialist', example: '!refer cardiology' },
  { code: '!rx', description: 'Medication task/reminder', example: '!rx start metformin' },
  { code: '!review', description: 'Review results/records', example: '!review lab results' }
];

export default function QuickNotes({ visitId, onTasksCreated }: QuickNotesProps) {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [detectedShortcuts, setDetectedShortcuts] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Detect shortcuts in note content
    const shortcuts = SHORTCUTS.map(s => s.code).filter(code =>
      noteContent.toLowerCase().includes(code.toLowerCase())
    );
    setDetectedShortcuts(shortcuts);
  }, [noteContent]);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/api/ai-assistant/visits/${visitId}/quick-notes`,
        {
          content: noteContent
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { tasks_created, tasks } = response.data;

      if (tasks_created > 0) {
        toast.success(`Note saved! ${tasks_created} task${tasks_created > 1 ? 's' : ''} created.`);

        if (onTasksCreated && tasks) {
          onTasksCreated(tasks);
        }
      } else {
        toast.success('Note saved successfully');
      }

      setNoteContent('');
      setDetectedShortcuts([]);

    } catch (error: any) {
      console.error('Failed to save note:', error);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      toast.error(error.response?.data?.detail || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const insertShortcut = (shortcutCode: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = noteContent.substring(0, cursorPos);
    const textAfter = noteContent.substring(cursorPos);

    const newContent = `${textBefore}${shortcutCode} ${textAfter}`;
    setNoteContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = cursorPos + shortcutCode.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveNote();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Quick Notes</h3>
        </div>
        <button
          onClick={() => setShowShortcutHelp(!showShortcutHelp)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Info className="w-4 h-4" />
          Shortcuts
        </button>
      </div>

      {/* Shortcut Help Panel */}
      {showShortcutHelp && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-sm text-gray-800">Available Shortcuts</h4>
          </div>
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.code} className="flex items-start gap-3">
                <button
                  onClick={() => insertShortcut(shortcut.code)}
                  className="text-xs font-mono bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                >
                  {shortcut.code}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{shortcut.description}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Example: {shortcut.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3 italic">
            Tasks created from shortcuts are automatically added to your task list with patient context.
          </p>
        </div>
      )}

      {/* Detected Shortcuts Indicator */}
      {detectedShortcuts.length > 0 && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">
              Detected {detectedShortcuts.length} shortcut{detectedShortcuts.length > 1 ? 's' : ''}: {' '}
              <span className="font-mono font-semibold">
                {detectedShortcuts.join(', ')}
              </span>
            </p>
          </div>
          <p className="text-xs text-green-700 mt-1">
            Tasks will be created automatically when you save this note.
          </p>
        </div>
      )}

      {/* Note Input */}
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note about patient... Use shortcuts like !followup, !lab, !imaging to create tasks automatically."
          className="w-full h-40 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isSaving}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            {noteContent.length} characters • Ctrl+Enter to save
          </p>
          <p className="text-xs text-gray-500">
            Use shortcuts to auto-create tasks
          </p>
        </div>
      </div>

      {/* Example Notes */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 mb-2">Example Notes:</p>
        <div className="space-y-2">
          <button
            onClick={() => setNoteContent("Patient doing well, vitals stable. !followup in 2 weeks to review labs")}
            className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
          >
            "Patient doing well, vitals stable. <span className="font-mono text-blue-600">!followup</span> in 2 weeks to review labs"
          </button>
          <button
            onClick={() => setNoteContent("Suspect diabetes - !lab HbA1c and fasting glucose !call patient tomorrow with results")}
            className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
          >
            "Suspect diabetes - <span className="font-mono text-blue-600">!lab</span> HbA1c and fasting glucose <span className="font-mono text-blue-600">!call</span> patient tomorrow with results"
          </button>
          <button
            onClick={() => setNoteContent("Chest pain evaluation - !imaging chest x-ray !refer cardiology if abnormal")}
            className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
          >
            "Chest pain evaluation - <span className="font-mono text-blue-600">!imaging</span> chest x-ray <span className="font-mono text-blue-600">!refer</span> cardiology if abnormal"
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveNote}
        disabled={!noteContent.trim() || isSaving}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Saving Note...
          </span>
        ) : (
          `Save Note${detectedShortcuts.length > 0 ? ` & Create ${detectedShortcuts.length} Task${detectedShortcuts.length > 1 ? 's' : ''}` : ''}`
        )}
      </button>
    </div>
  );
}
