import '@uiw/react-markdown-preview/markdown.css'

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MarkdownPreview } from '~/components/MarkdownPreview'
import { Button } from '~/components/ui/button'
import { Section } from '~/layouts/Section'
import { METHOD_ARTICLE_ID } from '~/lib/constants'

import { Link } from '~/i18n/navigation'
import { api } from '@tv/backend-client'

import { publicQuery } from '~/server/convex'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt'] as const

type Locale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_LABEL_KEYS: Record<Locale, 'english' | 'spanish' | 'french' | 'portuguese'> = {
  en: 'english',
  es: 'spanish',
  fr: 'french',
  pt: 'portuguese',
}

const DATE_FORMATTERS: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en', { dateStyle: 'long' }),
  es: new Intl.DateTimeFormat('es', { dateStyle: 'long' }),
  fr: new Intl.DateTimeFormat('fr', { dateStyle: 'long' }),
  pt: new Intl.DateTimeFormat('pt', { dateStyle: 'long' }),
}

const resolveLocale = (value: string): Locale => {
  return SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : 'en'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string
  }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = resolveLocale(locale)
  const t = await getTranslations({ locale: activeLocale, namespace: 'Search' })
  const tRoot = await getTranslations({ locale: activeLocale })

  return {
    title: `${t('title')} - ${tRoot('territoire_vibrant')}`,
    description: t('enter_query'),
  }
}

const formatDate = (locale: Locale, date: Date) => {
  return DATE_FORMATTERS[locale].format(date)
}

const buildPreviewMarkdown = (md: string, maxParagraphs = 2, maxChars = 600) => {
  const trimmed = md.trim()
  if (!trimmed) return ''

  const paragraphs = trimmed.split(/\n{2,}/)
  let preview = paragraphs.slice(0, maxParagraphs).join('\n\n')

  if (preview.length > maxChars) {
    preview = `${preview.slice(0, maxChars).trimEnd()}…`
  }

  return preview
}

const HIGHLIGHT_START = '‹‹HL››'
const HIGHLIGHT_END = '‹‹/HL››'

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, `${HIGHLIGHT_START}$1${HIGHLIGHT_END}`)
}

type HighlightSegment = {
  highlighted: boolean
  key: string
  value: string
}

type SearchResultCard = {
  id: string
  title: string
  createdAt: Date
  locale: Locale
  isFallback: boolean
  previewMd: string
}

const getHighlightSegments = (text: string, query: string): HighlightSegment[] => {
  const highlighted = highlightText(text, query)
  const segments: HighlightSegment[] = []
  const markerPattern = new RegExp(`${HIGHLIGHT_START}([\\s\\S]*?)${HIGHLIGHT_END}`, 'g')
  let offset = 0
  let lastIndex = 0

  for (const match of highlighted.matchAll(markerPattern)) {
    const matchIndex = match.index
    if (matchIndex > lastIndex) {
      const plainText = highlighted.slice(lastIndex, matchIndex)
      segments.push({ highlighted: false, key: `${offset}-plain`, value: plainText })
      offset += plainText.length
    }

    const highlightedValue = match[1] ?? ''
    segments.push({ highlighted: true, key: `${offset}-highlight`, value: highlightedValue })
    offset += highlightedValue.length
    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < highlighted.length) {
    segments.push({ highlighted: false, key: `${offset}-plain`, value: highlighted.slice(lastIndex) })
  }

  return segments
}

const HighlightedText = ({ text, query, keyPrefix }: { text: string; query: string; keyPrefix: string }) => {
  return getHighlightSegments(text, query).map((segment) =>
    segment.highlighted ? (
      <mark key={`${keyPrefix}-${segment.key}`} className='bg-primary/20 text-foreground'>
        {segment.value}
      </mark>
    ) : (
      <span key={`${keyPrefix}-${segment.key}`}>{segment.value}</span>
    )
  )
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    q?: string
  }>
}) {
  const [{ locale }, { q: query = '' }] = await Promise.all([params, searchParams])
  const activeLocale = resolveLocale(locale)
  const trimmedQuery = query.trim()

  type SearchTranslation = {
    locale: 'fr' | 'es' | 'en' | 'pt'
    title: string
    bodyMd: string
    published: boolean
  }
  type SearchArticle = {
    _id: string
    legacyId?: string
    status: string
    createdAt: number
    translations: SearchTranslation[]
  }

  const [t, fetchedArticles] = await Promise.all([
    getTranslations(),
    trimmedQuery ? publicQuery(api.articles.search, { query: trimmedQuery, locale: activeLocale }) : Promise.resolve([] as never[]),
  ])
  const articles = fetchedArticles as unknown as SearchArticle[]

  let searchResults: SearchResultCard[] = []

  if (trimmedQuery) {
    searchResults = articles.reduce<SearchResultCard[]>((results, article) => {
      if ((article.legacyId ?? article._id) === METHOD_ARTICLE_ID) {
        return results
      }

      const translationForLocale = article.translations.find((translation) => translation.locale === activeLocale)
      const fallbackTranslation = article.translations.find((translation) => translation.locale === 'en')
      const translation = translationForLocale ?? fallbackTranslation

      if (!translation) {
        return results
      }

      results.push({
        id: (article.legacyId ?? article._id),
        title: translation.title,
        createdAt: new Date(article.createdAt),
        locale: translation.locale as Locale,
        isFallback: translation.locale !== activeLocale,
        previewMd: buildPreviewMarkdown(highlightText(translation.bodyMd, query)),
      })

      return results
    }, [])
  }

  return (
    <Section className='px-6 py-12'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-10'>
        <div className='space-y-3'>
          <h1 className='font-semibold text-4xl text-foreground tracking-tight'>{t('Search.title')}</h1>

          {query.trim() ? (
            <p className='max-w-2xl text-base text-muted-foreground'>
              {t('Search.results_for', { query })}
              {searchResults.length > 0 && (
                <span className='ml-2 font-medium text-foreground'>
                  ({t('Search.results_count', { count: searchResults.length })})
                </span>
              )}
            </p>
          ) : (
            <p className='max-w-2xl text-base text-muted-foreground'>{t('Search.enter_query')}</p>
          )}
        </div>

        {query.trim() && searchResults.length > 0 ? (
          <div className='flex flex-col gap-10'>
            {searchResults.map((result) => {
              const publishedLabel = t('Publications.published_on', {
                date: formatDate(activeLocale, result.createdAt),
              })
              const languageName = t(LOCALE_LABEL_KEYS[result.locale])

              return (
                <article key={result.id} className='rounded-2xl border border-border/60 p-6 shadow-xs'>
                  <div className='flex flex-col gap-3'>
                    <div className='flex flex-wrap items-center gap-3 font-medium text-muted-foreground text-xs'>
                      <span>{publishedLabel}</span>

                      {!!result.isFallback && (
                        <span className='rounded-full bg-muted px-2 py-1 font-semibold text-[11px] text-foreground uppercase tracking-wide'>
                          {t('Publications.fallback_notice', { language: languageName })}
                        </span>
                      )}
                    </div>

                    <h2 className='font-semibold text-2xl text-foreground'>
                      <HighlightedText text={result.title} query={query} keyPrefix={result.id} />
                    </h2>

                    <div className='text-base text-muted-foreground leading-relaxed [&_a]:underline'>
                      <MarkdownPreview markdown={result.previewMd} highlightMode />
                    </div>

                    <div className='pt-2'>
                      <Link href={`/content/${result.id}`}>
                        <Button size='sm' className='cursor-pointer'>
                          {t('Publications.read_more')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : query.trim() ? (
          <div className='flex flex-col items-center gap-4 py-16 text-center'>
            <p className='text-lg text-muted-foreground'>{t('Search.no_results')}</p>
            <Link href='/content'>
              <Button variant='outline' className='cursor-pointer'>
                {t('Search.browse_publications')}
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </Section>
  )
}
