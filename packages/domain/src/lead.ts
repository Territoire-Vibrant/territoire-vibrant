import { z } from 'zod'

import { LocaleSchema } from './locale'

export const LeadCaptureSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.email('Email inválido'),
  phone: z
    .string()
    .min(7, 'Telefone deve ter pelo menos 7 caracteres')
    .regex(/^[\d\s+\-()]+$/, 'Telefone inválido'),
  locale: LocaleSchema,
})

export type LeadCaptureDTO = z.infer<typeof LeadCaptureSchema>
export type LeadLocale = z.infer<typeof LocaleSchema>
