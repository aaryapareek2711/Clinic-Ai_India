'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Supported regions with their configurations
 */
export const REGIONS = {
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    phoneFormat: '+1 (XXX) XXX-XXXX',
    phonePrefix: '+1',
    locale: 'en-US',
    compliance: ['hipaa', 'fhir'],
    languages: ['en', 'es'],
    defaultLanguage: 'en',
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+91 XXXXX XXXXX',
    phonePrefix: '+91',
    locale: 'en-IN',
    compliance: ['dpdp', 'abdm', 'fhir'],
    languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'],
    defaultLanguage: 'en',
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    currencySymbol: '$',
    timezone: 'America/Toronto',
    dateFormat: 'YYYY-MM-DD',
    phoneFormat: '+1 (XXX) XXX-XXXX',
    phonePrefix: '+1',
    locale: 'en-CA',
    compliance: ['pipeda', 'phipa', 'fhir'],
    languages: ['en', 'fr'],
    defaultLanguage: 'en',
  },
} as const;

export type RegionCode = keyof typeof REGIONS;
export type RegionConfig = typeof REGIONS[RegionCode];

/**
 * Subdomain to region mapping
 */
const SUBDOMAIN_REGION_MAP: Record<string, RegionCode> = {
  'in': 'IN',
  'india': 'IN',
  'ca': 'CA',
  'canada': 'CA',
  // Default (no subdomain or 'www') maps to US
};

interface RegionContextType {
  region: RegionCode;
  regionConfig: RegionConfig;
  setRegion: (region: RegionCode) => void;
  isLoading: boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const REGION_COOKIE_NAME = 'preferred_region';
const REGION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Get region from cookie
 */
function getRegionFromCookie(): RegionCode | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp(`${REGION_COOKIE_NAME}=([^;]+)`));
  if (match && match[1] in REGIONS) {
    return match[1] as RegionCode;
  }
  return null;
}

/**
 * Set region cookie
 */
function setRegionCookie(region: RegionCode): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${REGION_COOKIE_NAME}=${region}; path=/; max-age=${REGION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Detect region from subdomain
 * e.g., in.medgenie.com -> IN, ca.medgenie.com -> CA
 */
function getRegionFromSubdomain(): RegionCode | null {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Check if there's a subdomain (e.g., in.medgenie.com has 3 parts)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();
    if (subdomain in SUBDOMAIN_REGION_MAP) {
      return SUBDOMAIN_REGION_MAP[subdomain];
    }
  }

  return null;
}

/**
 * Detect region from browser timezone as a fallback
 */
function getRegionFromTimezone(): RegionCode {
  if (typeof Intl === 'undefined') return 'US';

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // India timezones
    if (timezone.startsWith('Asia/Kolkata') || timezone.startsWith('Asia/Calcutta')) {
      return 'IN';
    }

    // Canada timezones
    if (
      timezone.startsWith('America/Toronto') ||
      timezone.startsWith('America/Vancouver') ||
      timezone.startsWith('America/Montreal') ||
      timezone.startsWith('America/Edmonton') ||
      timezone.startsWith('America/Winnipeg') ||
      timezone.startsWith('America/Halifax')
    ) {
      return 'CA';
    }

    // Default to US for American timezones or unknown
    return 'US';
  } catch {
    return 'US';
  }
}

/**
 * Detect region using multiple strategies
 * Priority: 1. Cookie (user preference) 2. Subdomain 3. Timezone 4. Default (US)
 */
function detectRegion(): RegionCode {
  // 1. Check cookie first (user's explicit preference)
  const cookieRegion = getRegionFromCookie();
  if (cookieRegion) return cookieRegion;

  // 2. Check subdomain
  const subdomainRegion = getRegionFromSubdomain();
  if (subdomainRegion) return subdomainRegion;

  // 3. Fall back to timezone detection
  return getRegionFromTimezone();
}

interface RegionProviderProps {
  children: React.ReactNode;
  /**
   * Force a specific region (useful for testing or server-side rendering)
   */
  forceRegion?: RegionCode;
}

export function RegionProvider({ children, forceRegion }: RegionProviderProps) {
  const [region, setRegionState] = useState<RegionCode>(forceRegion || 'US');
  const [isLoading, setIsLoading] = useState(!forceRegion);

  // Detect region on mount
  useEffect(() => {
    if (forceRegion) return;

    const detectedRegion = detectRegion();
    setRegionState(detectedRegion);
    setIsLoading(false);
  }, [forceRegion]);

  const setRegion = useCallback((newRegion: RegionCode) => {
    setRegionState(newRegion);
    setRegionCookie(newRegion);
  }, []);

  const value: RegionContextType = {
    region,
    regionConfig: REGIONS[region],
    setRegion,
    isLoading,
  };

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
}

/**
 * Hook to access region context
 */
export function useRegion(): RegionContextType {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}

/**
 * Hook to get compliance standards for current region
 */
export function useRegionalCompliance(): string[] {
  const { regionConfig } = useRegion();
  return regionConfig.compliance;
}

/**
 * Hook to get currency info for current region
 */
export function useRegionalCurrency(): { code: string; symbol: string } {
  const { regionConfig } = useRegion();
  return {
    code: regionConfig.currency,
    symbol: regionConfig.currencySymbol,
  };
}

/**
 * Hook to format currency amounts for the current region.
 * Uses the Intl.NumberFormat API for locale-aware formatting.
 *
 * @example
 * const { format } = useFormatCurrency();
 * format(1500) // "$1,500.00" (US), "₹1,500.00" (IN), "CA$1,500.00" (CA)
 */
export function useFormatCurrency() {
  const { regionConfig } = useRegion();

  const format = (amount: number): string => {
    return new Intl.NumberFormat(regionConfig.locale, {
      style: 'currency',
      currency: regionConfig.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return { format, currency: regionConfig.currency, symbol: regionConfig.currencySymbol };
}

/**
 * Hook to format dates for the current region.
 *
 * @example
 * const { format, dateFormat } = useFormatDate();
 * format(new Date()) // "03/15/2026" (US), "15/03/2026" (IN), "2026-03-15" (CA)
 */
export function useFormatDate() {
  const { regionConfig } = useRegion();

  const format = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    switch (regionConfig.dateFormat) {
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      default: return `${month}/${day}/${year}`; // MM/DD/YYYY
    }
  };

  return { format, dateFormat: regionConfig.dateFormat };
}

/**
 * Hook to get phone formatting info for the current region.
 *
 * @example
 * const { prefix, format } = usePhoneFormat();
 * // IN: prefix="+91", format="+91 XXXXX XXXXX"
 */
export function usePhoneFormat() {
  const { regionConfig } = useRegion();
  return {
    prefix: regionConfig.phonePrefix,
    format: regionConfig.phoneFormat,
  };
}

export default RegionContext;
