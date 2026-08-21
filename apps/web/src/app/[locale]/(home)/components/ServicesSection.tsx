'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Carousel, CarouselContent, CarouselItem, useCarousel } from '~/components/ui/carousel'
import { Section } from '~/layouts/Section'

import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'

const SERVICE_KEYS = [
  {
    title: 'Home.services.service_1.title',
    description: 'Home.services.service_1.description',
  },
  {
    title: 'Home.services.service_2.title',
    description: 'Home.services.service_2.description',
  },
  {
    title: 'Home.services.service_3.title',
    description: 'Home.services.service_3.description',
  },
  {
    title: 'Home.services.service_4.title',
    description: 'Home.services.service_4.description',
  },
  {
    title: 'Home.services.service_5.title',
    description: 'Home.services.service_5.description',
  },
  {
    title: 'Home.services.service_6.title',
    description: 'Home.services.service_6.description',
  },
  {
    title: 'Home.services.service_7.title',
    description: 'Home.services.service_7.description',
  },
  {
    title: 'Home.services.service_8.title',
    description: 'Home.services.service_8.description',
  },
] as const

export const ServicesSection = () => {
  return (
    <Section id='services' className='flex flex-col items-center gap-12 px-6 pt-14 pb-8 text-foreground'>
      <Carousel opts={{ align: 'start', loop: false }} className='w-[80vw] md:w-full'>
        <ServicesCarouselContent />
      </Carousel>
    </Section>
  )
}

const ServicesCarouselContent = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const { api: carouselApi } = useCarousel()

  const t = useTranslations()

  const services = useMemo(
    () =>
      SERVICE_KEYS.map(({ title, description }) => ({
        title: t(title),
        description: t(description),
      })),
    [t]
  )

  useEffect(() => {
    if (!carouselApi) return

    const handleSelect = () => {
      setActiveIndex(carouselApi.selectedScrollSnap())
    }

    handleSelect()

    carouselApi.on('select', handleSelect)

    return () => {
      carouselApi?.off('select', handleSelect)
    }
  }, [carouselApi])

  const handleSelectService = useCallback(
    (index: number) => {
      setActiveIndex(index)
      carouselApi?.scrollTo(index)
    },
    [carouselApi]
  )

  return (
    <div className='grid gap-12 md:grid-cols-[minmax(0,1.6fr)_minmax(0,2.4fr)] xl:gap-16'>
      <div className='flex flex-col items-center gap-6'>
        <h5 className='text-left font-semibold text-2xl'>{t('Home.services.title')}</h5>

        <div className='flex flex-col gap-3'>
          {services.map((service, index) => {
            const isActive = index === activeIndex

            return (
              <button
                key={service.title}
                type='button'
                aria-current={isActive}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-2xl border px-5 py-4 text-left transition-[color,background-color,border-color,box-shadow]',
                  isActive
                    ? 'border-primary/80 bg-primary/10 text-primary shadow-sm'
                    : 'border-foreground/10 text-foreground/80 hover:border-foreground/20 hover:bg-neutral-100/40'
                )}
                onClick={() => handleSelectService(index)}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-2 items-center justify-center rounded-full transition-colors',
                    isActive ? 'bg-primary' : 'bg-foreground/40 group-hover:bg-neutral/70'
                  )}
                >
                  <span className='sr-only'>{service.title}</span>
                </span>

                <span className='font-semibold text-sm'>{service.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className='h-full w-[80vw] rounded-3xl border border-foreground/10 bg-foreground/2 p-6 sm:p-8 md:w-full'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-between font-semibold text-primary/60 text-sm uppercase tracking-[0.3em]'>
            <span>{t('Home.services.living_territories')}</span>
          </div>

          <CarouselContent className='-ml-6 h-full select-none'>
            {services.map((service) => (
              <CarouselItem key={service.title} className='h-full pb-10 pl-6'>
                <div className='mt-6 flex flex-col gap-4'>
                  <h6 className='font-semibold text-2xl md:text-3xl'>{service.title}</h6>

                  <p className='text-base text-foreground/80 leading-relaxed md:text-lg'>{service.description}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className='transition-transform ease-out hover:translate-y-1'>
            <Link
              href='/method'
              prefetch
              className='bg-primary px-4 py-3 font-semibold text-background text-sm transition-opacity ease-out hover:opacity-90'
            >
              {t('know_our_architecture')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
