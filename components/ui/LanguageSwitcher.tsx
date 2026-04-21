'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales, localeNames, type Locale } from '@/i18n/request';

/**
 * Language switcher dropdown component.
 * Allows users to switch between available locales (EN/HI/FR).
 */
export function LanguageSwitcher() {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    const handleChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale as Locale });
    };

    return (
        <div className="relative">
            <select
                value={locale}
                onChange={(e) => handleChange(e.target.value)}
                className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer transition-colors"
                aria-label="Select language"
            >
                {locales.map((loc) => (
                    <option key={loc} value={loc} className="text-gray-900">
                        {localeNames[loc]}
                    </option>
                ))}
            </select>
            {/* Dropdown arrow icon */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </div>
        </div>
    );
}
