/**
 * Maps the site's 4 locale codes to their corresponding BCP 47 tags
 * used by Intl.NumberFormat for currency formatting.
 *
 * Examples with CAD $12.50:
 *  en → en-CA → CA$12.50
 *  fr → fr-CA → 12,50 $CA
 *  pt → pt-BR → CA$ 12,50
 *  es → es-ES → 12,50 CA$
 */
const LOCALE_BCP47: Record<string, string> = {
  en: 'en-CA',
  fr: 'fr-CA',
  pt: 'pt-BR',
  es: 'es-ES',
}

const FORMATTERS: Record<string, Intl.NumberFormat> = {
  'en-CA:CAD': new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
  'fr-CA:CAD': new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }),
  'pt-BR:BRL': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  'es-ES:USD': new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }),
}

export function formatPrice(price: number, locale: string, currency: string): string {
  const bcp47 = LOCALE_BCP47[locale] ?? 'en-CA'
  const key = `${bcp47}:${currency}`
  const formatter = FORMATTERS[key] ?? FORMATTERS['en-CA:CAD']!
  return formatter.format(price)
}
