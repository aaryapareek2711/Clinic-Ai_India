'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/request';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    const handleChange = (newLocale: Locale) => {
        // Remove current locale prefix and add new one
        const pathnameWithoutLocale = pathname.replace(/^\/(en|hi|fr)/, '') || '/';
        const newPath = newLocale === 'en' ? pathnameWithoutLocale : `/${newLocale}${pathnameWithoutLocale}`;
        router.push(newPath);
    };

    return (
        <div className="relative group">
            <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-forest-600 rounded-lg hover:bg-forest-50 transition-colors"
                aria-label="Change language"
            >
                <Globe className="w-4 h-4" />
                <span>{localeNames[locale]}</span>
            </button>

            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
                {locales.map((loc) => (
                    <button
                        key={loc}
                        onClick={() => handleChange(loc)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-forest-50 transition-colors ${loc === locale ? 'text-forest-600 font-medium bg-forest-50' : 'text-slate-700'
                            }`}
                    >
                        {localeNames[loc]}
                    </button>
                ))}
            </div>
        </div>
    );
}
