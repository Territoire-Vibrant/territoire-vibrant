import z from 'zod'

export const PublicationSchema = z.object({
  locale: z.enum(['en', 'es', 'fr', 'pt']),
  title: z.string().min(1, 'Title required'),
  bodyMd: z.string().min(1, 'Body required'),
  published: z.boolean().optional(),
})
