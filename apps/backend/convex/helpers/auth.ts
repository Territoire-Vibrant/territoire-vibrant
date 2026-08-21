import { ConvexError } from 'convex/values'

import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'

export const requireAuth = async (ctx: QueryCtx | MutationCtx | ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({ code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.auth.required' })
  }
  return identity
}

/**
 * `isAdmin` lives on the user's own row and is set by hand in the Convex
 * dashboard. Reading it server-side on every call means a forged or stale
 * client claim can never reach an admin mutation. The Clerk session claim is
 * still used by the web proxy, but only to decide what to render.
 */
export const requireAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await requireAuth(ctx)

  const user = await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique()

  if (!user?.isAdmin) {
    throw new ConvexError({ code: 'AUTHORIZATION_FAILED', messageKey: 'errors.auth.forbidden' })
  }

  return { identity, user }
}
