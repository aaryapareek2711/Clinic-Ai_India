'use client';

import { useMemo } from 'react';
import { useRegion, type RegionCode } from '@/contexts/RegionContext';
import { locales, localeNames, type Locale } from '@/i18n/request';

/**
 * Region to available languages mapping.
 * Only shows languages relevant to each region.
 *
 * - US: English only (Spanish not yet translated)
 * - IN: English and Hindi
 * - CA: English and French
 */
const REGION_LANGUAGES: Record<RegionCode, Locale[]> = {
  US: ['en'],
  IN: ['en', 'hi'],
  CA: ['en', 'fr'],
};

/**
 * Language display names for the switcher
 */
const LANGUAGE_DISPLAY: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  hi: { native: 'हिंदी', english: 'Hindi' },
  fr: { native: 'Français', english: 'French' },
};

export interface LanguageOption {
  code: Locale;
  native: string;
  english: string;
  display: string; // Combined display name
}

export interface UseRegionLanguagesResult {
  /** Available languages for the current region */
  availableLanguages: LanguageOption[];
  /** Whether the language switcher should be shown (more than 1 language) */
  shouldShowSwitcher: boolean;
  /** Current region code */
  region: RegionCode;
  /** Whether region is still being detected */
  isLoading: boolean;
  /** Check if a locale is available in current region */
  isLocaleAvailable: (locale: Locale) => boolean;
  /** Get the default language for current region */
  defaultLanguage: Locale;
}

/**
 * Hook to get available languages based on the current region.
 *
 * Uses the RegionContext to determine which languages should be available
 * in the language switcher. For example:
 * - India (IN): Shows English and Hindi
 * - US: Shows only English (switcher hidden)
 * - Canada (CA): Shows English and French
 *
 * @example
 * ```tsx
 * const { availableLanguages, shouldShowSwitcher } = useRegionLanguages();
 *
 * if (!shouldShowSwitcher) return null;
 *
 * return (
 *   <select>
 *     {availableLanguages.map(lang => (
 *       <option key={lang.code} value={lang.code}>{lang.display}</option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useRegionLanguages(): UseRegionLanguagesResult {
  const { region, isLoading } = useRegion();

  const availableLanguages = useMemo(() => {
    const regionLocales = REGION_LANGUAGES[region] || ['en'];

    return regionLocales
      .filter(code => locales.includes(code)) // Only include supported locales
      .map(code => ({
        code,
        native: LANGUAGE_DISPLAY[code]?.native || localeNames[code],
        english: LANGUAGE_DISPLAY[code]?.english || localeNames[code],
        display: LANGUAGE_DISPLAY[code]?.native || localeNames[code],
      }));
  }, [region]);

  const shouldShowSwitcher = availableLanguages.length > 1;

  const isLocaleAvailable = (locale: Locale): boolean => {
    const regionLocales = REGION_LANGUAGES[region] || ['en'];
    return regionLocales.includes(locale);
  };

  const defaultLanguage: Locale = useMemo(() => {
    const regionLocales = REGION_LANGUAGES[region];
    // Return first locale for region, defaulting to 'en'
    return regionLocales?.[0] || 'en';
  }, [region]);

  return {
    availableLanguages,
    shouldShowSwitcher,
    region,
    isLoading,
    isLocaleAvailable,
    defaultLanguage,
  };
}
