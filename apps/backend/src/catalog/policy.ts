import { DEFAULT_CURRENCY, fromCents, toCents } from '@tv/domain/money'

import { ValidationFailure } from '../shared/errors'

export type ProductWrite = {
  name: string
  description?: string
  priceCents: number
  currency: string
  imageUrl?: string
  type: 'PHYSICAL' | 'DIGITAL'
  isActive: boolean
  partnerStoreUrl?: string
}

/**
 * Prices arrive as decimals from an admin form and are stored as integer
 * cents — Convex has no decimal type and a float price is a rounding bug
 * waiting to be reported by a customer. Rejecting a non-finite or non-positive
 * price here means no handler has to remember to.
 */
export const toProductWrite = (input: {
  name: string
  description?: string
  price: number
  type: 'PHYSICAL' | 'DIGITAL'
  imageUrl?: string
  isActive: boolean
  partnerStoreUrl?: string
}): { ok: true; value: ProductWrite } | { ok: false; failure: ValidationFailure } => {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return {
      ok: false,
      failure: new ValidationFailure({
        messageKey: 'errors.product.invalidPrice',
        details: { price: input.price },
      }),
    }
  }

  return {
    ok: true,
    value: {
      name: input.name,
      description: input.description?.trim() || undefined,
      priceCents: toCents(input.price),
      currency: DEFAULT_CURRENCY,
      imageUrl: input.imageUrl?.trim() || undefined,
      type: input.type,
      isActive: input.isActive,
      partnerStoreUrl: input.partnerStoreUrl?.trim() || undefined,
    },
  }
}

export const centsFromInput = (price: number): number => toCents(price)

/** Related products: same type, active, excluding the current one. */
export const selectRelated = <T extends { readonly _id: string; readonly type: 'PHYSICAL' | 'DIGITAL' }>(
  candidates: readonly T[],
  current: { readonly _id: string; readonly type: 'PHYSICAL' | 'DIGITAL' },
  limit = 4
): T[] =>
  candidates.filter((candidate) => candidate._id !== current._id && candidate.type === current.type).slice(0, limit)

/** Round-trip guard so a display layer can never re-float a stored price. */
export const formatCentsForEdit = (cents: number): number => fromCents(cents)
