'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Calendar, User, FileText, Download } from 'lucide-react';
import Link from 'next/link';

interface CarePrepSummaryPageProps {
    params: {
        token: string;
    };
}

interface SummaryData {
    patient_info: {
        first_name: string;
        last_name: string;
    };
    appointment: {
        date: string | null;
        provider_id: string | null;
    };
    submission: any;
    status: string;
}

export default function CarePrepSummaryPage({ params }: CarePrepSummaryPageProps) {
    const { token } = params;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SummaryData | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch(`/api/careprep/forms/summary/${token}`);
                if (!res.ok) {
                    throw new Error('Failed to load summary');
                }
                const summaryData = await res.json();
                setData(summaryData);
            } catch (err: any) {
                setError(err.message || 'Error loading summary');
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-600">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Success Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">You're All Set!</h1>
                    <p className="text-lg text-gray-600">
                        Thank you, {data?.patient_info.first_name}. Your information has been received.
                    </p>
                </div>

                {/* Appointment Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Appointment Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Patient</p>
                                <p className="font-semibold">{data?.patient_info.first_name} {data?.patient_info.last_name}</p>
                            </div>
                            {data?.appointment.date && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Date & Time</p>
                                    <p className="font-semibold">
                                        {new Date(data.appointment.date).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Submission Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Submission Summary
                        </CardTitle>
                        <CardDescription>
                            Here's what you shared with us. You can edit this information using the same link until your appointment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {data?.submission?.symptom_checker_data?.symptoms && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Reason for Visit</h3>
                                <div className="bg-gray-50 p-3 rounded-md text-gray-700">
                                    {data.submission.symptom_checker_data.symptoms[0]?.description || 'No details provided'}
                                </div>
                            </div>
                        )}

                        {data?.submission?.medical_history_data && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Medications</h3>
                                    <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-sm">
                                        {data.submission.medical_history_data.medications?.[0]?.name || 'None listed'}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Allergies</h3>
                                    <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-sm">
                                        {data.submission.medical_history_data.allergies?.[0]?.name || 'None listed'}
                                    </div>
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                    <Link href={`/careprep/form/${token}`}>
                        <Button variant="outline">Edit Responses</Button>
                    </Link>
                    <Button variant="default" onClick={() => window.print()}>
                        <Download className="mr-2 h-4 w-4" />
                        Save for Records
                    </Button>
                </div>

            </div>
        </div>
    );
}
