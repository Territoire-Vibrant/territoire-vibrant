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

/**
 * Deletes a user row that no longer has a matching Clerk account.
 *
 * Keyed on clerkUserId rather than the Convex _id so the caller states which
 * identity they mean, and internal for the same reason as the promotion above.
 * Nothing in the schema references users, so a row can be removed without
 * orphaning content; if the person ever signs in again, `users.store`
 * recreates the row without admin.
 */
export const deleteOrphanByClerkUserId = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
      .unique()

    if (!user) {
      throw new Error(`No user row for clerkUserId ${clerkUserId}`)
    }

    await ctx.db.delete(user._id)

    return { deleted: user._id, email: user.email ?? null }
  },
})
