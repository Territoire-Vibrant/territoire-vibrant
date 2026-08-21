import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

type SectionProps = {
  children: ReactNode
  className?: string
  limitWidth?: boolean
  id?: string
}

export const Section = ({ id, children, className, limitWidth = true }: SectionProps) => {
  return (
    <section id={id} className='flex w-full justify-center'>
      <div
        data-limit-width={limitWidth}
        className={cn(
          'w-full bg-background data-[limit-width=false]:max-w-full data-[limit-width=true]:max-w-6xl',
          className
        )}
      >
        {children}
      </div>
    </section>
  )
}
