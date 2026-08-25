import { clerkMiddleware } from '@clerk/nextjs/server'
import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'

import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const ADMIN_SEGMENT = '/admin'

/** Strips the locale prefix so path checks work with or without one. */
const withoutLocale = (pathname: string) => {
  const trimmed = pathname.replace(/\/$/, '') || '/'
  for (const locale of routing.locales) {
    if (trimmed === `/${locale}`) return '/'
    if (trimmed.startsWith(`/${locale}/`)) return trimmed.slice(locale.length + 1)
  }
  return trimmed
}

/**
 * `/admin` or `/{locale}/admin` exactly — not `/admin/content`, `/admin/shop`.
 * Redirecting here in the proxy avoids an RSC `redirect()`, which throws
 * NEXT_REDIRECT and flashes the dev error overlay.
 */
const isAdminIndexPath = (pathname: string) => withoutLocale(pathname) === ADMIN_SEGMENT

const proxy = clerkMiddleware(async (_auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  if (isAdminIndexPath(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = `${pathname.replace(/\/$/, '')}/content`
    return NextResponse.redirect(url)
  }

  // API routes opt out of next-intl but still pass through Clerk.
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  return intlMiddleware(req)
})

export default proxy

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
