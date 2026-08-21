'use client'

import Autoplay from 'embla-carousel-autoplay'
import Fade from 'embla-carousel-fade'
import { useTranslations } from 'next-intl'
import Image, { type StaticImageData } from 'next/image'

import { Button } from '~/components/ui/button'
import { Carousel, CarouselContent, CarouselItem } from '~/components/ui/carousel'

import { Link } from '~/i18n/navigation'

export type BannerSlide = {
  src: StaticImageData | string
  alt?: string
  topSentence: string
  bottomSentence: string
}

const getSlideKey = (slide: BannerSlide) => {
  const imageSource = typeof slide.src === 'string' ? slide.src : slide.src.src
  return `${imageSource}:${slide.topSentence}:${slide.bottomSentence}`
}

export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const t = useTranslations()

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[
        Autoplay({
          delay: 10000,
          stopOnInteraction: false,
          stopOnMouseEnter: false,
        }),
        Fade(),
      ]}
      className='w-full'
    >
      <CarouselContent className='ml-0 grid grid-cols-1 *:pl-0'>
        {slides.map((slide, i) => (
          <CarouselItem key={getSlideKey(slide)} className='col-start-1 row-start-1'>
            <div className='flex flex-col'>
              <p className='py-3 text-center font-medium md:text-2xl'>{slide.topSentence}</p>

              <div className='relative aspect-21/9 w-full overflow-hidden rounded-xl'>
                <Image
                  src={slide.src}
                  alt={slide.alt ?? `Banner ${i + 1}`}
                  fill
                  sizes='100vw'
                  priority={i === 0}
                  className='object-cover'
                />
              </div>

              <p className='py-3 text-center text-sm md:text-xl'>{slide.bottomSentence}</p>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <Link href='/portfolio' prefetch>
        <Button
          type='button'
          variant='outline'
          className='absolute top-full left-4 h-fit -translate-y-1/2 cursor-pointer rounded-sm px-2 py-1.5 text-xs transition-colors ease-out hover:bg-primary hover:text-background sm:top-[95%] lg:top-[96%]'
        >
          {t('portfolio')}
        </Button>
      </Link>
    </Carousel>
  )
}
