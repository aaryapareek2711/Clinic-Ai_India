'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Database,
  Globe,
  Key,
  Server,
  Webhook,
  AlertTriangle,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

// Mock settings data
const initialSettings = {
  // Platform Settings
  platform: {
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    defaultTrialDays: 14,
    maxOrganizationsPerAccount: 3,
  },
  // Security Settings
  security: {
    enforcePasswordPolicy: true,
    minPasswordLength: 8,
    requireMFA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
  },
  // Email Settings
  email: {
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpUser: 'apikey',
    smtpPassword: '****************************',
    fromEmail: 'noreply@healthcareai.com',
    fromName: 'HealthcareAI',
  },
  // Integration Settings
  integrations: {
    stripeEnabled: true,
    stripePublishableKey: 'pk_live_****************************',
    openaiEnabled: true,
    openaiApiKey: 'sk-****************************',
    azureSpeechEnabled: true,
    azureSpeechKey: '****************************',
    fhirEnabled: true,
    fhirServerUrl: 'http://fhir-server:8080/fhir',
  },
  // Notification Settings
  notifications: {
    sendWelcomeEmail: true,
    sendTrialExpiryReminder: true,
    trialExpiryReminderDays: 3,
    sendPaymentFailedNotification: true,
    adminAlertEmail: 'admin@healthcareai.com',
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('platform');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  const tabs = [
    { id: 'platform', label: 'Platform', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'integrations', label: 'Integrations', icon: Webhook },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
          <p className="text-slate-600 mt-1">Configure global platform settings and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="warning" size="sm">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettings(initialSettings)}
            disabled={!hasChanges}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            loading={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <div className="col-span-3">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="col-span-9">
          {activeTab === 'platform' && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure general platform behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Maintenance Mode */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${settings.platform.maintenanceMode ? 'text-amber-500' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-medium text-slate-900">Maintenance Mode</p>
                      <p className="text-sm text-slate-500">
                        When enabled, only admins can access the platform
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.platform.maintenanceMode}
                      onChange={(e) => handleSettingChange('platform', 'maintenanceMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Registration */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Allow New Registrations</p>
                    <p className="text-sm text-slate-500">
                      Allow new organizations to sign up
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.platform.allowNewRegistrations}
                      onChange={(e) => handleSettingChange('platform', 'allowNewRegistrations', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Email Verification */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Require Email Verification</p>
                    <p className="text-sm text-slate-500">
                      Users must verify email before accessing platform
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.platform.requireEmailVerification}
                      onChange={(e) => handleSettingChange('platform', 'requireEmailVerification', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Trial Days */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="block">
                    <span className="font-medium text-slate-900">Default Trial Period (days)</span>
                    <p className="text-sm text-slate-500 mb-2">
                      Number of days for new organization trials
                    </p>
                    <input
                      type="number"
                      value={settings.platform.defaultTrialDays}
                      onChange={(e) => handleSettingChange('platform', 'defaultTrialDays', parseInt(e.target.value))}
                      className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min={1}
                      max={90}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security policies and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password Policy */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Enforce Password Policy</p>
                    <p className="text-sm text-slate-500">
                      Require strong passwords with mixed characters
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.enforcePasswordPolicy}
                      onChange={(e) => handleSettingChange('security', 'enforcePasswordPolicy', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Min Password Length */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="block">
                    <span className="font-medium text-slate-900">Minimum Password Length</span>
                    <p className="text-sm text-slate-500 mb-2">
                      Minimum characters required for passwords
                    </p>
                    <input
                      type="number"
                      value={settings.security.minPasswordLength}
                      onChange={(e) => handleSettingChange('security', 'minPasswordLength', parseInt(e.target.value))}
                      className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min={6}
                      max={32}
                    />
                  </label>
                </div>

                {/* MFA */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Require Multi-Factor Authentication</p>
                    <p className="text-sm text-slate-500">
                      Enforce MFA for all users (HIPAA recommended)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.requireMFA}
                      onChange={(e) => handleSettingChange('security', 'requireMFA', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Session Timeout */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="block">
                    <span className="font-medium text-slate-900">Session Timeout (minutes)</span>
                    <p className="text-sm text-slate-500 mb-2">
                      Auto-logout after inactivity
                    </p>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min={5}
                      max={480}
                    />
                  </label>
                </div>

                {/* Login Attempts */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <label className="block">
                      <span className="font-medium text-slate-900">Max Login Attempts</span>
                      <p className="text-sm text-slate-500 mb-2">
                        Before account lockout
                      </p>
                      <input
                        type="number"
                        value={settings.security.maxLoginAttempts}
                        onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={3}
                        max={10}
                      />
                    </label>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <label className="block">
                      <span className="font-medium text-slate-900">Lockout Duration (minutes)</span>
                      <p className="text-sm text-slate-500 mb-2">
                        Time before retry allowed
                      </p>
                      <input
                        type="number"
                        value={settings.security.lockoutDuration}
                        onChange={(e) => handleSettingChange('security', 'lockoutDuration', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={5}
                        max={60}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'email' && (
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure SMTP and email delivery settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtpHost}
                      onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={settings.email.smtpPort}
                      onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtpUser}
                      onChange={(e) => handleSettingChange('email', 'smtpUser', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SMTP Password
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets.smtpPassword ? 'text' : 'password'}
                        value={settings.email.smtpPassword}
                        onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility('smtpPassword')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSecrets.smtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={settings.email.fromEmail}
                      onChange={(e) => handleSettingChange('email', 'fromEmail', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={settings.email.fromName}
                      onChange={(e) => handleSettingChange('email', 'fromName', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'integrations' && (
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>Configure third-party service integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stripe */}
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Stripe Payments</p>
                        <p className="text-sm text-slate-500">Payment processing</p>
                      </div>
                    </div>
                    <Badge variant={settings.integrations.stripeEnabled ? 'success' : 'secondary'}>
                      {settings.integrations.stripeEnabled ? 'Connected' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Publishable Key
                      </label>
                      <input
                        type="text"
                        value={settings.integrations.stripePublishableKey}
                        onChange={(e) => handleSettingChange('integrations', 'stripePublishableKey', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* OpenAI */}
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Server className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Azure OpenAI</p>
                        <p className="text-sm text-slate-500">AI-powered features</p>
                      </div>
                    </div>
                    <Badge variant={settings.integrations.openaiEnabled ? 'success' : 'secondary'}>
                      {settings.integrations.openaiEnabled ? 'Connected' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets.openaiApiKey ? 'text' : 'password'}
                          value={settings.integrations.openaiApiKey}
                          onChange={(e) => handleSettingChange('integrations', 'openaiApiKey', e.target.value)}
                          className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility('openaiApiKey')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSecrets.openaiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FHIR */}
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">FHIR Server</p>
                        <p className="text-sm text-slate-500">Healthcare data integration</p>
                      </div>
                    </div>
                    <Badge variant={settings.integrations.fhirEnabled ? 'success' : 'secondary'}>
                      {settings.integrations.fhirEnabled ? 'Connected' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        FHIR Server URL
                      </label>
                      <input
                        type="text"
                        value={settings.integrations.fhirServerUrl}
                        onChange={(e) => handleSettingChange('integrations', 'fhirServerUrl', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure automated notifications and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Welcome Email */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Send Welcome Email</p>
                    <p className="text-sm text-slate-500">
                      Send welcome email to new users
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sendWelcomeEmail}
                      onChange={(e) => handleSettingChange('notifications', 'sendWelcomeEmail', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Trial Expiry */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Trial Expiry Reminder</p>
                    <p className="text-sm text-slate-500">
                      Notify organizations before trial ends
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sendTrialExpiryReminder}
                      onChange={(e) => handleSettingChange('notifications', 'sendTrialExpiryReminder', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Reminder Days */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="block">
                    <span className="font-medium text-slate-900">Reminder Days Before Expiry</span>
                    <p className="text-sm text-slate-500 mb-2">
                      Days before trial ends to send reminder
                    </p>
                    <input
                      type="number"
                      value={settings.notifications.trialExpiryReminderDays}
                      onChange={(e) => handleSettingChange('notifications', 'trialExpiryReminderDays', parseInt(e.target.value))}
                      className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min={1}
                      max={14}
                    />
                  </label>
                </div>

                {/* Payment Failed */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Payment Failed Notification</p>
                    <p className="text-sm text-slate-500">
                      Notify when subscription payment fails
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sendPaymentFailedNotification}
                      onChange={(e) => handleSettingChange('notifications', 'sendPaymentFailedNotification', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Admin Email */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="block">
                    <span className="font-medium text-slate-900">Admin Alert Email</span>
                    <p className="text-sm text-slate-500 mb-2">
                      Email address for system alerts
                    </p>
                    <input
                      type="email"
                      value={settings.notifications.adminAlertEmail}
                      onChange={(e) => handleSettingChange('notifications', 'adminAlertEmail', e.target.value)}
                      className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
