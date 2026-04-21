'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Calendar, User, ChevronRight, Stethoscope, FileText, ArrowLeft, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface CarePrepFormPageProps {
    params: {
        token: string;
    };
}

interface TokenContext {
    valid: boolean;
    patient_first_name: string;
    appointment: {
        id: string;
        date: string;
        provider_id: string;
    } | null;
    patient_id: string;
}

interface Question {
    id: string;
    type: 'scale' | 'select' | 'text' | 'boolean';
    question: string;
    options?: string[] | number[];
    required?: boolean;
}

export default function CarePrepFormPage({ params }: CarePrepFormPageProps) {
    const router = useRouter();
    const { token } = params;
    const t = useTranslations('patient.careprep');
    const tCommon = useTranslations('common');
    const locale = useLocale();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [context, setContext] = useState<TokenContext | null>(null);

    // Navigation State
    const [activeSection, setActiveSection] = useState<'general' | 'symptoms'>('general');
    const [completedSections, setCompletedSections] = useState<string[]>([]);

    // General Form State
    const [medications, setMedications] = useState('');
    const [allergies, setAllergies] = useState('');
    const [questions, setQuestions] = useState('');

    // Symptom Checker State
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [symptomStep, setSymptomStep] = useState<'input' | 'questions'>('input');

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Validate token and get context
                const contextRes = await fetch(`/api/careprep/forms/token/${token}`);
                if (!contextRes.ok) throw new Error('Invalid or expired link');
                const contextData = await contextRes.json();
                setContext(contextData);

                // 2. Get existing form data
                const formRes = await fetch(`/api/careprep/forms/form/${token}`);
                if (formRes.ok) {
                    const formData = await formRes.json();

                    // Pre-fill General
                    if (formData.medical_history_data) {
                        const hist = formData.medical_history_data;
                        if (hist.medications && hist.medications.length > 0) setMedications(hist.medications[0].name);
                        if (hist.allergies && hist.allergies.length > 0) setAllergies(hist.allergies[0].name);
                        if (hist.questions) setQuestions(hist.questions);
                        if (formData.medical_history_completed) setCompletedSections(prev => [...prev, 'general']);
                    }

                    // Pre-fill Symptoms
                    if (formData.symptom_checker_data) {
                        // In a real app, we would restore the full state
                        if (formData.symptom_checker_completed) setCompletedSections(prev => [...prev, 'symptoms']);
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load form');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [token]);

    const handleGenerateQuestions = async () => {
        if (!chiefComplaint.trim()) {
            toast.error("Please enter a reason for your visit");
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch(`/api/careprep/forms/form/${token}/generate-questionnaire`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chief_complaint: chiefComplaint })
            });

            if (!res.ok) throw new Error("Failed to generate questions");

            const data = await res.json();
            setGeneratedQuestions(data.questions);
            setSymptomStep('questions');
        } catch (err) {
            toast.error("Could not generate questions. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleGeneralSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                medical_history: {
                    medications: [{ name: medications }],
                    allergies: [{ name: allergies }],
                    questions: questions
                }
            };

            await submitData(payload);
            setCompletedSections(prev => prev.includes('general') ? prev : [...prev, 'general']);
            setActiveSection('symptoms');
            toast.success("General information saved");
        } catch (err) {
            toast.error("Failed to save");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSymptomSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                symptoms: {
                    chief_complaint: chiefComplaint,
                    answers: answers,
                    symptoms: [{ name: chiefComplaint, description: "Patient reported" }] // simplified
                }
            };

            await submitData(payload);
            setCompletedSections(prev => prev.includes('symptoms') ? prev : [...prev, 'symptoms']);
            toast.success("Symptom assessment completed");
            router.push(`/careprep/summary/${token}`);
        } catch (err) {
            toast.error("Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    const submitData = async (data: any) => {
        const res = await fetch(`/api/careprep/forms/form/${token}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to submit form');
        return res.json();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertCircle className="h-6 w-6" />
                        <CardTitle>{t('errors.invalid')?.split('.')[0] || 'Access Error'}</CardTitle>
                    </div>
                    <CardDescription>{t('errors.expired')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600">{t('errors.invalid')}</p>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                            <Stethoscope className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-gray-900">CarePrep</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        {/* Language Switcher for patient form */}
                        <LanguageSwitcher />
                        <span className="hidden sm:inline">Patient ID: {context?.patient_id.slice(0, 8)}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <h2 className="font-semibold text-gray-900 mb-4">{t('sections.medicalHistory')}</h2>
                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveSection('general')}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors",
                                        activeSection === 'general' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4" />
                                        {t('medicalHistory.title')}
                                    </div>
                                    {completedSections.includes('general') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                </button>
                                <button
                                    onClick={() => setActiveSection('symptoms')}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors",
                                        activeSection === 'symptoms' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Stethoscope className="h-4 w-4" />
                                        {t('symptoms.title')}
                                    </div>
                                    {completedSections.includes('symptoms') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                </button>
                            </nav>
                        </div>

                        {/* Context Card */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-3">Appointment Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <User className="h-4 w-4 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium">Patient</p>
                                        <p className="text-sm font-semibold text-gray-900">{context?.patient_first_name}</p>
                                    </div>
                                </div>
                                {context?.appointment && (
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-blue-600 font-medium">Date & Time</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {new Date(context.appointment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        {activeSection === 'general' && (
                            <Card className="shadow-sm border-gray-200">
                                <CardHeader>
                                    <CardTitle>{t('medicalHistory.title')}</CardTitle>
                                    <CardDescription>{t('medicalHistory.subtitle')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>{t('medicalHistory.medications')}</Label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            placeholder={t('medicalHistory.medicationsPlaceholder')}
                                            value={medications}
                                            onChange={(e) => setMedications(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('medicalHistory.allergies')}</Label>
                                        <Input
                                            placeholder={t('medicalHistory.allergiesPlaceholder')}
                                            value={allergies}
                                            onChange={(e) => setAllergies(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('symptoms.additionalNotes')}</Label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={questions}
                                            onChange={(e) => setQuestions(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-gray-50 border-t px-6 py-4 flex justify-end">
                                    <Button onClick={handleGeneralSubmit} disabled={submitting}>
                                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {tCommon('next')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {activeSection === 'symptoms' && (
                            <Card className="shadow-sm border-gray-200">
                                <CardHeader>
                                    <CardTitle>{t('symptoms.title')}</CardTitle>
                                    <CardDescription>{t('symptoms.subtitle')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {symptomStep === 'input' ? (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-base">{t('symptoms.chiefComplaint')}</Label>
                                                <textarea
                                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    placeholder={t('symptoms.chiefComplaintPlaceholder')}
                                                    value={chiefComplaint}
                                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                                />
                                            </div>
                                            <Button onClick={handleGenerateQuestions} disabled={generating} className="w-full">
                                                {generating ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        {tCommon('loading')}
                                                    </>
                                                ) : (
                                                    <>
                                                        {tCommon('next')}
                                                        <ChevronRight className="ml-2 h-4 w-4" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                                                <p className="text-sm text-blue-800 font-medium">Based on "{chiefComplaint}", please answer the following questions:</p>
                                            </div>

                                            {generatedQuestions.map((q) => (
                                                <div key={q.id} className="space-y-2">
                                                    <Label className="text-base font-medium">{q.question}</Label>

                                                    {q.type === 'scale' && (
                                                        <div className="flex gap-2 flex-wrap">
                                                            {(q.options as number[] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((opt) => (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                                    className={cn(
                                                                        "h-10 w-10 rounded-full border flex items-center justify-center transition-all",
                                                                        answers[q.id] === opt
                                                                            ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200"
                                                                            : "bg-white text-gray-700 hover:border-blue-400"
                                                                    )}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {q.type === 'select' && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {(q.options as string[] || []).map((opt) => (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                                    className={cn(
                                                                        "px-4 py-3 rounded-lg border text-left text-sm transition-all",
                                                                        answers[q.id] === opt
                                                                            ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600"
                                                                            : "bg-white text-gray-700 hover:border-blue-400"
                                                                    )}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(q.type === 'text' || !['scale', 'select'].includes(q.type)) && (
                                                        <Input
                                                            value={answers[q.id] || ''}
                                                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                            placeholder="Type your answer here..."
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-gray-50 border-t px-6 py-4 flex justify-between">
                                    {symptomStep === 'questions' && (
                                        <>
                                            <Button variant="ghost" onClick={() => setSymptomStep('input')}>
                                                <ArrowLeft className="mr-2 h-4 w-4" /> {tCommon('back')}
                                            </Button>
                                            <Button onClick={handleSymptomSubmit} disabled={submitting}>
                                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('review.submit')}
                                            </Button>
                                        </>
                                    )}
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
