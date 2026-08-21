import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'es', 'en', 'pt'],
  defaultLocale: 'fr',
  localeDetection: true,
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
  alternateLinks: true,
})
