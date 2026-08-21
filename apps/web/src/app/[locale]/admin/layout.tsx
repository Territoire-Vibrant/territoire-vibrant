import { UserButton } from '@clerk/nextjs'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Toaster } from '~/components/ui/sonner'

import { Link } from '~/i18n/navigation'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations()

  return (
    <div className='flex flex-col items-center'>
      <header className='flex h-16 w-full items-center justify-center bg-yellow-200'>
        <nav className='flex w-full max-w-6xl items-center justify-between px-6'>
          <div className='flex items-center gap-6'>
            <Link href='/admin/content' className='font-semibold text-sm text-stone-800 hover:underline md:text-base'>
              {t('admin_nav_content')}
            </Link>

            <Link href='/admin/shop' className='font-semibold text-sm text-stone-800 hover:underline md:text-base'>
              {t('admin_nav_store')}
            </Link>
          </div>

          <UserButton />
        </nav>
      </header>

      <Toaster richColors />

      {children}
    </div>
  )
}
