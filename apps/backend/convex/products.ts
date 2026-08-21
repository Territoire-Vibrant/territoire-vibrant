import { ProductTypeValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { selectRelated, toProductWrite } from '../src/catalog/policy'
import { requireAdmin } from './helpers/auth'

const productFields = {
  name: v.string(),
  description: v.optional(v.string()),
  price: v.number(),
  type: ProductTypeValidator,
  imageUrl: v.optional(v.string()),
  isActive: v.boolean(),
  partnerStoreUrl: v.optional(v.string()),
}

/** Public shop listing. Replaces the direct `db.product.findMany` in shop/page.tsx. */
export const listActive = query({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query('products')
      .withIndex('by_isActive_createdAt', (q) => q.eq('isActive', true))
      .order('desc')
      .collect(),
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return ctx.db.query('products').withIndex('by_updatedAt').order('desc').collect()
  },
})

export const getById = query({
  args: { productId: v.id('products') },
  handler: (ctx, args) => ctx.db.get(args.productId),
})

/**
 * Resolves a product by its Convex id or by the Postgres UUID it carried
 * before the migration, so old shop links keep working.
 */
export const getByAnyId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byLegacy = await ctx.db
      .query('products')
      .withIndex('by_legacyId', (q) => q.eq('legacyId', args.id))
      .unique()

    if (byLegacy) return byLegacy
    return ctx.db.get(args.id as Id<'products'>).catch(() => null)
  },
})

/** Related products for the detail page: same type, active, excluding the current one. */
export const listRelated = query({
  args: { productId: v.id('products'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.productId)
    if (!current) return []

    const candidates = await ctx.db
      .query('products')
      .withIndex('by_isActive_createdAt', (q) => q.eq('isActive', true))
      .order('desc')
      .collect()

    return selectRelated(candidates, current, args.limit ?? 4)
  },
})

export const create = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const write = toProductWrite(args)
    if (!write.ok) throw write.failure

    return ctx.db.insert('products', {
      ...write.value,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: { productId: v.id('products'), ...productFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const { productId, ...input } = args
    const write = toProductWrite(input)
    if (!write.ok) throw write.failure

    await ctx.db.patch(productId, { ...write.value, updatedAt: Date.now() })
    return productId
  },
})
