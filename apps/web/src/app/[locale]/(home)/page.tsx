import { useTranslations } from 'next-intl'
import type { Metadata } from 'next'

import HomeBanner1 from '~/assets/images/home/home_banner_1.png'
import HomeBanner2 from '~/assets/images/home/home_banner_2.png'
import ProjectOneImage from '~/assets/images/projects/project_1.png'
import ProjectTwoImage from '~/assets/images/projects/project_2.png'
import ProjectThreeImage from '~/assets/images/projects/project_3.png'

import { Section } from '~/layouts/Section'
import { BannerCarousel } from './components/BannerCarousel'
import { ContactSection } from './components/ContactSection'
import { HomeHero } from './components/HomeHero'
import { ProjectsSection } from './components/ProjectsSection'
import { ServicesSection } from './components/ServicesSection'

export const metadata: Metadata = {
  title: 'Territoire Vibrant',
  description: 'Territoire Vibrant creates cultural and territorial projects.',
}

export default function HomePage() {
  const t = useTranslations()

  return (
    <>
      <Section className='max-w-[1180px]! px-6 py-12 lg:py-14'>
        <HomeHero />
      </Section>

      <ProjectsSection
        projects={[
          {
            image: ProjectOneImage,
            title: t('Home.projects.project_1.title'),
            description: t('Home.projects.project_1.description'),
            icon: 'network',
          },
          {
            image: ProjectTwoImage,
            title: t('Home.projects.project_2.title'),
            description: t('Home.projects.project_2.description'),
            icon: 'growth',
          },
          {
            image: ProjectThreeImage,
            title: t('Home.projects.project_3.title'),
            description: t('Home.projects.project_3.description'),
            icon: 'voice',
          },
        ]}
      />

      <ServicesSection />

      <Section className='px-6 py-12'>
        <BannerCarousel
          slides={[
            {
              src: HomeBanner1,
              alt: 'Banner 1',
              topSentence: t('Home.banner_sentence_1'),
              bottomSentence: `Mac Neves | ${t('territoire_vibrant')} ${t('founder')}`,
            },
            {
              src: HomeBanner2,
              alt: 'Banner 2',
              topSentence: t('Home.banner_sentence_2'),
              bottomSentence: `Mac Neves | ${t('territoire_vibrant')} ${t('architect_of_Territories')}`,
            },
          ]}
        />
      </Section>

      <ContactSection />
    </>
  )
}
