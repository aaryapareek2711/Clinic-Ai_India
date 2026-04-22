"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface VitalsFormPanelProps {
  patientId: string;
  visitId: string;
}

interface VitalsField {
  key: string;
  label: string;
  field_type: string;
  unit?: string;
  required: boolean;
}

export default function VitalsFormPanel({ patientId, visitId }: VitalsFormPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formId, setFormId] = useState<string>('');
  const [fields, setFields] = useState<VitalsField[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!patientId || !visitId) return;
      setLoading(true);
      try {
        const [generated, submitTemplate, latest] = await Promise.all([
          apiClient.generateVitalsForm(patientId, visitId),
          apiClient.getVitalsSubmitTemplate(patientId, visitId).catch(() => null),
          apiClient.getLatestVitals(patientId, visitId).catch(() => null),
        ]);
        setFormId(String(submitTemplate?.form_id || generated.form_id || ''));
        setFields(generated.fields || []);

        const seededValues: Record<string, string> = {};
        const selectedFlags: Record<string, boolean> = {};
        const fromTemplate = new Map((submitTemplate?.values || []).map((entry) => [entry.key, entry.value]));
        const fromLatest = latest?.values || {};

        for (const f of generated.fields || []) {
          const v = fromTemplate.get(f.key) ?? fromLatest[f.key] ?? '';
          seededValues[f.key] = v === null || v === undefined ? '' : String(v);
          selectedFlags[f.key] = Boolean(f.required || String(seededValues[f.key] || '').trim());
        }

        setValues(seededValues);
        setSelected(selectedFlags);
      } catch (error: any) {
        console.error('Failed to load vitals form:', error);
        toast.error(error?.response?.data?.detail || 'Failed to load vitals form');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId, visitId]);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const handleSubmit = async () => {
    const payloadValues = fields
      .filter((f) => selected[f.key])
      .map((f) => ({ key: f.key, value: values[f.key] ?? '' }));

    const missingRequired = fields.filter((f) => f.required && !String(values[f.key] || '').trim());
    if (missingRequired.length > 0) {
      toast.error(`Missing required vitals: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      await apiClient.submitVitals({
        patient_id: patientId,
        visit_id: visitId,
        form_id: formId || undefined,
        staff_name: 'Provider',
        values: payloadValues,
      });
      toast.success('Vitals saved successfully');
    } catch (error: any) {
      console.error('Failed to submit vitals:', error);
      toast.error(error?.response?.data?.detail || 'Failed to save vitals');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-600">Loading vitals form...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vitals Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-center border rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={Boolean(selected[field.key])}
                  disabled={field.required}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                />
                {field.label}
                {field.required && <span className="text-red-600">*</span>}
              </label>
              <Input
                value={values[field.key] || ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.unit ? `Value (${field.unit})` : 'Enter value'}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Selected vitals: {selectedCount} / {fields.length}
          </p>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Vitals'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
