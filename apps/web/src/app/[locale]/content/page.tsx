import '@uiw/react-markdown-preview/markdown.css'

import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { MarkdownPreview } from '~/components/MarkdownPreview'
import { Button } from '~/components/ui/button'
import { Section } from '~/layouts/Section'
import { METHOD_ARTICLE_ID } from '~/lib/constants'
import {
  CASE_STUDIES,
  type ContentCategory,
  type ContentLocale,
  resolveContentLocale,
  isContentCategory,
} from '~/lib/case-studies'
import { cn } from '~/lib/utils'

import { Link } from '~/i18n/navigation'
import { api } from '@tv/backend-client'

import { publicQuery } from '~/server/convex'

type Locale = ContentLocale

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

type ContentCategoryLink = {
  href: '/content?category=insights' | '/content?category=publications'
  key: ContentCategory
}

type PublishedArticleCard = {
  id: string
  title: string
  createdAt: Date
  locale: Locale
  isFallback: boolean
  previewMd: string
}

const CATEGORY_LINKS: readonly ContentCategoryLink[] = [
  { key: 'publications', href: '/content?category=publications' },
  { key: 'insights', href: '/content?category=insights' },
] as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string
  }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = resolveContentLocale(locale)
  const t = await getTranslations({ locale: activeLocale, namespace: 'Content' })

  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    category?: string | string[]
  }>
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams])
  const activeLocale = resolveContentLocale(locale)
  const categoryParam = Array.isArray(rawSearchParams.category) ? rawSearchParams.category[0] : rawSearchParams.category
  const activeCategory: ContentCategory = isContentCategory(categoryParam) ? categoryParam : 'publications'

  const [t, tContent, tCaseStudies, articles] = await Promise.all([
    getTranslations(),
    getTranslations('Content'),
    getTranslations('CaseStudies'),
    activeCategory === 'publications' ? publicQuery(api.articles.listPublished, {}) : Promise.resolve([]),
  ])

  const publishedArticles: PublishedArticleCard[] = articles.reduce<PublishedArticleCard[]>((cards, article) => {
    const publicId = article.legacyId ?? article._id
    if (article.status !== 'PUBLISHED' || publicId === METHOD_ARTICLE_ID) {
      return cards
    }

    const translationForLocale = article.translations.find(
      (translation) => translation.locale === activeLocale && translation.published
    )
    const fallbackTranslation = article.translations.find(
      (translation) => translation.locale === 'en' && translation.published
    )
    const translation = translationForLocale ?? fallbackTranslation

    if (!translation) {
      return cards
    }

    cards.push({
      id: article.legacyId ?? article._id,
      title: translation.title,
      createdAt: new Date(article.createdAt),
      locale: translation.locale as Locale,
      isFallback: translation.locale !== activeLocale,
      previewMd: buildPreviewMarkdown(translation.bodyMd),
    })

    return cards
  }, [])

  return (
    <Section className='px-6 py-12'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-10'>
        <div className='space-y-3'>
          <h1 className='font-semibold text-4xl text-foreground tracking-tight'>{tContent('title')}</h1>

          <p className='max-w-2xl text-base text-muted-foreground'>{tContent('subtitle')}</p>

          <div className='flex flex-wrap items-center gap-3 pt-2'>
            {CATEGORY_LINKS.map((categoryLink) => (
              <Link key={categoryLink.key} href={categoryLink.href}>
                <span
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-full border px-5 py-2 font-medium text-sm transition-[color,background-color,border-color,box-shadow]',
                    activeCategory === categoryLink.key
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-background text-foreground hover:border-primary/60 hover:text-primary'
                  )}
                >
                  {tContent(`categories.${categoryLink.key}`)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {activeCategory === 'publications' ? (
          <div className='flex flex-col gap-10'>
            <div className='flex flex-wrap items-center gap-4'>
              <Link href='/magazine'>
                <Button
                  variant='outline'
                  className='cursor-pointer border-primary text-primary hover:bg-primary hover:text-white'
                >
                  {t('magazine')}
                </Button>
              </Link>
            </div>

            {publishedArticles.length > 0 ? (
              <div className='flex flex-col gap-10'>
                {publishedArticles.map((articleCard) => {
                  const publishedLabel = t('Publications.published_on', {
                    date: formatDate(activeLocale, articleCard.createdAt),
                  })
                  const languageName = t(LOCALE_LABEL_KEYS[articleCard.locale])

                  return (
                    <article key={articleCard.id} className='rounded-2xl border border-border/60 p-6 shadow-xs'>
                      <div className='flex flex-col gap-3'>
                        <div className='flex flex-wrap items-center gap-3 font-medium text-muted-foreground text-xs'>
                          <span>{publishedLabel}</span>

                          {!!articleCard.isFallback && (
                            <span className='rounded-full bg-muted px-2 py-1 font-semibold text-[11px] text-foreground uppercase tracking-wide'>
                              {t('Publications.fallback_notice', { language: languageName })}
                            </span>
                          )}
                        </div>

                        <h3 className='font-semibold text-2xl text-foreground'>{articleCard.title}</h3>

                        <div className='text-base text-muted-foreground leading-relaxed [&_a]:underline'>
                          <MarkdownPreview markdown={articleCard.previewMd} />
                        </div>

                        <div className='pt-2'>
                          <Link href={`/content/${articleCard.id}`}>
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
            ) : (
              <p className='text-muted-foreground'>{t('no_publications_yet')}</p>
            )}
          </div>
        ) : (
          <div className='flex flex-col gap-8'>
            <div className='grid gap-6'>
              {CASE_STUDIES.map((caseStudy) => (
                <article key={caseStudy.id} className='overflow-hidden rounded-2xl border border-border/60 shadow-xs'>
                  <div className='grid gap-0 md:grid-cols-[minmax(260px,340px)_1fr]'>
                    <div className='relative min-h-[320px] bg-stone-100'>
                      <Image
                        src={caseStudy.coverImage}
                        alt={caseStudy.coverAlt[activeLocale]}
                        fill
                        sizes='(max-width: 767px) 100vw, 340px'
                        className='object-cover'
                      />

                      <div className='pointer-events-none absolute top-4 left-4 z-10'>
                        <span className='rounded-full bg-stone-900 px-3 py-1 font-semibold text-[11px] text-stone-50 uppercase tracking-[0.2em]'>
                          {tCaseStudies('file_type')}
                        </span>
                      </div>
                    </div>

                    <div className='flex flex-col justify-between gap-6 p-6 sm:p-8'>
                      <div className='space-y-4'>
                        <h3 className='max-w-3xl font-semibold text-2xl text-foreground leading-tight'>
                          {caseStudy.title[activeLocale]}
                        </h3>

                        <p className='max-w-3xl text-base text-muted-foreground leading-relaxed'>
                          {caseStudy.description[activeLocale]}
                        </p>
                      </div>

                      <div className='pt-2'>
                        <Button asChild size='lg' className='cursor-pointer'>
                          <a href={caseStudy.downloadUrl} download={caseStudy.downloadFileName}>
                            <ArrowDownIcon weight='bold' />
                            {tCaseStudies('download')}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
