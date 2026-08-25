import { v } from 'convex/values'

import { internalMutation } from './_generated/server'

/**
 * One-off admin promotion by Clerk subject.
 *
 * `isAdmin` is deliberately not settable from any public mutation — it is a
 * privilege flag, and the whole point of `requireAdmin` reading it server-side
 * is that no client can grant it to itself. This is an internal mutation, so it
 * is only reachable from the CLI/dashboard by someone who already holds
 * deployment credentials.
 */
export const promoteByClerkUserId = internalMutation({
  args: { clerkUserId: v.string(), isAdmin: v.boolean() },
  handler: async (ctx, { clerkUserId, isAdmin }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
      .unique()

    if (!user) {
      throw new Error(`No user row for clerkUserId ${clerkUserId}`)
    }

    await ctx.db.patch(user._id, { isAdmin, updatedAt: Date.now() })

    return { _id: user._id, email: user.email ?? null, isAdmin }
  },
})
