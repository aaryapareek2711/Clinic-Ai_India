'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useRegionLanguages } from '@/lib/hooks/useRegionLanguages';
import { type Locale } from '@/i18n/request';

interface RegionLanguageSwitcherProps {
  /**
   * Variant for the switcher display style
   * - 'dropdown': Dropdown with globe icon
   * - 'select': Simple select dropdown
   * - 'buttons': Inline button group
   */
  variant?: 'dropdown' | 'select' | 'buttons';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Show region name alongside language
   */
  showRegion?: boolean;
}

/**
 * Region-aware language switcher component.
 *
 * Automatically shows only languages relevant to the current region:
 * - India (IN): English / Hindi
 * - US: Hidden (single language)
 * - Canada (CA): English / French
 *
 * The switcher is hidden when only one language is available.
 */
export function RegionLanguageSwitcher({
  variant = 'dropdown',
  className = '',
  showRegion = false,
}: RegionLanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    availableLanguages,
    shouldShowSwitcher,
    region,
    isLoading,
  } = useRegionLanguages();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if only one language or still loading
  if (isLoading || !shouldShowSwitcher) {
    return null;
  }

  const switchLocale = (newLocale: Locale) => {
    // Get the path without the current locale prefix
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    // Navigate to the same path with the new locale
    router.push(`/${newLocale}${pathWithoutLocale}`);
    setIsOpen(false);
  };

  const currentLanguage = availableLanguages.find(lang => lang.code === locale);
  const displayLabel = currentLanguage?.native || 'English';

  if (variant === 'select') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={locale}
          onChange={(e) => switchLocale(e.target.value as Locale)}
          className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer transition-colors"
          aria-label="Select language"
        >
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code} className="text-gray-900">
              {lang.display}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center rounded-lg border border-gray-200 p-0.5 ${className}`}>
        {availableLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              lang.code === locale
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // Default: dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{displayLabel}</span>
        {showRegion && (
          <span className="text-xs text-gray-400">({region})</span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-purple-50 transition-colors ${
                lang.code === locale
                  ? 'text-purple-600 font-medium bg-purple-50/50'
                  : 'text-slate-700'
              }`}
            >
              <div className="flex flex-col items-start">
                <span>{lang.native}</span>
                {lang.native !== lang.english && (
                  <span className="text-xs text-gray-400">{lang.english}</span>
                )}
              </div>
              {lang.code === locale && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RegionLanguageSwitcher;
