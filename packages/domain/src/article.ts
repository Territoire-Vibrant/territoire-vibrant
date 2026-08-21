import { z } from 'zod'

import { LocaleSchema } from './locale'
import { PUBLISH_STATUSES } from './validators'

export const PublishStatusSchema = z.enum(PUBLISH_STATUSES)

export const ArticleTranslationInputSchema = z.object({
  locale: LocaleSchema,
  title: z.string().min(1),
  bodyMd: z.string().min(1),
  published: z.boolean().optional(),
})

export const ArticleUpsertSchema = z.object({
  status: PublishStatusSchema,
  translations: z.array(ArticleTranslationInputSchema).min(1),
})

export type ArticleTranslationInput = z.infer<typeof ArticleTranslationInputSchema>
export type ArticleUpsertInput = z.infer<typeof ArticleUpsertSchema>
