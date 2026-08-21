import { z } from 'zod'

export const ContactSubjectSchema = z.enum(['partnership', 'quote', 'invitation', 'other'])

export type ContactSubject = z.infer<typeof ContactSubjectSchema>

export const ContactFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.email('Email inválido'),
  subject: ContactSubjectSchema,
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
})

export type ContactFormDTO = z.infer<typeof ContactFormSchema>

// Subject labels for display (overridden by i18n at the UI boundary).
export const SUBJECT_OPTIONS = [
  { value: 'partnership', labelKey: 'Contact.subjects.partnership' },
  { value: 'quote', labelKey: 'Contact.subjects.quote' },
  { value: 'invitation', labelKey: 'Contact.subjects.invitation' },
  { value: 'other', labelKey: 'Contact.subjects.other' },
] as const
