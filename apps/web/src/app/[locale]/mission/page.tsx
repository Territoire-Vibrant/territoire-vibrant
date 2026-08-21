import type { Metadata } from 'next'
import { type Locale, useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import ImagePlaceholder1 from '~/assets/images/mission/mission-essence.svg'
import ImagePlaceholder2 from '~/assets/images/mission/mission-values.svg'

import {
  GlobeIcon,
  HandHeartIcon,
  LeafIcon,
  LightbulbIcon,
  ShieldIcon,
  UsersIcon,
} from '@phosphor-icons/react/dist/ssr'
import { Button } from '~/components/ui/button'
import { Section } from '~/layouts/Section'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: locale as Locale })

  return {
    title: `${t('mission')} - ${t('territoire_vibrant')}`,
  }
}

export default function MissionPage() {
  const t = useTranslations()

  const values = [
    { label: t('Mission.essence.values.item1'), Icon: HandHeartIcon, color: 'bg-rose-100 text-rose-700' },
    { label: t('Mission.essence.values.item2'), Icon: UsersIcon, color: 'bg-sky-100 text-sky-700' },
    { label: t('Mission.essence.values.item3'), Icon: LeafIcon, color: 'bg-green-100 text-green-700' },
    { label: t('Mission.essence.values.item4'), Icon: LightbulbIcon, color: 'bg-amber-100 text-amber-700' },
    { label: t('Mission.essence.values.item5'), Icon: ShieldIcon, color: 'bg-indigo-100 text-indigo-700' },
    { label: t('Mission.essence.values.item6'), Icon: GlobeIcon, color: 'bg-violet-100 text-violet-700' },
  ]

  return (
    <>
      <Section
        limitWidth={false}
        className='flex w-full flex-col items-center bg-linear-to-b from-green-50 to-background px-6 py-14 lg:py-20'
      >
        <div className='flex w-full max-w-3xl flex-col items-center text-center'>
          <div className='flex items-center gap-x-2'>
            <LeafIcon aria-hidden className='size-8 text-green-800' />

            <h1 className='bg-linear-to-r from-green-800 to-emerald-600 bg-clip-text font-semibold text-4xl text-transparent sm:text-5xl'>
              {t('mission')}
            </h1>
          </div>

          <div className='mt-6 w-full rounded-2xl border border-green-200/60 bg-background/70 p-6 text-green-900 shadow-md'>
            <p className='text-lg leading-relaxed'>{t('Mission.intro.p1')}</p>
            <hr className='my-4 border-green-100/70' />
            <p className='text-lg leading-relaxed'>{t('Mission.intro.p2')}</p>
          </div>

          <Button
            asChild
            className='mt-6 rounded-full bg-linear-to-r from-green-800 to-emerald-600 p-7 text-background text-base shadow-lg transition-opacity ease-out hover:opacity-90'
          >
            <a href='#essence' aria-label={t('Mission.essence.title')}>
              {t('Mission.essence.title')}
            </a>
          </Button>
        </div>
      </Section>

      <Section id='essence' className='w-full space-y-8 px-6 py-12 lg:py-16'>
        <h2 className='font-semibold text-2xl text-green-900 tsm:text-3xl'>{t('Mission.essence.title')}</h2>

        <div className='flex flex-col items-center md:flex-row'>
          <div className='space-y-6 md:w-1/2'>
            <div className='space-y-4 text-neutral-700'>
              <div className='flex items-start gap-4 rounded-xl border border-neutral-200 bg-background/80 p-5 shadow-sm backdrop-blur-sm'>
                <div className='inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700'>
                  <HandHeartIcon className='size-5' aria-hidden='true' />
                </div>

                <div className='space-y-1'>
                  <h3 className='font-semibold text-xl'>{t('Mission.essence.mission.title')}</h3>

                  <p>{t('Mission.essence.mission.p')}</p>
                </div>
              </div>

              <div className='flex items-start gap-4 rounded-xl border border-neutral-200 bg-background/80 p-5 shadow-sm backdrop-blur-sm'>
                <div className='inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700'>
                  <LightbulbIcon className='size-5' aria-hidden='true' />
                </div>

                <div className='space-y-1'>
                  <h4 className='font-semibold text-xl'>{t('Mission.essence.vision.title')}</h4>

                  <p>{t('Mission.essence.vision.p')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className='relative flex flex-col items-center justify-center md:w-1/2'>
            <Image
              src={ImagePlaceholder1}
              alt={t('Mission.essence.title')}
              width={800}
              height={600}
              className='h-auto w-full max-w-md drop-shadow-sm'
              priority
            />
            <p className='italic'>"{t('Mission.quote')}"</p>
          </div>
        </div>
      </Section>

      <Section className='w-full px-6 py-12 lg:py-16'>
        <div className='mx-auto max-w-6xl rounded-3xl border border-neutral-200 bg-linear-to-b from-background to-green-50 p-6 shadow-sm ring-1 ring-neutral-100 sm:p-10'>
          <div className='space-y-6'>
            <h5 className='font-semibold text-green-900 text-xl sm:text-2xl'>{t('Mission.essence.values.title')}</h5>

            <div className='grid gap-8 lg:grid-cols-2 lg:gap-10'>
              <div className='order-2 space-y-4 text-neutral-700 lg:order-1'>
                <ul className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  {values.map(({ label, Icon, color }) => (
                    <li
                      key={label}
                      className='group flex items-start gap-4 rounded-xl border border-neutral-200 bg-background p-5 shadow-sm ring-1 ring-neutral-100 transition-[transform,box-shadow] ease-out hover:-translate-y-0.5 hover:shadow-md'
                    >
                      <div className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                        <Icon className='size-5' aria-hidden='true' />
                      </div>

                      <p className='text-neutral-700'>{label}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='order-1 flex items-center justify-center lg:order-2'>
                <Image
                  src={ImagePlaceholder2}
                  alt={t('Mission.essence.values.title')}
                  width={800}
                  height={600}
                  className='h-auto w-full max-w-md drop-shadow-sm'
                />
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
