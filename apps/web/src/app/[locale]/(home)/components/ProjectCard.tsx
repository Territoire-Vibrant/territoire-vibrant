import { ArrowRightIcon, MicrophoneIcon, PlantIcon, UsersThreeIcon } from '@phosphor-icons/react/dist/ssr'
import Image, { type StaticImageData } from 'next/image'
import { Link } from '~/i18n/navigation'

type ProjectCardProps = {
  image: StaticImageData
  title: string
  description: string
  icon: 'network' | 'growth' | 'voice'
  learnMoreLabel: string
}

const projectIcons = {
  network: UsersThreeIcon,
  growth: PlantIcon,
  voice: MicrophoneIcon,
} as const

export const ProjectCard = ({ image, title, description, icon, learnMoreLabel }: ProjectCardProps) => {
  const Icon = projectIcons[icon]

  return (
    <Link
      href='/contact'
      prefetch
      className='group flex min-h-[31.5rem] w-full select-none flex-col overflow-hidden rounded-[14px] bg-[#f8f7ef] text-[#0b2f1e] shadow-[0_18px_38px_rgba(0,23,14,0.18)] transition-[transform,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(0,23,14,0.24)] focus-visible:outline-2 focus-visible:outline-[#8dbd2c] focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
    >
      <div className='project-card-pattern relative flex h-[14.25rem] shrink-0 items-center justify-center overflow-hidden border-[#d9dfca] border-b px-7 pt-4'>
        <Image
          src={image}
          alt=''
          className='size-[17rem] max-w-none object-contain'
          sizes='(max-width: 768px) 90vw, 300px'
        />
      </div>

      <div className='relative flex flex-1 flex-col items-center px-6 pt-11 pb-6 text-center'>
        <span className='absolute -top-7 flex size-14 items-center justify-center rounded-full bg-[#e8edd8] text-[#4d8c18] shadow-[0_8px_18px_rgba(37,85,22,0.12)] ring-1 ring-white/70'>
          <Icon size={25} weight='duotone' aria-hidden />
        </span>

        <h3 className='font-bold text-[1.2rem] leading-tight'>{title}</h3>
        <span className='mt-3 h-px w-9 bg-[#8dbd2c]' aria-hidden />
        <p className='mt-4 text-[#1d3528] text-[0.9rem] leading-[1.55]'>{description}</p>

        <span className='mt-auto flex items-center gap-2 pt-6 font-semibold text-[#5e951d] text-sm'>
          {learnMoreLabel}
          <ArrowRightIcon
            size={17}
            aria-hidden
            className='transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 motion-reduce:transition-none'
          />
        </span>
      </div>
    </Link>
  )
}
