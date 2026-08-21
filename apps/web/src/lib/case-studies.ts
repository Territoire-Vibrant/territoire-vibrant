import type { StaticImageData } from 'next/image'

import enMessages from '~/messages/en.json'
import esMessages from '~/messages/es.json'
import frMessages from '~/messages/fr.json'
import ptMessages from '~/messages/pt.json'

import SantaMariaCaseStudyCover from '~/assets/images/content/santa-maria-case-study-cover.jpeg'

export const CONTENT_LOCALES = ['en', 'es', 'fr', 'pt'] as const

export type ContentLocale = (typeof CONTENT_LOCALES)[number]
export type ContentCategory = 'insights' | 'publications'
export type LocalizedText = Record<ContentLocale, string>

export type CaseStudy = {
  id: 'santa-maria'
  category: 'insights'
  downloadUrl: '/downloads/santa-maria-socio-territorial-diagnostic.pdf'
  coverImage: StaticImageData
  downloadFileName: 'santa-maria-socio-territorial-diagnostic.pdf'
  title: LocalizedText
  description: LocalizedText
  coverAlt: LocalizedText
}

export const resolveContentLocale = (value: string): ContentLocale => {
  return CONTENT_LOCALES.includes(value as ContentLocale) ? (value as ContentLocale) : 'en'
}

export const isContentCategory = (value: string | undefined): value is ContentCategory => {
  return value === 'publications' || value === 'insights'
}

export const CASE_STUDIES: readonly CaseStudy[] = [
  {
    id: 'santa-maria',
    category: 'insights',
    downloadUrl: '/downloads/santa-maria-socio-territorial-diagnostic.pdf',
    coverImage: SantaMariaCaseStudyCover,
    downloadFileName: 'santa-maria-socio-territorial-diagnostic.pdf',
    title: {
      en: enMessages.CaseStudies.items.santa_maria.title,
      es: esMessages.CaseStudies.items.santa_maria.title,
      fr: frMessages.CaseStudies.items.santa_maria.title,
      pt: ptMessages.CaseStudies.items.santa_maria.title,
    },
    description: {
      en: enMessages.CaseStudies.items.santa_maria.description,
      es: esMessages.CaseStudies.items.santa_maria.description,
      fr: frMessages.CaseStudies.items.santa_maria.description,
      pt: ptMessages.CaseStudies.items.santa_maria.description,
    },
    coverAlt: {
      en: enMessages.CaseStudies.items.santa_maria.cover_alt,
      es: esMessages.CaseStudies.items.santa_maria.cover_alt,
      fr: frMessages.CaseStudies.items.santa_maria.cover_alt,
      pt: ptMessages.CaseStudies.items.santa_maria.cover_alt,
    },
  },
] as const
