import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  LeadDeliveryStatusValidator,
  LocaleValidator,
  ProductTypeValidator,
  PublishStatusValidator,
} from '@tv/domain/validators'

/**
 * `legacyId` carries the Postgres UUID of every migrated row. Public article
 * and product URLs contain that UUID today (`/fr/content/<uuid>`), so dropping
 * it would break every indexed and shared link at cutover. It stays optional
 * because rows created after the migration have no legacy identity.
 *
 * `createdAt`/`updatedAt` are explicit fields rather than `_creationTime`,
 * which Convex stamps at insert time and cannot be backdated during an import.
 */
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_email', ['email']),

  articles: defineTable({
    legacyId: v.optional(v.string()),
    status: PublishStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_createdAt', ['createdAt'])
    .index('by_status_createdAt', ['status', 'createdAt']),

  articleTranslations: defineTable({
    legacyId: v.optional(v.string()),
    articleId: v.id('articles'),
    locale: LocaleValidator,
    title: v.string(),
    bodyMd: v.string(),
    published: v.boolean(),
    searchText: v.string(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_article', ['articleId'])
    .index('by_article_locale', ['articleId', 'locale'])
    .searchIndex('search_content', {
      searchField: 'searchText',
      filterFields: ['locale', 'published'],
    }),

  products: defineTable({
    legacyId: v.optional(v.string()),
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
    .index('by_legacyId', ['legacyId'])
    .index('by_updatedAt', ['updatedAt'])
    .index('by_isActive_createdAt', ['isActive', 'createdAt']),

  leads: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    locale: v.optional(LocaleValidator),
    deliveryStatus: v.optional(LeadDeliveryStatusValidator),
    createdAt: v.number(),
  })
    .index('by_legacyId', ['legacyId'])
    .index('by_email', ['email'])
    .index('by_createdAt', ['createdAt']),
})
