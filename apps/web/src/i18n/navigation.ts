import { createNavigation } from 'next-intl/navigation'
// biome-ignore lint/style/noRestrictedImports: re-export for app; must import from source here
import { notFound } from 'next/navigation'

import { routing } from './routing'

// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
export { notFound }
