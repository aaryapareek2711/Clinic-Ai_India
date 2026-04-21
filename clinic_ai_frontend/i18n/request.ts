import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Supported locales
export const locales = ['en', 'hi', 'fr'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale display names
export const localeNames: Record<Locale, string> = {
    en: 'English',
    hi: 'हिंदी',
    fr: 'Français',
};

// next-intl v4: Use requestLocale instead of locale
export default getRequestConfig(async ({ requestLocale }) => {
    // Get the locale from the request (from [locale] segment)
    const locale = await requestLocale;

    // Validate that the incoming locale is supported
    const resolvedLocale = locale ?? defaultLocale;
    if (!locales.includes(resolvedLocale as Locale)) {
        notFound();
    }

    return {
        locale: resolvedLocale,
        messages: (await import(`../messages/${resolvedLocale}.json`)).default,
    };
});
