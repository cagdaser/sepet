import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'tr'],

  // Used when no locale matches
  defaultLocale: 'en',
  
  // Use no prefix for the default locale (en), keep prefix for others (tr)
  localePrefix: 'as-needed'
}); 