import Image from 'next/image'

import Inflorescence from '~/assets/images/partners/inflorescence.png'
import MonCarrefourWeb from '~/assets/images/partners/mon-carrefour-web.png'
import SoAndCo from '~/assets/images/partners/so&co.png'
import { cn } from '~/lib/utils'

export const SponsorsMarquee = ({ className }: { className?: string }) => (
  <div className={cn('grid w-full grid-cols-2 items-center sm:grid-cols-3 lg:grid-cols-5', className)}>
    <span className='relative mx-auto block h-14 w-full overflow-hidden border-[#d9d9cf] lg:border-l'>
      <Image
        src={SoAndCo}
        alt='SO&CO'
        className='absolute top-1/2 left-1/2 size-[190px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-75 brightness-0'
      />
    </span>
    <span className='relative mx-auto block h-14 w-full overflow-hidden border-[#d9d9cf] border-l'>
      <Image
        src={Inflorescence}
        alt='Inflorescence Clinique'
        className='absolute top-1/2 left-1/2 size-[135px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-75 brightness-0'
      />
    </span>
    <span className='relative mx-auto block h-14 w-full overflow-hidden border-[#d9d9cf] border-l max-sm:border-t'>
      <Image
        src={MonCarrefourWeb}
        alt='Mon Carrefour Web'
        className='absolute top-1/2 left-1/2 size-[120px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-75 brightness-0'
      />
    </span>
    <span className='flex h-14 w-full items-center justify-center border-[#d9d9cf] border-l px-4 text-center font-medium text-[#21382a] text-lg leading-[0.9] max-lg:border-t'>
      <span>
        école
        <br />
        vivante
      </span>
    </span>
    <span className='flex h-14 w-full items-center justify-center border-[#d9d9cf] border-l px-4 text-center font-bold text-[#17452d] text-sm leading-tight max-sm:col-span-2 max-lg:border-t'>
      <span>
        1000 ÁRVORES
        <br />
        <span className='font-normal text-[0.65rem]'>POR AMANHÃ</span>
      </span>
    </span>
  </div>
)
