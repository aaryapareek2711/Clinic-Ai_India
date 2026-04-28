'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FlowBreadcrumb from '@/components/workspace/FlowBreadcrumb';
import { localizedWorkspacePath, workspaceBaseFromPathname } from '@/lib/workspace/resolver';
import apiClient from '@/lib/api/client';

type LabItem = {
  record_id: string;
  visit_id: string;
  patient_id: string;
  source: string;
  status: string;
  raw_text: string;
  extracted_values: Array<{ label: string; value: number }>;
  flags: string[];
  doctor_decision?: string | null;
  continuity_summary?: string | null;
  updated_at?: string | null;
};

export default function FollowThroughPage() {
  const pathname = usePathname();
  const ws = workspaceBaseFromPathname(pathname);
  const withLocale = (href: string) => localizedWorkspacePath(pathname, href);
  const [items, setItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [visitId, setVisitId] = useState('');
  const [rawText, setRawText] = useState('');
  const [continuityByRecord, setContinuityByRecord] = useState<Record<string, string>>({});

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await apiClient.listLabFollowThroughQueue();
      setItems(response.items || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load follow-through queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const createLabRecord = async () => {
    if (!visitId.trim() || !rawText.trim()) {
      toast.error('Visit ID and lab text are required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.createLabRecord({ visit_id: visitId.trim(), source: 'whatsapp', raw_text: rawText.trim() });
      setVisitId('');
      setRawText('');
      toast.success('Lab record added to intake queue');
      await loadQueue();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add lab record');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <FlowBreadcrumb
        items={[
          { label: 'Clinic Dashboard', href: withLocale(`${ws}/dashboard`) },
          { label: 'Follow-through Center' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Follow-through Center</h1>
        <p className="mt-1 text-slate-600">Lab intake queue, extraction, doctor review, and continuity completion in one place.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff SOP checklist</CardTitle>
          <CardDescription>Use this sequence for every incoming lab result.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Add the inbound lab text with the correct visit ID (status should become <strong>received</strong>).</li>
            <li>Click <strong>Extract</strong> to parse values and review auto flags (status <strong>extracted</strong>).</li>
            <li>Doctor confirms and clicks <strong>Approve</strong> (status <strong>doctor_reviewed</strong>).</li>
            <li>Enter a concise continuity summary for follow-up context.</li>
            <li>Click <strong>Update continuity + complete visit</strong> to close follow-through (status <strong>continuity_updated</strong> and visit <strong>completed</strong>).</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lab intake queue</CardTitle>
          <CardDescription>Create inbound lab records received via WhatsApp and move them through the review lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Visit ID" value={visitId} onChange={(e) => setVisitId(e.target.value)} />
          <Input
            className="md:col-span-2"
            placeholder="Lab text from WhatsApp (e.g. Glucose 240, SpO2 90)"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <Button onClick={createLabRecord} disabled={creating} className="md:col-span-3">
            {creating ? 'Adding...' : 'Add lab record'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>N1 → N5 pipeline: receive, extract, review, continuity update, visit completion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-600">Loading follow-through queue...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-600">No lab records yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.record_id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.record_id}</p>
                    <p className="text-xs text-slate-500">Visit: {item.visit_id} • Status: {item.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={async () => { await apiClient.extractLabRecord(item.record_id); await loadQueue(); }}>
                      Extract
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await apiClient.reviewLabRecord(item.record_id, { decision: 'approved' });
                        await loadQueue();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const summary = continuityByRecord[item.record_id] || `Continuity updated from ${item.record_id}`;
                        await apiClient.updateContinuity(item.record_id, {
                          continuity_summary: summary,
                          mark_visit_completed: true,
                        });
                        await loadQueue();
                      }}
                    >
                      Update continuity + complete visit
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-700">{item.raw_text}</p>
                {item.flags?.length > 0 && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                    Flags: {item.flags.join(', ')}
                  </div>
                )}
                <Input
                  placeholder="Continuity summary"
                  value={continuityByRecord[item.record_id] || ''}
                  onChange={(e) =>
                    setContinuityByRecord((prev) => ({ ...prev, [item.record_id]: e.target.value }))
                  }
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
