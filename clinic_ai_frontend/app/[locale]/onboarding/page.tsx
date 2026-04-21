'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Settings,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Shield,
  Stethoscope,
} from 'lucide-react';

// Onboarding steps
const STEPS = [
  { id: 'organization', title: 'Organization', icon: Building2 },
  { id: 'team', title: 'Team Setup', icon: Users },
  { id: 'preferences', title: 'Preferences', icon: Settings },
  { id: 'billing', title: 'Billing', icon: CreditCard },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 },
];

// Organization types
const ORGANIZATION_TYPES = [
  { value: 'clinic', label: 'Medical Clinic', description: 'Single or multi-specialty clinic' },
  { value: 'hospital', label: 'Hospital', description: 'Hospital or health system' },
  { value: 'practice', label: 'Private Practice', description: 'Solo or group practice' },
  { value: 'urgent_care', label: 'Urgent Care', description: 'Walk-in urgent care facility' },
  { value: 'specialty', label: 'Specialty Center', description: 'Specialized care facility' },
];

// Subscription plans
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    period: 'month',
    description: 'Perfect for small practices',
    features: [
      'Up to 10 users',
      'Up to 500 patients',
      'Basic AI assistant',
      'SOAP note templates',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 299,
    period: 'month',
    description: 'For growing organizations',
    features: [
      'Up to 50 users',
      'Up to 5,000 patients',
      'Advanced AI assistant',
      'CarePrep & MedGenie PreVisit',
      'FHIR integration',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large health systems',
    features: [
      'Unlimited users',
      'Unlimited patients',
      'Full AI capabilities',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 phone support',
      'On-premise deployment option',
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Organization
    organizationName: '',
    organizationType: '',
    npiNumber: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    // Team
    invites: [{ email: '', role: 'staff' }],
    // Preferences
    enableAI: true,
    enableTranscription: true,
    enableFHIR: false,
    enableCarePrep: true,
    timezone: 'America/New_York',
    // Billing
    selectedPlan: 'professional',
    billingEmail: '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddInvite = () => {
    setFormData(prev => ({
      ...prev,
      invites: [...prev.invites, { email: '', role: 'staff' }],
    }));
  };

  const handleRemoveInvite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      invites: prev.invites.filter((_, i) => i !== index),
    }));
  };

  const handleInviteChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      invites: prev.invites.map((invite, i) =>
        i === index ? { ...invite, [field]: value } : invite
      ),
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // TODO: Submit onboarding data to API
    console.log('Onboarding data:', formData);
    router.push('/provider/dashboard');
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'organization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Organization Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Metro Health Clinic"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Organization Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ORGANIZATION_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleInputChange('organizationType', type.value)}
                        className={`p-4 border rounded-lg text-left transition-all ${formData.organizationType === type.value
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <p className="font-medium text-slate-900">{type.label}</p>
                        <p className="text-sm text-slate-500">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    NPI Number
                  </label>
                  <input
                    type="text"
                    value={formData.npiNumber}
                    onChange={(e) => handleInputChange('npiNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="10-digit NPI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tax ID (EIN)
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="contact@clinic.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="123 Medical Center Dr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Invite Team Members</h3>
              <p className="text-slate-600 mb-4">
                Invite your staff to join the platform. You can always add more later.
              </p>

              <div className="space-y-3">
                {formData.invites.map((invite, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(e) => handleInviteChange(index, 'email', e.target.value)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="colleague@clinic.com"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) => handleInviteChange(index, 'role', e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="staff">Staff</option>
                      <option value="nurse">Nurse</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                    {formData.invites.length > 1 && (
                      <button
                        onClick={() => handleRemoveInvite(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddInvite}
                className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-2"
              >
                + Add another team member
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Role Permissions</p>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li><strong>Admin:</strong> Full access to all features and settings</li>
                    <li><strong>Doctor:</strong> Patient care, notes, prescriptions</li>
                    <li><strong>Nurse:</strong> Patient vitals, basic notes, scheduling</li>
                    <li><strong>Staff:</strong> Scheduling, patient check-in</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Feature Preferences</h3>
              <p className="text-slate-600 mb-4">
                Choose which features to enable for your organization.
              </p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-slate-900">AI Clinical Assistant</p>
                      <p className="text-sm text-slate-500">
                        AI-powered assistance for clinical documentation
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableAI}
                    onChange={(e) => handleInputChange('enableAI', e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">Audio Transcription</p>
                      <p className="text-sm text-slate-500">
                        Real-time transcription of patient conversations
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableTranscription}
                    onChange={(e) => handleInputChange('enableTranscription', e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-violet-600" />
                    <div>
                      <p className="font-medium text-slate-900">CarePrep</p>
                      <p className="text-sm text-slate-500">
                        Pre-visit preparation and patient context
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableCarePrep}
                    onChange={(e) => handleInputChange('enableCarePrep', e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-slate-900">FHIR Integration</p>
                      <p className="text-sm text-slate-500">
                        Connect with existing EHR systems via HL7 FHIR
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableFHIR}
                    onChange={(e) => handleInputChange('enableFHIR', e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Timezone</h3>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              </select>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Choose Your Plan</h3>
              <p className="text-slate-600 mb-6">
                Select the plan that best fits your organization's needs.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleInputChange('selectedPlan', plan.id)}
                    className={`relative p-6 border rounded-xl text-left transition-all ${formData.selectedPlan === plan.id
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                        Most Popular
                      </span>
                    )}
                    <h4 className="text-lg font-semibold text-slate-900">{plan.name}</h4>
                    <div className="mt-2">
                      {typeof plan.price === 'number' ? (
                        <>
                          <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                          <span className="text-slate-500">/{plan.period}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Billing Information</h3>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="billing@clinic.com"
                />
                <p className="mt-2 text-sm text-slate-500">
                  We'll send invoices and billing notifications to this email.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> You can start with a 14-day free trial. No credit card required.
                Payment details will be collected before your trial ends.
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">You're All Set!</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Your organization has been set up successfully. You can now start using the platform.
            </p>

            <div className="bg-slate-50 rounded-xl p-6 max-w-lg mx-auto text-left">
              <h4 className="font-semibold text-slate-900 mb-4">Setup Summary</h4>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Organization</dt>
                  <dd className="font-medium text-slate-900">
                    {formData.organizationName || 'Not specified'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Type</dt>
                  <dd className="font-medium text-slate-900">
                    {ORGANIZATION_TYPES.find(t => t.value === formData.organizationType)?.label || 'Not specified'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Team Invitations</dt>
                  <dd className="font-medium text-slate-900">
                    {formData.invites.filter(i => i.email).length} pending
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Plan</dt>
                  <dd className="font-medium text-slate-900">
                    {PLANS.find(p => p.id === formData.selectedPlan)?.name} (14-day trial)
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 space-y-4">
              <Button size="lg" onClick={handleComplete} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Dashboard
              </Button>
              <p className="text-sm text-slate-500">
                Need help getting started?{' '}
                <a href="/guides" className="text-emerald-600 hover:underline">
                  View our quick start guide
                </a>
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-emerald-600" />
            <span className="text-xl font-bold text-slate-900">HealthcareAI</span>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isComplete
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${isCurrent ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-2 ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>{STEPS[currentStep].title}</CardTitle>
            <CardDescription>
              {currentStep === 0 && 'Tell us about your healthcare organization'}
              {currentStep === 1 && 'Add your team members to the platform'}
              {currentStep === 2 && 'Configure your feature preferences'}
              {currentStep === 3 && 'Select your subscription plan'}
              {currentStep === 4 && 'Review and complete your setup'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {/* Navigation Buttons */}
            {currentStep < STEPS.length - 1 && (
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button onClick={handleNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {currentStep === STEPS.length - 2 ? 'Complete Setup' : 'Continue'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
