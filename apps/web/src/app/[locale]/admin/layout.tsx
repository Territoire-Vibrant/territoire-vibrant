import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { getLocale, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Toaster } from '~/components/ui/sonner'

import { Link, redirect } from '~/i18n/navigation'
import { isAdminFromSessionClaims } from '~/lib/utils'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  /**
   * Resource-based auth check, as Clerk recommends over relying on middleware
   * alone: path matching can diverge from how Next.js actually routes a
   * request, leaving a protected page reachable. The proxy still redirects
   * unauthenticated visitors so they land on sign-in rather than a bare 404,
   * but this layout is what actually guards every page beneath it.
   *
   * The Convex side is independent of both: `requireAdmin` re-reads `isAdmin`
   * from the user's row on every call, so a forged session claim buys nothing.
   */
  const [{ userId, sessionClaims }, locale] = await Promise.all([auth(), getLocale()])

  if (!userId || !isAdminFromSessionClaims(sessionClaims)) {
    redirect({ href: '/', locale })
  }

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
