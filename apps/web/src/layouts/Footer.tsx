import { GlobeHemisphereWestIcon } from '@phosphor-icons/react/dist/ssr'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import Inflorescence from '~/assets/images/partners/inflorescence.png'
import MonCarrefourWeb from '~/assets/images/partners/mon-carrefour-web.png'
import SoAndCo from '~/assets/images/partners/so&co.png'

const PARTNERS = [
  { label: 'SO&CO', image: SoAndCo, href: 'https://www.soetco.ca/', sizeClass: 'size-[210px]' },
  {
    label: 'Inflorescence Clinique',
    image: Inflorescence,
    href: 'https://www.cliniqueinflorescence.com/',
    sizeClass: 'size-[145px]',
  },
  {
    label: 'Mon Carrefour Web',
    image: MonCarrefourWeb,
    href: 'https://moncarrefourweb.org/',
    sizeClass: 'size-[130px]',
  },
] as const

export const Footer = async () => {
  const t = await getTranslations()

  return (
    <footer className='border-foreground/8 border-t bg-[#f4f6ef]'>
      <div className='mx-auto grid w-full max-w-[1180px] gap-8 px-6 py-9 lg:grid-cols-[250px_1fr] lg:items-center'>
        <div>
          <p className='font-semibold text-lg leading-snug'>{t('Footer.partners_heading')}</p>
          <div className='mt-4 h-px w-10 bg-primary' aria-hidden />
        </div>

        <div className='grid grid-cols-2 items-center gap-5 sm:grid-cols-5'>
          {PARTNERS.map((partner) => (
            <a
              key={partner.label}
              href={partner.href}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={partner.label}
              className='relative flex h-14 items-center justify-center overflow-hidden border-foreground/10 sm:border-l'
            >
              <Image
                src={partner.image}
                alt={partner.label}
                className={`${partner.sizeClass} absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 opacity-70 brightness-0`}
              />
            </a>
          ))}
          <div className='flex h-14 items-center justify-center border-foreground/10 text-center font-serif text-lg leading-none sm:border-l'>
            école
            <br />
            vivante
          </div>
          <div className='flex h-14 items-center justify-center border-foreground/10 text-center text-xs leading-tight sm:border-l'>
            <span className='font-semibold text-base'>1000 ÁRVORES</span>
            <br />
            POR AMANHÃ
          </div>
        </div>
      </div>

      <div className='border-foreground/8 border-t bg-background/60'>
        <div className='mx-auto flex w-full max-w-[1180px] items-center gap-4 px-6 py-5 text-foreground/75 text-sm'>
          <GlobeHemisphereWestIcon className='size-6 shrink-0 text-foreground' weight='duotone' />
          <p>{t('Home.developed_between')}</p>
        </div>
      </div>
    </footer>
  )
}
