"use client";

import React, { useMemo, useState } from 'react';
import { mockDocuments } from '@/lib/mock/documents';
import { Document, DocumentCategory } from '@/lib/types/document';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Copy, Trash2 } from 'lucide-react';

export const MyNotesAndForms = () => {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const groupedDocuments = useMemo(() => {
    return documents.reduce((acc, doc) => {
      (acc[doc.category] = acc[doc.category] || []).push(doc);
      return acc;
    }, {} as Record<DocumentCategory, Document[]>);
  }, [documents]);

  const handleSelectDoc = (id: string) => {
    setSelectedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAllCategory = (docs: Document[]) => {
    const docIds = docs.map((d) => d.id);
    const allSelected = docIds.every((id) => selectedDocs.has(id));

    setSelectedDocs((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        docIds.forEach((id) => newSet.delete(id));
      } else {
        docIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const categoryOrder: DocumentCategory[] = ['Intake Forms', 'Progress Notes', 'Assessments', 'Treatment Plans'];

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const docs = groupedDocuments[category] || [];
        if (docs.length === 0) return null;

        return (
          <div key={category} className="border rounded-lg overflow-hidden">
            {/* Category Header */}
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  onCheckedChange={() => handleSelectAllCategory(docs)}
                  checked={docs.every((d) => selectedDocs.has(d.id))}
                />
                <h3 className="text-base font-semibold text-gray-900">{category}</h3>
              </div>
              <span className="text-xs text-gray-500">
                Use these templates to document appointment notes
              </span>
            </div>

            {/* Document List */}
            <div className="divide-y divide-gray-200">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      onCheckedChange={() => handleSelectDoc(doc.id)}
                      checked={selectedDocs.has(doc.id)}
                    />
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
                      {doc.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
