import '@uiw/react-markdown-preview/markdown.css'

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { notFound } from '~/i18n/navigation'

import { MarkdownPreview } from '~/components/MarkdownPreview'
import { Section } from '~/layouts/Section'

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

const formatDate = (locale: Locale, date: Date) => {
  return DATE_FORMATTERS[locale].format(date)
}

export const metadata: Metadata = {
  title: 'Publication',
  description: 'Read a Territoire Vibrant publication.',
}

export default async function PublicationArticlePage({
  params,
}: {
  params: Promise<{
    articleId: string
    locale: string
  }>
}) {
  const { articleId, locale } = await params
  const activeLocale = resolveLocale(locale)
  const [t, article] = await Promise.all([
    getTranslations(),
    // getByAnyId also resolves pre-migration Postgres UUIDs, so old links keep working.
    publicQuery(api.articles.getByAnyId, { id: articleId }),
  ])

  if (article?.status !== 'PUBLISHED') {
    notFound()
  }

  const translationForLocale = article.translations.find(
    (translation) => translation.locale === activeLocale && translation.published
  )
  const fallbackTranslation = article.translations.find(
    (translation) => translation.locale === 'en' && translation.published
  )
  const translation = translationForLocale ?? fallbackTranslation

  if (!translation) {
    notFound()
  }

  const translationLocale = translation.locale as Locale
  const languageName = t(LOCALE_LABEL_KEYS[translationLocale])
  const isFallback = translationLocale !== activeLocale

  return (
    <Section className='px-6 py-12'>
      <article className='mx-auto flex w-full max-w-3xl flex-col gap-6'>
        <div className='space-y-4'>
          <Link
            href='/content?category=publications'
            className='font-semibold text-primary text-sm uppercase tracking-[0.2em] hover:underline'
          >
            {t('publications')}
          </Link>

          <h1 className='font-semibold text-4xl text-foreground tracking-tight'>{translation.title}</h1>

          <div className='flex flex-wrap items-center gap-3 font-medium text-muted-foreground text-xs'>
            <span>{t('Publications.published_on', { date: formatDate(activeLocale, new Date(article.createdAt)) })}</span>

            {!!isFallback && (
              <span className='rounded-full bg-muted px-2 py-1 font-semibold text-[11px] text-foreground uppercase tracking-wide'>
                {t('Publications.fallback_notice', { language: languageName })}
              </span>
            )}
          </div>
        </div>

        <MarkdownPreview markdown={translation.bodyMd} />
      </article>
    </Section>
  )
}
