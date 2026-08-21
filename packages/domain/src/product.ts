import { z } from 'zod'

import { PRODUCT_TYPES } from './validators'

export const ProductTypeSchema = z.enum(PRODUCT_TYPES)

const optionalUrl = (field: string) =>
  z
    .string()
    .max(2048)
    .optional()
    .superRefine((raw, ctx) => {
      const trimmed = raw?.trim() ?? ''
      if (!trimmed) return
      if (!z.url().safeParse(trimmed).success) {
        ctx.addIssue({ code: 'custom', message: `Invalid URL in ${field}` })
      }
    })

/**
 * `price` stays a decimal number at the form boundary because that is what an
 * admin types. It is converted to integer cents at the Convex boundary.
 */
export const ProductUpsertSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(20_000).optional(),
  price: z.number().finite().positive().max(99_999_999),
  type: ProductTypeSchema,
  imageUrl: optionalUrl('imageUrl'),
  isActive: z.boolean(),
  partnerStoreUrl: optionalUrl('partnerStoreUrl'),
})

export const ProductUpdateSchema = ProductUpsertSchema.extend({
  id: z.string().min(1),
})

export type ProductUpsertInput = z.infer<typeof ProductUpsertSchema>
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>

/** Empty strings become `undefined` so Convex optional fields stay absent. */
export const normalizeProductInput = (input: ProductUpsertInput) => ({
  name: input.name,
  description: input.description?.trim() || undefined,
  price: input.price,
  type: input.type,
  imageUrl: input.imageUrl?.trim() || undefined,
  isActive: input.isActive,
  partnerStoreUrl: input.partnerStoreUrl?.trim() || undefined,
})
