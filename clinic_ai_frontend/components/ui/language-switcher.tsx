'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/request';

export function LanguageSwitcher() {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const switchLocale = (newLocale: Locale) => {
        // Get the path without the current locale prefix
        const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
        // Navigate to the same path with the new locale
        router.push(`/${newLocale}${pathWithoutLocale}`);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
                aria-label="Select language"
            >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{localeNames[locale]}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
                    {locales.map((loc) => (
                        <button
                            key={loc}
                            onClick={() => switchLocale(loc)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-forest-50 transition-colors ${loc === locale ? 'text-forest-600 font-medium bg-forest-50/50' : 'text-slate-700'
                                }`}
                        >
                            <span>{localeNames[loc]}</span>
                            {loc === locale && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
