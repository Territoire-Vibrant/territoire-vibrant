import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'

import { routing } from './i18n/routing'
import { isAdminFromSessionClaims } from './lib/utils'

const intlMiddleware = createMiddleware(routing)

// Route matchers for access control (support locale-prefixed paths and non-prefixed fallbacks).
const adminPatterns = ['/admin(.*)', ...routing.locales.map((l) => `/${l}/admin(.*)`)]
const adminLoginPatterns = ['/admin/login(.*)', ...routing.locales.map((l) => `/${l}/admin/login(.*)`)]
const isAdminRoute = createRouteMatcher(adminPatterns)
const isPublicAdminRoute = createRouteMatcher(adminLoginPatterns)

/** `/admin` or `/{locale}/admin` only - not `/admin/content`, `/admin/shop`, etc. */
function isAdminIndexPath(pathname: string) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (p === '/admin') {
    return true
  }
  return routing.locales.some((loc) => p === `/${loc}/admin`)
}

const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  if (isAdminRoute(req) && !isPublicAdminRoute(req)) {
    const { userId, redirectToSignIn, sessionClaims } = await auth()
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url })
    }

    const isAdmin = isAdminFromSessionClaims(sessionClaims)

    // Redirect non-admin authenticated users out of /admin
    if (!isAdmin) {
      const url = new URL('/', req.url)
      return NextResponse.redirect(url)
    }

    // Avoid RSC redirect() on /admin (throws NEXT_REDIRECT → dev error overlay flash)
    if (isAdminIndexPath(pathname)) {
      const url = req.nextUrl.clone()
      url.pathname = `${pathname.replace(/\/$/, '')}/content`
      return NextResponse.redirect(url)
    }
  }

  // Skip next-intl for API and tRPC routes.
  if (pathname.startsWith('/api')) {
    // Ensure Clerk still marks the request as passing through proxy
    return NextResponse.next()
  }

  // Apply internationalization for all other routes.
  return intlMiddleware(req)
})

export default proxy

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
