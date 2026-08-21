import { HandshakeIcon, LeafIcon } from '@phosphor-icons/react/dist/ssr'
import { useTranslations } from 'next-intl'
import type { StaticImageData } from 'next/image'

import { Link } from '~/i18n/navigation'
import { ProjectCard } from './ProjectCard'
import { SponsorsMarquee } from './SponsorsMarquee'
import { StatsSection } from './StatsSection'

type Project = {
  image: StaticImageData
  title: string
  description: string
  icon: 'network' | 'growth' | 'voice'
}

type ProjectsSectionProps = {
  projects: Project[]
}

export const ProjectsSection = ({ projects }: ProjectsSectionProps) => {
  const t = useTranslations()

  return (
    <section id='projects' className='w-full scroll-mt-20 bg-[#f7f5ee] px-3 py-8 sm:px-5 lg:py-12'>
      <div className='mx-auto w-full max-w-[1480px]'>
        <div className='projects-panel relative isolate overflow-hidden rounded-[24px] px-5 py-10 text-white sm:px-8 lg:px-10 lg:py-12 xl:px-14'>
          <div className='pointer-events-none absolute -bottom-14 -left-9 hidden opacity-35 lg:block' aria-hidden>
            <LeafIcon size={190} weight='thin' className='-rotate-12 text-[#8dbd2c]' />
          </div>

          <div className='relative z-10 grid gap-10 xl:grid-cols-[minmax(280px,0.86fr)_minmax(0,2.34fr)] xl:items-center xl:gap-12'>
            <div className='mx-auto max-w-[31rem] text-center xl:mx-0 xl:max-w-[22rem] xl:text-left'>
              <div className='flex items-center justify-center gap-2 font-medium text-[#9bc933] text-sm uppercase tracking-[0.04em] xl:justify-start'>
                <LeafIcon size={20} weight='thin' aria-hidden />
                <span>{t('Home.projects.eyebrow')}</span>
              </div>

              <h2 className='mt-6 font-bold text-4xl leading-[1.14] tracking-[-0.035em] sm:text-[2.7rem]'>
                {t('Home.projects.heading')}{' '}
                <span className='block text-[#78aa22]'>{t('Home.projects.heading_highlight')}</span>
              </h2>

              <div className='my-7 flex items-center justify-center gap-3 xl:justify-start' aria-hidden>
                <span className='h-px w-32 bg-[#8dbd2c]' />
                <LeafIcon size={20} weight='thin' className='text-[#8dbd2c]' />
              </div>

              <p className='text-[0.98rem] text-white/84 leading-[1.75]'>{t('Home.projects.description')}</p>

              <Link
                href='/contact'
                prefetch
                className='mt-8 inline-flex min-h-12 items-center gap-3 rounded-[9px] border border-[#77aa21] px-5 font-semibold text-sm transition-colors hover:bg-[#77aa21] hover:text-white focus-visible:outline-2 focus-visible:outline-[#a9d84b] focus-visible:outline-offset-4'
              >
                <HandshakeIcon size={19} weight='duotone' aria-hidden />
                {t('Home.projects.partnership_cta')}
              </Link>
            </div>

            <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
              {projects.map((project) => (
                <ProjectCard key={project.title} {...project} learnMoreLabel={t('find_out_more')} />
              ))}
            </div>
          </div>

          <div className='relative z-10 mt-10 xl:mt-9'>
            <StatsSection />
          </div>
        </div>

        <div className='border-[#d9d9cf] border-b px-2 py-6 sm:px-5'>
          <div className='mx-auto flex max-w-[1200px] flex-col items-center gap-5 lg:flex-row'>
            <div className='w-full shrink-0 text-center lg:w-[225px] lg:text-left'>
              <p className='font-semibold text-[#173425] text-[0.9rem] leading-snug'>{t('Footer.partners_heading')}</p>
              <span className='mx-auto mt-3 block h-px w-7 bg-[#82ac2c] lg:mx-0' aria-hidden />
            </div>
            <SponsorsMarquee />
          </div>
        </div>

        <div className='flex items-center justify-center gap-3 px-4 py-5 text-center text-[#66796b] text-xs sm:text-sm'>
          <span
            className='flex size-6 shrink-0 items-center justify-center rounded-full border border-[#75a126]'
            aria-hidden
          >
            <LeafIcon size={14} weight='thin' className='text-[#5f8f1c]' />
          </span>
          <p>{t('Home.developed_between')}</p>
        </div>
      </div>
    </section>
  )
}
