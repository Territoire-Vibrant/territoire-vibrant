import { LocaleValidator, ProductTypeValidator, PublishStatusValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import { buildSearchText } from '../src/content/policy'
import { mutation, query } from './_generated/server'

/**
 * TEMPORARY. Exists only to carry the Postgres data into Convex and is deleted
 * once the migration is verified in production.
 *
 * Guarded by MIGRATION_SECRET rather than by user auth because the importer is
 * a script, not a signed-in admin. Every import is idempotent on `legacyId`,
 * so a partial run can simply be re-run.
 *
 * The tokenIdentifier of imported users is ALWAYS composed with the
 * production Clerk issuer (https://clerk.territoirevibrant.ca), even when the
 * target is the dev deployment — the real users live on the production
 * instance, and composing with the dev issuer would orphan every row.
 */
const assertSecret = (secret: string) => {
  const expected = process.env.MIGRATION_SECRET
  if (!expected || secret !== expected) {
    throw new Error('FORBIDDEN: invalid migration secret')
  }
}

export const importUsers = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        clerkUserId: v.string(),
        tokenIdentifier: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', row.clerkUserId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      await ctx.db.insert('users', { ...row, isAdmin: false })
      inserted += 1
    }

    return { inserted, skipped }
  },
})

export const importProducts = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        priceCents: v.number(),
        currency: v.string(),
        imageUrl: v.optional(v.string()),
        type: ProductTypeValidator,
        isActive: v.boolean(),
        partnerStoreUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('products')
        .withIndex('by_legacyId', (q) => q.eq('legacyId', row.legacyId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      await ctx.db.insert('products', row)
      inserted += 1
    }

    return { inserted, skipped }
  },
})

export const importArticles = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        status: PublishStatusValidator,
        createdAt: v.number(),
        updatedAt: v.number(),
        translations: v.array(
          v.object({
            legacyId: v.string(),
            locale: LocaleValidator,
            title: v.string(),
            bodyMd: v.string(),
            published: v.boolean(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0
    let translationsInserted = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('articles')
        .withIndex('by_legacyId', (q) => q.eq('legacyId', row.legacyId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      const articleId = await ctx.db.insert('articles', {
        legacyId: row.legacyId,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })

      for (const translation of row.translations) {
        await ctx.db.insert('articleTranslations', {
          legacyId: translation.legacyId,
          articleId,
          locale: translation.locale,
          title: translation.title,
          bodyMd: translation.bodyMd,
          published: translation.published,
          searchText: buildSearchText(translation.title, translation.bodyMd),
        })
        translationsInserted += 1
      }

      inserted += 1
    }

    return { inserted, skipped, translationsInserted }
  },
})

export const importLeads = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        email: v.string(),
        phone: v.string(),
        createdAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    let inserted = 0
    let skipped = 0

    for (const row of args.rows) {
      const existing = await ctx.db
        .query('leads')
        .withIndex('by_legacyId', (q) => q.eq('legacyId', row.legacyId))
        .unique()

      if (existing) {
        skipped += 1
        continue
      }

      await ctx.db.insert('leads', row)
      inserted += 1
    }

    return { inserted, skipped }
  },
})

export const countAll = query({
  args: {},
  handler: async (ctx) => ({
    users: (await ctx.db.query('users').collect()).length,
    articles: (await ctx.db.query('articles').collect()).length,
    articleTranslations: (await ctx.db.query('articleTranslations').collect()).length,
    products: (await ctx.db.query('products').collect()).length,
    leads: (await ctx.db.query('leads').collect()).length,
  }),
})

/**
 * TEMPORARY, migration-only. Unauthenticated read of every product so the
 * verify script can check price conversion without admin credentials.
 * Deleted together with this file after the cutover.
 */
export const listAllProductsRaw = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret)
    return ctx.db.query('products').collect()
  },
})
