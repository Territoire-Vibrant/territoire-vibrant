import type { Locale } from './locale'

/** Territoire Vibrant sells in Canadian dollars. Change here if that ever moves. */
export const DEFAULT_CURRENCY = 'CAD'

/**
 * Prices are stored as integer cents. Postgres held them as Decimal(10,2);
 * Convex has no decimal type, and a float price is a rounding bug waiting to
 * be reported by a customer.
 */
export const toCents = (amount: number): number => Math.round(amount * 100)

export const fromCents = (cents: number): number => cents / 100

const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-CA',
  es: 'es-ES',
  fr: 'fr-CA',
  pt: 'pt-BR',
}

export const formatPrice = (cents: number, locale: Locale, currency = DEFAULT_CURRENCY): string =>
  new Intl.NumberFormat(LOCALE_TAGS[locale], { style: 'currency', currency }).format(fromCents(cents))
