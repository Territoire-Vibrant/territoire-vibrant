'use client'

import { api } from '@tv/backend-client'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect } from 'react'

/**
 * Replaces the Prisma upsert that ran on every locale layout render (and again
 * inside the tRPC context). Fires once after authentication settles instead of
 * sitting on the server render path.
 */
export const UserBootstrap = () => {
  const { isAuthenticated } = useConvexAuth()
  const store = useMutation(api.users.store)

  useEffect(() => {
    if (!isAuthenticated) return
    void store({}).catch((error: unknown) => {
      console.error('[user-bootstrap] failed', error)
    })
  }, [isAuthenticated, store])

  return null
}
