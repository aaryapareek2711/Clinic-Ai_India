import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale, type Locale } from './request';

/**
 * Typed navigation helpers for next-intl v4.
 * Use these instead of next/navigation for locale-aware routing.
 */
export const { Link, redirect, usePathname, useRouter } = createNavigation({
    locales,
    defaultLocale,
    localePrefix: 'as-needed',
});

export type { Locale };
