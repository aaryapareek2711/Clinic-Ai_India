import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Rocket } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  comingSoon?: boolean;
}

export default function PlaceholderPage({
  title,
  description,
  icon: Icon = Rocket,
  comingSoon = true
}: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-sand-50">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-forest-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
            <Link href="/auth/login">
              <Button variant="primary" size="base">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          {comingSoon && (
            <Badge variant="primary" size="lg" className="mb-6">
              Coming Soon
            </Badge>
          )}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-forest-100 rounded-2xl flex items-center justify-center">
              <Icon className="w-10 h-10 text-forest-600" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            {title}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <Card variant="elevated" className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              We're Working on Something Great
            </h2>
            <p className="text-slate-600 mb-8">
              This feature is currently under development. Check back soon or sign up to get notified when it's ready!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button variant="primary" size="lg">
                  Get Early Access
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="lg">
                  Explore Features
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            Have questions or feedback?{' '}
            <a href="mailto:support@medgenie.ai" className="text-forest-600 hover:underline font-medium">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
