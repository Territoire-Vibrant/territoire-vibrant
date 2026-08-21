'use client'

import AutoScroll from 'embla-carousel-auto-scroll'
import { useTranslations } from 'next-intl'

import Angela from '~/assets/images/members/angela.png'
import Erica from '~/assets/images/members/erica.png'
import Lilliam from '~/assets/images/members/lilliam.png'
import Marco from '~/assets/images/members/marco.png'
import Pedro from '~/assets/images/members/pedro.png'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel'
import { TeamCard } from './TeamCard'

export const TeamCarousel = () => {
  const t = useTranslations()

  return (
    <Carousel
      opts={{
        loop: true,
      }}
      plugins={[
        AutoScroll({
          playOnInit: true,
          speed: 1.3,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
          stopOnFocusIn: false,
          startDelay: 0,
        }),
      ]}
      className='w-full max-w-6xl'
    >
      <CarouselContent className='py-2'>
        <CarouselItem className='sm:basis-1/2 md:basis-1/3 lg:basis-1/4'>
          <TeamCard
            name={t('WhoWeAre.team.marco.name')}
            position={t('WhoWeAre.team.marco.role')}
            bio={t('WhoWeAre.team.marco.bio')}
            image={Marco}
          />
        </CarouselItem>

        <CarouselItem className='sm:basis-1/2 md:basis-1/3 lg:basis-1/4'>
          <TeamCard
            name={t('WhoWeAre.team.pedro.name')}
            position={t('WhoWeAre.team.pedro.role')}
            bio={t('WhoWeAre.team.pedro.bio')}
            image={Pedro}
          />
        </CarouselItem>

        <CarouselItem className='sm:basis-1/2 md:basis-1/3 lg:basis-1/4'>
          <TeamCard
            name={t('WhoWeAre.team.lilliam.name')}
            position={t('WhoWeAre.team.lilliam.role')}
            bio={t('WhoWeAre.team.lilliam.bio')}
            image={Lilliam}
          />
        </CarouselItem>

        <CarouselItem className='sm:basis-1/2 md:basis-1/3 lg:basis-1/4'>
          <TeamCard
            name={t('WhoWeAre.team.erica.name')}
            position={t('WhoWeAre.team.erica.role')}
            bio={t('WhoWeAre.team.erica.bio')}
            image={Erica}
          />
        </CarouselItem>

        <CarouselItem className='sm:basis-1/2 md:basis-1/3 lg:basis-1/4'>
          <TeamCard
            name={t('WhoWeAre.team.angela.name')}
            position={t('WhoWeAre.team.angela.role')}
            bio={t('WhoWeAre.team.angela.bio')}
            image={Angela}
          />
        </CarouselItem>
      </CarouselContent>

      <CarouselPrevious className='hidden' />
      <CarouselNext className='hidden' />
    </Carousel>
  )
}
