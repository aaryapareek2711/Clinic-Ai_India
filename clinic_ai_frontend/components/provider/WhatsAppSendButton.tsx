'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, Check, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface WhatsAppSendButtonProps {
  patientId: string;
  appointmentId?: string;
  patientName?: string;
  hasPhone?: boolean;
  variant?: 'icon' | 'button' | 'full';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: (result: WhatsAppSendResult) => void;
  onError?: (error: Error) => void;
}

interface WhatsAppSendResult {
  success: boolean;
  message_id: string;
  careprep_url: string;
  token: string;
  status: string;
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * WhatsApp CarePrep send button component.
 * Sends CarePrep questionnaire link to patient via WhatsApp.
 *
 * @example
 * ```tsx
 * <WhatsAppSendButton
 *   patientId="patient-123"
 *   appointmentId="apt-456"
 *   patientName="John Doe"
 *   hasPhone={true}
 *   variant="button"
 * />
 * ```
 */
export function WhatsAppSendButton({
  patientId,
  appointmentId,
  patientName,
  hasPhone = true,
  variant = 'button',
  size = 'md',
  className = '',
  onSuccess,
  onError,
}: WhatsAppSendButtonProps) {
  const t = useTranslations('provider');
  const [status, setStatus] = useState<SendStatus>('idle');

  const handleSend = async () => {
    if (!hasPhone) {
      toast.error(t('whatsapp.noPhone'));
      return;
    }

    if (status === 'sending') return;

    setStatus('sending');

    try {
      const result = await apiClient.sendCarePrepViaWhatsApp(patientId, {
        appointment_id: appointmentId,
        language: 'hi',
        use_bilingual: true,
      });

      setStatus('sent');
      toast.success(
        patientName
          ? `CarePrep sent to ${patientName} via WhatsApp`
          : t('careprep.sendSuccess')
      );

      onSuccess?.(result);

      // Reset status after a delay
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: unknown) {
      setStatus('failed');
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const errorMessage = axiosError.response?.data?.detail || t('careprep.sendFailed');
      toast.error(errorMessage);
      onError?.(error);

      // Reset status after a delay
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Loader2 className={`${iconSizes[size]} animate-spin`} />;
      case 'sent':
        return <Check className={iconSizes[size]} />;
      case 'failed':
        return <AlertCircle className={iconSizes[size]} />;
      default:
        return <MessageCircle className={iconSizes[size]} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending':
        return 'bg-green-100 text-green-600 cursor-wait';
      case 'sent':
        return 'bg-green-500 text-white';
      case 'failed':
        return 'bg-red-100 text-red-600';
      default:
        return hasPhone
          ? 'bg-green-100 text-green-600 hover:bg-green-200'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleSend}
        disabled={!hasPhone || status === 'sending'}
        className={`rounded-full transition-colors ${sizeClasses[size]} ${getStatusColor()} ${className}`}
        title={hasPhone ? t('careprep.sendViaWhatsApp') : t('whatsapp.noPhone')}
      >
        {getStatusIcon()}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleSend}
        disabled={!hasPhone || status === 'sending'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${getStatusColor()} ${className}`}
      >
        {getStatusIcon()}
        <span>
          {status === 'sending' && t('whatsapp.sending')}
          {status === 'sent' && t('whatsapp.sent')}
          {status === 'failed' && t('whatsapp.failed')}
          {status === 'idle' && t('careprep.sendViaWhatsApp')}
        </span>
      </button>
    );
  }

  // Default: button variant
  return (
    <button
      onClick={handleSend}
      disabled={!hasPhone || status === 'sending'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${sizeClasses[size]} ${getStatusColor()} ${className}`}
      title={hasPhone ? t('careprep.sendViaWhatsApp') : t('whatsapp.noPhone')}
    >
      {getStatusIcon()}
      <span className="hidden sm:inline">
        {status === 'sending' && t('whatsapp.sending')}
        {status === 'sent' && t('whatsapp.sent')}
        {status === 'failed' && t('whatsapp.failed')}
        {status === 'idle' && 'WhatsApp'}
      </span>
    </button>
  );
}

export default WhatsAppSendButton;
