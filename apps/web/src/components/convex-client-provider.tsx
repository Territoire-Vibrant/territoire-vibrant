'use client'

import { useAuth } from '@clerk/nextjs'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'

import { env } from '~/env'

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL)

// Module-level so React Compiler never sees a hook referenced as a value in render.
const convexClerkAuth = useAuth

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => (
  <ConvexProviderWithClerk client={convex} useAuth={convexClerkAuth}>
    {children}
  </ConvexProviderWithClerk>
)
