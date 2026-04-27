'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, CheckCircle, Clock, Mail, MessageSquare, Copy, ExternalLink, Smartphone, MessageCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface QuestionnaireTemplate {
  id: string;
  name: string;
  description: string;
  questions: number;
  estimatedTime: string;
}

interface CarePrepLink {
  token: string;
  expires_at: string;
  url: string;
}

const templates: QuestionnaireTemplate[] = [
  {
    id: 'general',
    name: 'General Pre-Visit',
    description: 'Basic health status, current medications, and reason for visit',
    questions: 12,
    estimatedTime: '5 min'
  },
  {
    id: 'symptoms',
    name: 'Symptom Assessment',
    description: 'Detailed symptom checker with severity and duration',
    questions: 18,
    estimatedTime: '8 min'
  },
  {
    id: 'annual',
    name: 'Annual Physical',
    description: 'Comprehensive health review for preventive care visits',
    questions: 25,
    estimatedTime: '12 min'
  },
  {
    id: 'followup',
    name: 'Follow-up Visit',
    description: 'Progress check on previous treatment or condition',
    questions: 10,
    estimatedTime: '4 min'
  }
];

export default function SendCarePrepPage({ params }: { params: { patientId: string } }) {
  const t = useTranslations('provider');
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment_id') || searchParams.get('appointment');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<CarePrepLink | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  const handleGenerateLink = async () => {
    console.log('Button clicked'); // Debug
    // alert('Button clicked!'); // Debug - Uncomment if needed

    if (!selectedTemplate) {
      console.log('No template selected');
      toast.error('Please select a questionnaire template');
      return;
    }

    if (!appointmentId) {
      toast.error('No appointment linked. Please select an appointment first.');
      return;
    }

    setIsSending(true);
    setGeneratedLink(null);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      if (!token) {
        toast.error('Please log in to generate CarePrep links');
        return;
      }

      console.log('Generating CarePrep link for patient:', params.patientId);

      const response = await axios.post(
        `/api/careprep/forms/send/${params.patientId}?appointment_id=${appointmentId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('CarePrep link generated:', response.data);

      if (!response.data || !response.data.url) {
        throw new Error('Invalid response from server');
      }

      setGeneratedLink(response.data);
      toast.success('CarePrep link generated successfully!');
    } catch (error: any) {
      console.error('Error generating CarePrep link:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
      }
      toast.error(error.response?.data?.detail || 'Failed to generate CarePrep link');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleStartWhatsAppChat = async () => {
    if (!phone) {
      toast.error('Please enter a WhatsApp number');
      return;
    }
    setIsSendingChat(true);
    try {
      const result = await apiClient.startWhatsAppChat(params.patientId, {
        appointment_id: appointmentId || undefined,
        phone,
        language: 'hi',
      });
      setChatStarted(true);
      toast.success(`First question sent to ${result.phone}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start WhatsApp conversation');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSendNotification = async () => {
    if (!email && !phone) {
      toast.error('Please enter an email or phone number');
      return;
    }

    // Mock sending
    toast.success(`Notification sent to ${email ? email : ''} ${email && phone ? 'and' : ''} ${phone ? phone : ''}`);
  };

  const handleSendWhatsApp = async () => {
    if (!phone) {
      toast.error('Please enter a phone number for WhatsApp');
      return;
    }

    setIsSendingWhatsApp(true);

    try {
      const result = await apiClient.sendCarePrepViaWhatsApp(params.patientId, {
        appointment_id: appointmentId || undefined,
        phone: phone || undefined,
        language: 'hi',
        use_bilingual: true,
      });

      setWhatsAppSent(true);
      setGeneratedLink({
        token: result.token,
        url: result.careprep_url,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      toast.success(t('careprep.sendSuccess'));
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error);
      toast.error(error.response?.data?.detail || t('careprep.sendFailed'));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clinic/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Send CarePrep Questionnaire</h1>
          <p className="text-gray-600">Patient ID: {params.patientId}</p>
        </div>
      </div>

      {appointmentId && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-blue-800">
            <strong>Linked Appointment:</strong> {appointmentId}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Template Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Template</CardTitle>
              <CardDescription>Choose the appropriate questionnaire</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedTemplate === template.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      {selectedTemplate === template.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{template.questions} Qs</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.estimatedTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Phone input — shared by Generate Link and Start WhatsApp Chat */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone-main">WhatsApp Number</Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-green-500" />
              <Input
                id="whatsapp-phone-main"
                placeholder="+91 98765 43210"
                className="pl-9"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">Include country code (e.g., +91 for India)</p>
          </div>

          {/* Two primary actions — WhatsApp Chat always available, Generate Link only before link exists */}
          <div className="grid grid-cols-2 gap-3">
            {!generatedLink && (
              <Button
                onClick={handleGenerateLink}
                disabled={!selectedTemplate || isSending || !appointmentId}
                variant="outline"
                className="h-12 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Generate Link
              </Button>
            )}
            <Button
              onClick={handleStartWhatsAppChat}
              disabled={!phone || isSendingChat || chatStarted}
              className={`h-12 bg-green-600 hover:bg-green-700 ${generatedLink ? 'col-span-2' : ''}`}
            >
              {isSendingChat ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : chatStarted ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              {chatStarted ? 'Chat Started ✓' : 'Start WhatsApp Chat'}
            </Button>
          </div>

          {/* Generated Link Section */}
          {generatedLink && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-6 h-6" />
                  Link Generated Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={generatedLink.url}
                      readOnly
                      className="w-full pl-3 pr-10 py-3 bg-white border rounded-lg text-sm font-mono text-gray-600"
                    />
                  </div>
                  <Button variant="outline" onClick={handleCopyLink} className="h-11">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Link href={generatedLink.url} target="_blank">
                    <Button variant="outline" className="h-11">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Expires: {new Date(generatedLink.expires_at).toLocaleDateString()}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setGeneratedLink(null); setChatStarted(false); }} className="text-gray-400 hover:text-gray-600">
                    Generate New Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Share Options */}
        {generatedLink && (
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>2. Share with Patient</CardTitle>
                <CardDescription>Choose how to send the link</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="whatsapp" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="whatsapp" className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="message">Email/SMS</TabsTrigger>
                    <TabsTrigger value="qr">QR Code</TabsTrigger>
                  </TabsList>

                  <TabsContent value="whatsapp" className="space-y-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        Send CarePrep link via WhatsApp with bilingual message (English + Hindi)
                      </p>
                    </div>
                    <Button
                      onClick={handleSendWhatsApp}
                      disabled={isSendingWhatsApp || !phone}
                      className="w-full bg-green-600 hover:bg-green-700 mt-2"
                    >
                      {isSendingWhatsApp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('whatsapp.sending')}
                        </>
                      ) : whatsAppSent ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('whatsapp.sent')}
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {t('careprep.sendViaWhatsApp')}
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="message" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          placeholder="patient@example.com"
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (SMS)</Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          placeholder="+1 555 000 0000"
                          className="pl-9"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={handleSendNotification} className="w-full bg-blue-600 hover:bg-blue-700 mt-2">
                      <Send className="w-4 h-4 mr-2" />
                      Send Notification
                    </Button>
                  </TabsContent>

                  <TabsContent value="qr" className="flex flex-col items-center justify-center py-4 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border">
                      <QRCodeSVG value={generatedLink.url} size={180} />
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="font-semibold text-gray-900">Scan to Start</h4>
                      <p className="text-sm text-gray-500 max-w-[200px]">
                        Ask the patient to scan this code with their phone camera.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      <Smartphone className="w-3 h-3" />
                      <span>Works on iOS & Android</span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
