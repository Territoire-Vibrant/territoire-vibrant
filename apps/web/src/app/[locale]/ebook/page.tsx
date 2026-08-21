import { BookOpenTextIcon } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Section } from '~/layouts/Section'
import { EbookLeadForm } from './components/EbookLeadForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Ebook')
  return {
    title: t('page_title'),
    description: t('hero_subtitle'),
  }
}

export default async function EbookPage() {
  const t = await getTranslations('Ebook')

  return (
    <Section className='px-6 py-16'>
      <div className='mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-2 md:items-center'>
        {/* Left column: book cover + headline */}
        <div className='flex flex-col items-start gap-8'>
          {/* Book cover placeholder - swap for <Image> when the real asset exists */}
          <div className='flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center gap-4 rounded-2xl border border-foreground/10 bg-primary/5 p-10 shadow-lg'>
            <div className='flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <BookOpenTextIcon className='size-10' weight='duotone' />
            </div>
            <div className='text-center'>
              <p className='font-bold text-foreground text-xl leading-snug'>{t('hero_headline')}</p>
              <p className='mt-1 text-foreground/50 text-sm'>Territoire Vibrant®</p>
            </div>
          </div>

          {/* Headline and subtitle */}
          <div>
            <h1 className='font-semibold text-3xl text-foreground tracking-tight'>{t('hero_headline')}</h1>
            <p className='mt-3 max-w-md text-foreground/70 leading-relaxed'>{t('hero_subtitle')}</p>
          </div>
        </div>

        {/* Right column: form card */}
        <div className='rounded-2xl border border-foreground/10 bg-foreground/2 p-6 sm:p-8'>
          <EbookLeadForm />
        </div>
      </div>
    </Section>
  )
}
