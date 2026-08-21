import type { Locale } from '@tv/domain/locale'

/**
 * Pure content rules. No Effect wrapper: these are deterministic decisions,
 * and wrapping one in `Effect.succeed` to match its neighbours is ceremony.
 * Effect shows up where coordination does — workflows, retries, resources —
 * not on every function that returns a value.
 */

export type TranslationLike = {
  locale: Locale
  title: string
  bodyMd: string
  published: boolean
}

/**
 * The locale fallback the article page implements inline today: prefer the
 * requested locale when published, fall back to any published translation,
 * then to whatever exists. The baseline shows 29 translations across 8
 * articles, so not every article is fully translated — this path is exercised
 * in production, it is not defensive dead code. Extracted so the web and Expo
 * clients cannot drift apart on it.
 */
export const selectTranslation = <T extends TranslationLike>(
  translations: readonly T[],
  locale: Locale
): T | undefined =>
  translations.find((candidate) => candidate.locale === locale && candidate.published) ??
  translations.find((candidate) => candidate.published) ??
  translations[0]

/** The Convex search index takes one field; the Prisma query matched title OR bodyMd. */
export const buildSearchText = (title: string, bodyMd: string): string => `${title}\n${bodyMd}`

export const isVisible = (status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): boolean => status === 'PUBLISHED'
