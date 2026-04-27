'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { RegionalComplianceBadges } from '@/components/RegionalComplianceBadges';
import { RegionSwitcher } from '@/components/ui/RegionSwitcher';
import {
  Heart,
  Brain,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Activity,
  Users,
  Clock,
  TrendingUp,
  Clipboard,
  FileText,
  Star,
  ChevronRight,
  ChevronDown,
  Rocket,
  DollarSign,
  Building,
  Stethoscope,
  Calendar,
  BarChart,
  Sparkles,
  Lock,
  Smartphone,
  Globe,
  MessageCircle,
  HelpCircle,
  Mic,
  Award
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user, loadUser } = useAuthStore();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // i18n translations
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tCompliance = useTranslations('compliance');

  // Load user from localStorage on component mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'patient') {
        router.push('/patient/dashboard');
      } else if (['doctor', 'nurse', 'admin', 'staff', 'super_admin', 'provider'].includes(user.role)) {
        router.push('/clinic/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  const toggleDropdown = (menu: string) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header - Mega Menu with Dropdowns */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-forest rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">MedGenie</span>
            </Link>

            {/* Navigation Links with Dropdowns - Hidden on mobile */}
            <nav className="hidden lg:flex items-center space-x-1">
              {/* Product Dropdown - Comprehensive 3-column mega menu */}
              <div className="relative group">
                <button
                  onMouseEnter={() => setOpenDropdown('product')}
                  className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:text-forest-600 transition-colors font-medium rounded-lg hover:bg-forest-50"
                >
                  {tNav('product')}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === 'product' && (
                  <div
                    onMouseLeave={() => setOpenDropdown(null)}
                    className="absolute top-full left-0 mt-2 w-[800px] bg-white rounded-xl shadow-2xl border border-slate-200 p-8 animate-fade-in"
                  >
                    <div className="grid grid-cols-3 gap-8">
                      {/* Column 1: Features */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wide">{tNav('menu.features')}</h4>
                        <div className="space-y-1">
                          <Link href="/features/transcribe" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <FileText className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.transcribe')}</span>
                          </Link>
                          <Link href="/features/ai-assistant" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Sparkles className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.aiAssistant')}</span>
                          </Link>
                          <Link href="/features/context" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Activity className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.patientContext')}</span>
                          </Link>
                          <Link href="/features/tasks" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Clipboard className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.smartTasks')}</span>
                          </Link>
                          <Link href="/clinic/templates" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <FileText className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.clinicalTemplates')}</span>
                          </Link>
                          <Link href="/community" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Users className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.communityTemplates')}</span>
                          </Link>
                          <Link href="/features/customization" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Zap className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600 font-medium">{tNav('menu.customization')}</span>
                          </Link>
                        </div>
                      </div>

                      {/* Column 2: For Different Users */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wide">{tNav('menu.forClinicians')}</h4>
                        <Link href="#careprep" className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors group/item mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Brain className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover/item:text-forest-600 text-sm">{tNav('menu.carePrep')}</p>
                            <p className="text-xs text-slate-600">{tNav('menu.carePrepDesc')}</p>
                          </div>
                        </Link>
                        <Link href="#contextai" className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors group/item mb-4">
                          <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="w-5 h-5 text-forest-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover/item:text-forest-600 text-sm">{tNav('menu.contextAI')}</p>
                            <p className="text-xs text-slate-600">{tNav('menu.contextAIDesc')}</p>
                          </div>
                        </Link>

                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 mt-4 tracking-wide">{tNav('menu.forOrganizations')}</h4>
                        <div className="space-y-1">
                          <Link href="/solutions/practices" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors text-xs text-slate-700 hover:text-forest-600">
                            {tNav('menu.standardizeQuality')}
                          </Link>
                          <Link href="/solutions/hospitals" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors text-xs text-slate-700 hover:text-forest-600">
                            {tNav('menu.scaleEfficiently')}
                          </Link>
                          <Link href="/solutions/loyalty" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors text-xs text-slate-700 hover:text-forest-600">
                            {tNav('menu.patientLoyalty')}
                          </Link>
                        </div>
                      </div>

                      {/* Column 3: Resources & Platform */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wide">{tNav('menu.getStarted')}</h4>
                        <div className="space-y-1">
                          <Link href="/how-it-works" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Rocket className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">{tNav('menu.howItWorks')}</span>
                          </Link>
                          <Link href="/changelog" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Activity className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">{tNav('menu.changelog')}</span>
                          </Link>
                          <Link href="/guides" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <FileText className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">{tNav('menu.guides')}</span>
                          </Link>
                          <Link href="/roi" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <DollarSign className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">{tNav('menu.roiCalculator')}</span>
                          </Link>
                        </div>

                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 mt-6 tracking-wide">{tNav('menu.platform')}</h4>
                        <div className="space-y-1">
                          <Link href="/integrations" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Globe className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">{tNav('menu.integrations')}</span>
                          </Link>
                          <Link href="/security" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Lock className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">{tNav('menu.security')}</span>
                          </Link>
                          <Link href="/partners" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors group/item text-sm">
                            <Users className="w-4 h-4 text-slate-400 group-hover/item:text-forest-600" />
                            <span className="text-slate-700 group-hover/item:text-forest-600">Partners</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions Dropdown */}
              <div className="relative group">
                <button
                  onMouseEnter={() => setOpenDropdown('solutions')}
                  className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:text-forest-600 transition-colors font-medium rounded-lg hover:bg-forest-50"
                >
                  {tNav('solutionsLabel')}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === 'solutions' && (
                  <div
                    onMouseLeave={() => setOpenDropdown(null)}
                    className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-fade-in"
                  >
                    <div className="space-y-3">
                      <Link href="/solutions/hospitals" className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors">
                        <Building className="w-5 h-5 text-forest-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900">{tNav('solutions.healthcareSystems')}</p>
                          <p className="text-sm text-slate-600">{tNav('solutions.healthcareSystemsDesc')}</p>
                        </div>
                      </Link>
                      <Link href="/solutions/practices" className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors">
                        <Users className="w-5 h-5 text-forest-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900">{tNav('solutions.privatePractices')}</p>
                          <p className="text-sm text-slate-600">{tNav('solutions.privatePracticesDesc')}</p>
                        </div>
                      </Link>
                      <Link href="/solutions/loyalty" className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors">
                        <Globe className="w-5 h-5 text-forest-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900">{tNav('solutions.patientLoyalty')}</p>
                          <p className="text-sm text-slate-600">{tNav('solutions.patientLoyaltyDesc')}</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link href="#pricing" className="px-4 py-2 text-slate-600 hover:text-forest-600 transition-colors font-medium rounded-lg hover:bg-forest-50">
                {tNav('pricingLabel')}
              </Link>
              <Link href="/community" className="px-4 py-2 text-slate-600 hover:text-forest-600 transition-colors font-medium rounded-lg hover:bg-forest-50">
                {tNav('community')}
              </Link>

              {/* Resources Dropdown */}
              <div className="relative group">
                <button
                  onMouseEnter={() => setOpenDropdown('resources')}
                  className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:text-forest-600 transition-colors font-medium rounded-lg hover:bg-forest-50"
                >
                  {tNav('resourcesLabel')}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === 'resources' && (
                  <div
                    onMouseLeave={() => setOpenDropdown(null)}
                    className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-fade-in"
                  >
                    <div className="space-y-2">
                      <Link href="/guides" className="block px-3 py-2 text-slate-700 hover:text-forest-600 hover:bg-cream-50 rounded-lg transition-colors">
                        {tNav('resources.documentation')}
                      </Link>
                      <Link href="/how-it-works" className="block px-3 py-2 text-slate-700 hover:text-forest-600 hover:bg-cream-50 rounded-lg transition-colors">
                        {tNav('menu.howItWorks')}
                      </Link>
                      <Link href="/changelog" className="block px-3 py-2 text-slate-700 hover:text-forest-600 hover:bg-cream-50 rounded-lg transition-colors">
                        {tNav('menu.changelog')}
                      </Link>
                      <Link href="/community" className="block px-3 py-2 text-slate-700 hover:text-forest-600 hover:bg-cream-50 rounded-lg transition-colors">
                        {tNav('community')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Region/Language Switchers & CTA Buttons */}
            <div className="flex items-center space-x-3">
              <RegionSwitcher variant="compact" />
              <LanguageSwitcher />
              <Link href="/login">
                <Button variant="ghost" size="base">
                  {tNav('login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="base" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {tNav('signup')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cream-50 via-white to-sand-50">
        {/* Decorative blobs */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-forest-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <Badge variant="primary" size="lg" className="mb-6">
                {t('hero.badge')}
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                {t('hero.headline')}{' '}
                <span className="text-forest-600">{t('hero.headline2')}</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl">
                {t('hero.subheadline')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/signup">
                  <Button variant="primary" size="lg" rightIcon={<ChevronRight className="w-5 h-5" />}>
                    {tCommon('startFreeTrial')}
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" size="lg" leftIcon={<Activity className="w-5 h-5" />}>
                    {tCommon('watchDemo')}
                  </Button>
                </Link>
              </div>

              {/* Social Proof - Regional Compliance Badges */}
              <div className="mt-12 flex items-center gap-4 justify-center lg:justify-start">
                <RegionalComplianceBadges size="md" />
              </div>
            </div>


            {/* Right Visual */}
            <div className="relative">
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-4 transform hover:scale-105 transition-transform duration-300 overflow-hidden">
                <img
                  src="/images/hero-illustration.png"
                  alt="MedGenie AI-powered clinical documentation"
                  className="w-full h-auto rounded-xl"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-full h-full bg-gradient-forest rounded-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-slate py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: t('stats.stat1'), label: t('stats.stat1Label') },
              { number: t('stats.stat2'), label: t('stats.stat2Label') },
              { number: t('stats.stat3'), label: t('stats.stat3Label') },
              { number: t('stats.stat4'), label: t('stats.stat4Label') },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-500 mb-2">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base text-white/90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MedGenie PreVisit Feature Section - CarePrep */}
      <section id="careprep" className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <Badge variant="info" className="mb-4">For Patients</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                CarePrep: Your Smart Health Companion
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                AI-powered symptom analysis that helps patients understand their health concerns
                before visiting a provider, ensuring efficient and informed care.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: Brain, text: 'AI-powered symptom analysis' },
                  { icon: Clipboard, text: 'Personalized medical questionnaires' },
                  { icon: Zap, text: 'Smart appointment preparation' },
                  { icon: Shield, text: 'Secure health data handling' },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-forest-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-forest-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <feature.icon className="w-5 h-5 text-forest-600" />
                      <span className="text-slate-700 font-medium">{feature.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/patient/previsit/symptoms">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Try Symptom Checker
                </Button>
              </Link>
            </div>

            {/* Right Visual - Illustration */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-4 transform hover:scale-105 transition-transform duration-300">
                <img
                  src="/images/careprep-illustration.png"
                  alt="CarePrep - AI-powered patient symptom analysis"
                  className="w-full h-auto rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MedGenie Context Feature Section - ContextAI */}
      <section id="contextai" className="py-20 sm:py-32 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Visual - Illustration */}
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-xl p-4 transform hover:scale-105 transition-transform duration-300">
                <img
                  src="/images/contextai-illustration.png"
                  alt="ContextAI - Provider dashboard and clinical context"
                  className="w-full h-auto rounded-xl"
                />
              </div>
            </div>

            {/* Right Content */}
            <div className="order-1 lg:order-2">
              <Badge variant="primary" className="mb-4">For Providers</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                ContextAI: Walk In Fully Prepared
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Comprehensive appointment preparation that aggregates patient data from multiple sources,
                giving you everything you need for informed care delivery.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: FileText, text: 'Comprehensive patient context in seconds' },
                  { icon: TrendingUp, text: 'AI-powered risk stratification' },
                  { icon: Activity, text: 'Automated care gap detection' },
                  { icon: Users, text: 'Real-time FHIR integration' },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-forest-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-forest-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <feature.icon className="w-5 h-5 text-forest-600" />
                      <span className="text-slate-700 font-medium">{feature.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/clinic/dashboard">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Open clinic workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Your Clinical Journey
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              MedGenie supports you before, during, and after every patient visit
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              {
                step: '01',
                phase: 'Before',
                title: 'Pre-Visit Questionnaire',
                description: 'Clinical team sends a questionnaire based on appointment reason',
                icon: Clipboard,
                color: 'blue',
              },
              {
                step: '02',
                phase: 'Before',
                title: 'Physician Reviews',
                description: 'Review patient-submitted information ahead of the visit',
                icon: FileText,
                color: 'blue',
              },
              {
                step: '03',
                phase: 'During',
                title: 'Ambient AI Listening',
                description: 'AI captures the conversation so you can focus on the patient',
                icon: Mic,
                color: 'forest',
              },
              {
                step: '04',
                phase: 'After',
                title: 'AI Summary',
                description: 'AI-generated summary ready for your review and signature',
                icon: Brain,
                color: 'emerald',
              },
              {
                step: '05',
                phase: 'After',
                title: 'Patient Summary',
                description: 'After-visit summary automatically shared with the patient',
                icon: Heart,
                color: 'emerald',
              },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                {/* Connector Line */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-20 left-1/2 w-full h-0.5 bg-gradient-to-r from-forest-200 to-forest-300 z-0"></div>
                )}

                <Card variant="elevated" className="relative z-10 h-full hover:scale-105 transition-transform duration-300">
                  <CardContent className="p-8 text-center">
                    <div className={`w-14 h-14 bg-${step.color}-100 rounded-full flex items-center justify-center mx-auto mb-3`}>
                      <step.icon className={`w-7 h-7 text-${step.color}-600`} />
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{step.phase}</div>
                    <div className="text-2xl font-bold text-forest-600 mb-2">{step.step}</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section id="benefits" className="py-20 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Why Physicians Choose MedGenie
            </h2>
            <p className="text-lg text-slate-600">
              Built for the demands of modern clinical practice
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Fast Implementation',
                description: 'Up and running in hours with streamlined onboarding—not weeks',
                color: 'blue',
              },
              {
                icon: FileText,
                title: 'Reduced Documentation',
                description: 'Spend less time charting and more time caring for patients',
                color: 'forest',
              },
              {
                icon: TrendingUp,
                title: 'Increased Productivity',
                description: 'Decreased documentation time enables more patient visits per day',
                color: 'emerald',
              },
              {
                icon: Clock,
                title: 'Work-Life Balance',
                description: 'Less after-hours charting supports clinician well-being',
                color: 'amber',
              },
              {
                icon: Globe,
                title: 'Multilingual Support',
                description: 'Available in multiple languages with more coming soon',
                color: 'purple',
              },
              {
                icon: Shield,
                title: 'HIPAA Compliant',
                description: 'Bank-grade security and compliance built into every feature',
                color: 'green',
              },
            ].map((benefit, idx) => (
              <Card key={idx} variant="interactive" className="group">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 bg-${benefit.color}-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <benefit.icon className={`w-6 h-6 text-${benefit.color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Trusted by Physicians
            </h2>
            <p className="text-lg text-slate-600">
              Hear from clinicians who have transformed their practice with MedGenie
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "MedGenie has cut my documentation time in half. I'm finally leaving the office on time.",
                name: "Dr. Sarah Chen",
                specialty: "Family Medicine",
                initials: "SC",
              },
              {
                quote: "The pre-visit questionnaire means I walk into every appointment fully prepared. My patients notice the difference.",
                name: "Dr. Michael Torres",
                specialty: "Internal Medicine",
                initials: "MT",
              },
              {
                quote: "My patients love the after-visit summaries. It's improved their understanding and treatment adherence.",
                name: "Dr. Priya Patel",
                specialty: "Pediatrics",
                initials: "PP",
              },
            ].map((testimonial, idx) => (
              <Card key={idx} variant="elevated" className="h-full">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center">
                      <span className="text-forest-600 font-semibold">{testimonial.initials}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{testimonial.name}</p>
                      <p className="text-sm text-slate-600">{testimonial.specialty}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 sm:py-32 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600">
              Everything you need to know about getting started with MedGenie
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                question: "How long does setup take?",
                answer: "Most physicians are up and running within 2 hours. Our streamlined onboarding process guides you through EHR integration, customizing questionnaires, and training your staff.",
              },
              {
                question: "Is MedGenie HIPAA compliant?",
                answer: "Yes, absolutely. We use 256-bit encryption, maintain SOC 2 Type II compliance, and provide Business Associate Agreements (BAAs) for all customers.",
              },
              {
                question: "What EHRs do you integrate with?",
                answer: "MedGenie integrates with Epic, Cerner, Athena, eClinicalWorks, and many other EHR systems via FHIR R4. Contact us for specific compatibility questions.",
              },
              {
                question: "Can I try before committing?",
                answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.",
              },
            ].map((faq, idx) => (
              <Card key={idx} variant="interactive" className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-forest-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HelpCircle className="w-4 h-4 text-forest-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{faq.question}</h3>
                      <p className="text-slate-600">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - SaaS Plans */}
      <section id="pricing" className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="primary" size="lg" className="mb-4">
              Per-Clinician Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Choose the Plan That Fits Your Practice
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Start with our 14-day free trial. No credit card required. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card variant="outlined" className="relative">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
                  <p className="text-slate-600">Perfect for small practices</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">$49</span>
                    <span className="text-slate-600">/month</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Up to 100 patients/month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'CarePrep symptom checker',
                    'Basic appointment preparation',
                    'FHIR integration',
                    'Email support',
                    '1 provider account',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button variant="outline" size="lg" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Professional Plan - Featured */}
            <Card variant="elevated" className="relative border-2 border-forest-600 shadow-xl scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge variant="primary" size="lg">
                  Most Popular
                </Badge>
              </div>
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                  <p className="text-slate-600">For growing practices</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-forest-600">$99</span>
                    <span className="text-slate-600">/month</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Up to 500 patients/month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Everything in Starter',
                    'ContextAI dashboard',
                    'Care gap detection',
                    'Risk stratification',
                    'Priority support',
                    'Up to 5 provider accounts',
                    'Custom integrations',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button variant="primary" size="lg" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card variant="outlined" className="relative">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                  <p className="text-slate-600">For healthcare systems</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">Custom</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Unlimited patients</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Everything in Pro',
                    'Dedicated account manager',
                    'Custom AI model training',
                    'Advanced analytics',
                    '24/7 phone support',
                    'Unlimited provider accounts',
                    'SSO & advanced security',
                    'SLA guarantee',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/partners">
                  <Button variant="outline" size="lg" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Footer - Regional Compliance */}
          <div className="mt-12 text-center">
            <p className="text-slate-600 mb-4">
              {tCompliance('subtitle')}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <RegionalComplianceBadges size="sm" />
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-sm">
                <Lock className="w-4 h-4" />
                256-bit Encryption
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                99.9% Uptime SLA
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap - Future Features */}
      <section id="roadmap" className="py-20 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="primary" size="lg" className="mb-4">
              Coming Soon
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              The Future of Healthcare AI
            </h2>
            <p className="text-lg text-slate-300 max-w-3xl mx-auto">
              We're constantly innovating to bring you cutting-edge features that transform healthcare delivery
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: 'Mobile Apps',
                description: 'Native iOS and Android apps for patients and providers with offline support',
                timeline: 'Q1 2026',
                status: 'In Development',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Multi-provider workflows with real-time collaboration and handoffs',
                timeline: 'Q2 2026',
                status: 'Planning',
              },
              {
                icon: BarChart,
                title: 'Advanced Analytics',
                description: 'Practice insights, outcome tracking, and performance dashboards',
                timeline: 'Q2 2026',
                status: 'Planning',
              },
              {
                icon: Globe,
                title: 'Multi-language Support',
                description: 'AI-powered translation supporting 50+ languages for global healthcare',
                timeline: 'Q3 2026',
                status: 'Research',
              },
              {
                icon: Calendar,
                title: 'Smart Scheduling',
                description: 'AI-optimized scheduling to reduce no-shows and improve patient flow',
                timeline: 'Q3 2026',
                status: 'Research',
              },
              {
                icon: Award,
                title: 'Quality Reporting',
                description: 'Automated MIPS/MACRA quality measure reporting and compliance',
                timeline: 'Q4 2026',
                status: 'Research',
              },
            ].map((feature, idx) => (
              <Card key={idx} variant="elevated" className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-forest-500/20 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-forest-400" />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <Badge variant="outline" size="sm" className="border-forest-400/50 text-forest-400">
                      {feature.status}
                    </Badge>
                  </div>
                  <p className="text-slate-300 mb-4">{feature.description}</p>
                  <div className="flex items-center gap-2 text-sm text-forest-400">
                    <Calendar className="w-4 h-4" />
                    <span>{feature.timeline}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-300 mb-6">
              Have a feature request? We'd love to hear from you!
            </p>
            <Button
              variant="outline"
              size="lg"
              className="bg-white text-forest-700 border-white hover:bg-white/90"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Submit Feature Request
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-32 bg-gradient-forest relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white/90 mb-10">
            {t('cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                variant="outline"
                size="xl"
                className="bg-white text-forest-600 hover:bg-white/90 border-0"
                rightIcon={<ChevronRight className="w-5 h-5" />}
              >
                {t('cta.button')}
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                variant="outline"
                size="xl"
                className="bg-white text-forest-700 border-white hover:bg-white/90"
              >
                {t('cta.scheduleDemo')}
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-white/80 text-sm">
            {t('cta.disclaimer')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Column 1 - Brand */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-forest rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">MedGenie</span>
              </div>
              <p className="text-slate-400 text-sm">
                AI-powered clinical documentation that helps physicians focus on patient care.
              </p>
            </div>

            {/* Column 2 - Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/patient/previsit/symptoms" className="hover:text-white transition-colors">CarePrep</Link></li>
                <li><Link href="/clinic/dashboard" className="hover:text-white transition-colors">ContextAI</Link></li>
                <li><Link href="/features/ai-assistant" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Column 3 - Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/partners" className="hover:text-white transition-colors">Partners</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="/community" className="hover:text-white transition-colors">Community</Link></li>
              </ul>
            </div>

            {/* Column 4 - Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/guides" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
                <li><Link href="/roi" className="hover:text-white transition-colors">ROI Calculator</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © 2026 MedGenie. All rights reserved.
            </p>
            <RegionalComplianceBadges size="sm" />
          </div>
        </div>
      </footer>
    </div>
  );
}
