import { z } from 'zod'

export const LOCALES = ['fr', 'es', 'en', 'pt'] as const

export const DEFAULT_LOCALE = 'fr' satisfies (typeof LOCALES)[number]

export const LocaleSchema = z.enum(LOCALES)

export type Locale = z.infer<typeof LocaleSchema>

/** Narrows an unknown route segment to a supported locale, falling back to the default. */
export const resolveLocale = (value: unknown): Locale => {
  const parsed = LocaleSchema.safeParse(value)
  return parsed.success ? parsed.data : DEFAULT_LOCALE
}
