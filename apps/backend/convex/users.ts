import { mutation, query } from './_generated/server'
import { requireAuth } from './helpers/auth'

/**
 * Replaces the Prisma upsert that ran inside the tRPC context and again in the
 * locale layout on every render. Called once from a client bootstrap component
 * after authentication settles, so it no longer sits on the render path.
 *
 * The Clerk JWT template must carry the `email` claim — verified present on
 * the production instance's `claims_supported`.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx)
    const now = Date.now()

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        name: identity.name ?? existing.name,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        updatedAt: now,
      })
      return existing._id
    }

    return ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
  },
})
