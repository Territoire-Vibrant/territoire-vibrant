import { v } from 'convex/values'

import type { LOCALES } from './locale'

/**
 * Convex has no enum type, so each Prisma enum becomes a union of literals.
 * These live here rather than in the schema so the clients can reuse the exact
 * same set without importing a server module.
 */

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type PublishStatus = (typeof PUBLISH_STATUSES)[number]

export const PRODUCT_TYPES = ['PHYSICAL', 'DIGITAL'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const LEAD_DELIVERY_STATUSES = ['sent', 'email_failed'] as const
export type LeadDeliveryStatus = (typeof LEAD_DELIVERY_STATUSES)[number]

export const LocaleValidator = v.union(v.literal('fr'), v.literal('es'), v.literal('en'), v.literal('pt'))

export const PublishStatusValidator = v.union(v.literal('DRAFT'), v.literal('PUBLISHED'), v.literal('ARCHIVED'))

export const ProductTypeValidator = v.union(v.literal('PHYSICAL'), v.literal('DIGITAL'))

export const LeadDeliveryStatusValidator = v.union(v.literal('sent'), v.literal('email_failed'))

/**
 * The literal validators above are written out rather than mapped from the
 * arrays because Convex derives its TypeScript types from the validator's
 * shape: a mapped `v.union(...arr.map(v.literal))` widens to `string` and
 * every downstream document type loses the narrowing. Keep the two in sync —
 * these assertions fail the typecheck if they ever drift.
 */
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never

const _localeMatches: AssertEqual<(typeof LOCALES)[number], typeof LocaleValidator.type> = true
const _statusMatches: AssertEqual<PublishStatus, typeof PublishStatusValidator.type> = true
const _productTypeMatches: AssertEqual<ProductType, typeof ProductTypeValidator.type> = true
const _deliveryMatches: AssertEqual<LeadDeliveryStatus, typeof LeadDeliveryStatusValidator.type> = true

void _localeMatches
void _statusMatches
void _productTypeMatches
void _deliveryMatches
