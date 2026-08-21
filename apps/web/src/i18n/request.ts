import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

const loadMessages = {
  en: () => import('../messages/en.json'),
  es: () => import('../messages/es.json'),
  fr: () => import('../messages/fr.json'),
  pt: () => import('../messages/pt.json'),
} as const

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await loadMessages[locale]()).default,
  }
})
