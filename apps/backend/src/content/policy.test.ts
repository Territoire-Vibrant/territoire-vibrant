import { describe, expect, it } from 'vitest'

import { buildSearchText, selectTranslation } from './policy'

const translation = (locale: 'fr' | 'en', published: boolean) => ({
  locale,
  title: `${locale} title`,
  bodyMd: 'body',
  published,
})

describe('selectTranslation', () => {
  it('prefers the requested locale when it is published', () => {
    const result = selectTranslation([translation('fr', true), translation('en', true)], 'en')
    expect(result?.locale).toBe('en')
  })

  it('ignores the requested locale when it is not published', () => {
    const result = selectTranslation([translation('fr', true), translation('en', false)], 'en')
    expect(result?.locale).toBe('fr')
  })

  it('falls back to any published translation', () => {
    const result = selectTranslation([translation('fr', false), translation('en', true)], 'pt')
    expect(result?.locale).toBe('en')
  })

  it('returns the first translation when none are published', () => {
    const result = selectTranslation([translation('en', false), translation('fr', false)], 'en')
    expect(result?.locale).toBe('en')
  })

  it('returns undefined for an article with no translations', () => {
    expect(selectTranslation([], 'fr')).toBeUndefined()
  })
})

describe('buildSearchText', () => {
  it('indexes the title and the body together', () => {
    expect(buildSearchText('Territoire', 'cartographie')).toBe('Territoire\ncartographie')
  })
})
