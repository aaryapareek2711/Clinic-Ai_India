'use client';

import { useTranslations } from 'next-intl';
import { Shield, CheckCircle, Globe, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegion, REGIONS, RegionCode } from '@/contexts/RegionContext';

/**
 * Region codes mapped to their compliance standards.
 * Each region has different healthcare compliance requirements.
 * @deprecated Use REGIONS from RegionContext instead
 */
const REGIONAL_COMPLIANCE: Record<string, string[]> = {
  US: ['hipaa', 'fhir'],
  IN: ['dpdp', 'abdm', 'fhir'],
  CA: ['pipeda', 'phipa', 'fhir'],
};

/**
 * Icons for each compliance standard
 */
const COMPLIANCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hipaa: Shield,
  fhir: Database,
  dpdp: Shield,
  abdm: Globe,
  pipeda: Shield,
  phipa: CheckCircle,
  dataResidency: Globe,
};

/**
 * Colors for each compliance badge
 */
const COMPLIANCE_COLORS: Record<string, string> = {
  hipaa: 'bg-blue-50 text-blue-700 border-blue-200',
  fhir: 'bg-green-50 text-green-700 border-green-200',
  dpdp: 'bg-orange-50 text-orange-700 border-orange-200',
  abdm: 'bg-purple-50 text-purple-700 border-purple-200',
  pipeda: 'bg-red-50 text-red-700 border-red-200',
  phipa: 'bg-teal-50 text-teal-700 border-teal-200',
  dataResidency: 'bg-slate-50 text-slate-700 border-slate-200',
};

interface ComplianceBadgeProps {
  type: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Individual compliance badge component
 */
export function ComplianceBadge({
  type,
  showDescription = false,
  size = 'md',
  className
}: ComplianceBadgeProps) {
  const t = useTranslations('compliance');
  const Icon = COMPLIANCE_ICONS[type] || Shield;
  const colorClass = COMPLIANCE_COLORS[type] || 'bg-gray-50 text-gray-700 border-gray-200';

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          sizeClasses[size],
          colorClass
        )}
      >
        <Icon className={iconSizes[size]} />
        <span>{t(`${type}.name`)}</span>
      </span>
      {showDescription && (
        <p className="mt-1 text-xs text-gray-500 max-w-[200px]">
          {t(`${type}.description`)}
        </p>
      )}
    </div>
  );
}

interface RegionalComplianceBadgesProps {
  /**
   * Region code (US, IN, CA).
   * If not provided, uses region from RegionContext.
   */
  region?: string;
  /**
   * Show descriptions below badges
   */
  showDescriptions?: boolean;
  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Layout direction
   */
  layout?: 'horizontal' | 'vertical' | 'grid';
  /**
   * Include data residency badge
   */
  showDataResidency?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Use region from context instead of prop.
   * Set to false to use the region prop instead.
   */
  useContext?: boolean;
}

/**
 * Displays compliance badges based on the user's region.
 *
 * Usage:
 * ```tsx
 * // Auto-detect region from context (recommended)
 * <RegionalComplianceBadges />
 *
 * // Explicit region (overrides context)
 * <RegionalComplianceBadges region="IN" useContext={false} />
 *
 * // With descriptions
 * <RegionalComplianceBadges showDescriptions />
 * ```
 */
export function RegionalComplianceBadges({
  region: regionProp,
  showDescriptions = false,
  size = 'md',
  layout = 'horizontal',
  showDataResidency = false,
  className,
  useContext: useContextProp = true,
}: RegionalComplianceBadgesProps) {
  // Try to use context, fall back to prop or default
  let effectiveRegion = 'US';

  try {
    if (useContextProp) {
      const { region: contextRegion } = useRegion();
      effectiveRegion = regionProp || contextRegion;
    } else {
      effectiveRegion = regionProp || 'US';
    }
  } catch {
    // Context not available, use prop or default
    effectiveRegion = regionProp || 'US';
  }

  const regionUpper = effectiveRegion.toUpperCase();
  const complianceTypes = REGIONS[regionUpper as RegionCode]?.compliance || REGIONAL_COMPLIANCE[regionUpper] || REGIONAL_COMPLIANCE['US'];

  // Add data residency badge for non-US regions
  const allBadges = showDataResidency && regionUpper !== 'US'
    ? [...complianceTypes, 'dataResidency']
    : complianceTypes;

  const layoutClasses = {
    horizontal: 'flex flex-wrap items-center gap-2',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-3',
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {allBadges.map((type) => (
        <ComplianceBadge
          key={type}
          type={type}
          showDescription={showDescriptions}
          size={size}
        />
      ))}
    </div>
  );
}

/**
 * Compliance section for landing pages.
 * Shows a full compliance section with title, subtitle, and badges.
 * Uses RegionContext automatically.
 */
interface ComplianceSectionProps {
  className?: string;
}

export function ComplianceSection({ className }: ComplianceSectionProps) {
  const t = useTranslations('compliance');
  let isNonUS = false;

  try {
    const { region } = useRegion();
    isNonUS = region !== 'US';
  } catch {
    // Context not available
  }

  return (
    <section className={cn('py-12 bg-slate-50', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h2>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex justify-center">
          <RegionalComplianceBadges
            showDescriptions
            size="lg"
            layout="horizontal"
            showDataResidency={isNonUS}
            className="justify-center"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Inline compliance badges for hero sections.
 * Compact display suitable for headers.
 * Uses RegionContext automatically.
 */
interface InlineComplianceBadgesProps {
  className?: string;
}

export function InlineComplianceBadges({ className }: InlineComplianceBadgesProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
      <RegionalComplianceBadges
        size="sm"
        layout="horizontal"
      />
    </div>
  );
}

export default RegionalComplianceBadges;
