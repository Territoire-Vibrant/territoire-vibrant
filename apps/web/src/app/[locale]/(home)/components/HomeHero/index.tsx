import { useTranslations } from 'next-intl'
import Image from 'next/image'

import { ArrowRightIcon, LeafIcon, LightbulbIcon, PlayIcon, UsersThreeIcon } from '@phosphor-icons/react/dist/ssr'

import CommunityImage from '~/assets/images/home/hero/community.jpg'
import LandscapeImage from '~/assets/images/home/intro/landscape.jpg'

import { Link } from '~/i18n/navigation'

export const HomeHero = () => {
  const t = useTranslations()

  return (
    <div className='grid w-full items-stretch gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14'>
      <div className='flex flex-col justify-center'>
        <p className='font-semibold text-primary text-sm tracking-[0.08em]'>{t('Home.hero.subtitle')}</p>

        <h1 className='mt-6 max-w-[560px] font-bold text-[clamp(2.7rem,5.1vw,4.65rem)] leading-[1.03] tracking-[-0.045em]'>
          {t.rich('Home.hero.title', {
            v: (chunks) => <span className='tv-vibrate-5s text-primary'>{chunks}</span>,
          })}
        </h1>

        <div className='mt-6 flex w-56 items-center gap-2 text-primary' aria-hidden>
          <span className='h-px flex-1 bg-primary/75' />
          <LeafIcon className='size-7 -rotate-12' weight='duotone' />
        </div>

        <div className='mt-8 max-w-[510px] space-y-6 text-foreground/78 text-lg leading-relaxed'>
          <p>{t('Home.hero.paragraph_1')}</p>
          <p>{t('Home.hero.paragraph_2')}</p>
        </div>

        <div className='mt-9 flex flex-wrap items-center gap-5'>
          <Link
            href='/who-we-are'
            className='inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground text-sm shadow-sm transition-[transform,background-color,box-shadow] ease-out hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md'
          >
            <LeafIcon size={18} weight='duotone' />
            {t('Home.hero.cta_approach')}
          </Link>

          <div className='hidden h-9 w-px bg-foreground/15 sm:block' />

          <Link
            href='/method'
            className='inline-flex min-h-12 items-center gap-3 font-semibold text-foreground text-sm transition-colors hover:text-primary'
          >
            <span className='flex size-9 items-center justify-center rounded-full border border-foreground/40'>
              <PlayIcon size={14} weight='fill' />
            </span>
            {t('Home.hero.cta_method')}
          </Link>
        </div>
      </div>

      <div className='grid min-h-[520px] gap-2 sm:grid-cols-[0.42fr_0.58fr] sm:grid-rows-2'>
        <article className='flex min-h-64 flex-col justify-between rounded-xl bg-[#edf3df] p-6 sm:min-h-0'>
          <UsersThreeIcon size={38} weight='duotone' className='text-primary' />
          <div>
            <h2 className='max-w-[210px] font-bold text-2xl leading-tight'>{t('Home.hero.box_tourism.title')}</h2>
            <div className='my-4 h-px w-10 bg-primary' aria-hidden />
            <p className='text-[15px] text-foreground/78 leading-relaxed'>{t('Home.hero.box_tourism.subtext')}</p>
          </div>
          <Link
            href='/services'
            className='mt-5 inline-flex items-center gap-2 font-semibold text-sm hover:text-primary'
          >
            {t('find_out_more')} <ArrowRightIcon size={14} />
          </Link>
        </article>

        <figure className='relative min-h-64 overflow-hidden rounded-xl sm:min-h-0'>
          <Image
            src={CommunityImage}
            alt={t('Home.hero.community_image_alt')}
            priority
            className='absolute inset-0 size-full object-cover'
          />
          <div className='absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent' />
          <figcaption className='absolute inset-x-0 bottom-0 p-5 font-semibold text-white leading-snug'>
            {t('Home.hero.community_image_alt')}
          </figcaption>
        </figure>

        <figure className='relative min-h-64 overflow-hidden rounded-xl sm:min-h-0'>
          <Image
            src={LandscapeImage}
            alt={t('Home.hero.landscape_image_alt')}
            className='absolute inset-0 size-full object-cover'
          />
          <div className='absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent' />
          <figcaption className='absolute inset-x-0 bottom-0 p-5 font-semibold text-white leading-snug'>
            {t('Home.hero.landscape_image_alt')}
          </figcaption>
        </figure>

        <article className='flex min-h-64 flex-col justify-between rounded-xl bg-[#765f50] p-6 text-white sm:min-h-0'>
          <LightbulbIcon size={38} weight='duotone' className='text-white/85' />
          <div>
            <h2 className='max-w-[210px] font-bold text-2xl leading-tight'>{t('Home.hero.box_economy.title')}</h2>
            <div className='my-4 h-px w-10 bg-white/70' aria-hidden />
            <p className='text-[15px] text-white/80 leading-relaxed'>{t('Home.hero.box_economy.subtext')}</p>
          </div>
          <Link
            href='/services'
            className='mt-5 inline-flex items-center gap-2 font-semibold text-sm text-white hover:text-white/75'
          >
            {t('find_out_more')} <ArrowRightIcon size={14} />
          </Link>
        </article>
      </div>
    </div>
  )
}
