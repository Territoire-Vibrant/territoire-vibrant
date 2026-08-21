'use client'

import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  LeafIcon,
  LockSimpleIcon,
  MapPinIcon,
  PaperPlaneTiltIcon,
  PhoneIcon,
  QuotesIcon,
} from '@phosphor-icons/react/dist/ssr'
import { useTranslations } from 'next-intl'
import { startTransition, useActionState, useOptimistic, ViewTransition } from 'react'

import { Button } from '~/components/ui/button'
import { Section } from '~/layouts/Section'
import { cn } from '~/lib/utils'
import { ContactFormSchema, SUBJECT_OPTIONS } from '@tv/domain/contact'
import { api } from '@tv/backend-client'
import { useAction } from 'convex/react'

type FormState = {
  errors?: Record<string, string[] | undefined>
  success?: boolean
  message?: string
}

const CONTACT_ITEMS = [
  { icon: <PhoneIcon />, label: 'Telefone', value: '+1 514 710-8532', href: 'tel:+15147108532' },
  {
    icon: <EnvelopeSimpleIcon />,
    label: 'Email',
    value: 'macneves@territoirevibrant.ca',
    href: 'mailto:macneves@territoirevibrant.ca',
  },
  { icon: <MapPinIcon />, label: 'Atuação', value: 'Brasil e Québec', href: undefined },
] as const

export const ContactSection = () => {
  const t = useTranslations()
  const [optimisticSuccess, setOptimisticSuccess] = useOptimistic(false)
  const sendContact = useAction(api.contact.send)

  const [state, action, isPending] = useActionState(
    async (_previous: FormState | null, formData: FormData): Promise<FormState> => {
      const validation = ContactFormSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message'),
      })

      if (!validation.success) return { errors: validation.error.flatten().fieldErrors }

      startTransition(() => setOptimisticSuccess(true))

      try {
        await sendContact(validation.data)
        return { success: true, message: t('Contact.success') }
      } catch {
        setOptimisticSuccess(false)
        return { success: false, message: t('Contact.error') }
      }
    },
    null
  )

  const showSuccess = optimisticSuccess || state?.success
  const fieldClassName =
    'w-full rounded-lg border border-foreground/16 bg-white px-4 text-foreground outline-none transition-shadow placeholder:text-foreground/38 focus:border-primary focus:ring-2 focus:ring-primary/15'

  return (
    <Section id='contact' className='max-w-[1180px]! px-6 py-12'>
      <div className='grid gap-12 lg:grid-cols-[0.38fr_0.62fr] lg:gap-16'>
        <div className='flex flex-col py-4'>
          <h1 className='max-w-sm font-bold text-[clamp(2.3rem,4vw,3.25rem)] leading-tight tracking-tight'>
            Vamos ativar
            <br />
            seu território
          </h1>

          <div className='mt-5 flex w-48 items-center gap-2 text-primary' aria-hidden>
            <LeafIcon className='size-8 -rotate-12' weight='duotone' />
            <span className='h-px flex-1 bg-primary/70' />
            <LeafIcon className='size-5 rotate-12' weight='duotone' />
          </div>

          <p className='mt-7 max-w-md text-foreground/78 text-lg leading-relaxed'>
            Conectamos pessoas, organizações e territórios para criar ecossistemas mais vivos, colaborativos e
            regenerativos.
          </p>

          <div className='mt-9 space-y-5'>
            {CONTACT_ITEMS.map((item) => {
              const content = (
                <>
                  <span className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[#edf3e4] text-primary [&>svg]:size-6'>
                    {item.icon}
                  </span>
                  <span>
                    <strong className='block text-sm'>{item.label}</strong>
                    <span className='text-[15px] text-foreground/72'>{item.value}</span>
                  </span>
                </>
              )

              return item.href ? (
                <a key={item.label} href={item.href} className='flex items-center gap-4 hover:text-primary'>
                  {content}
                </a>
              ) : (
                <div key={item.label} className='flex items-center gap-4'>
                  {content}
                </div>
              )
            })}
          </div>

          <blockquote className='mt-8 flex items-start gap-3'>
            <QuotesIcon className='size-10 shrink-0 text-primary/18' weight='fill' />
            <p className='pt-2 font-semibold text-lg leading-snug'>
              Territórios vibrantes
              <br />
              se constroem juntos.
            </p>
          </blockquote>
        </div>

        <div
          className='rounded-2xl border border-foreground/8 bg-white p-6 shadow-[0_14px_38px_rgba(6,51,27,0.11)] sm:p-9'
          style={{ viewTransitionName: 'contact-form' }}
        >
          <ViewTransition name='contact-form'>
            {showSuccess ? (
              <div className='flex min-h-[500px] flex-col items-center justify-center gap-4 text-center'>
                <div className='flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  <CheckCircleIcon className='size-9' weight='fill' />
                </div>
                <h2 className='font-bold text-2xl'>{t('Contact.success_title')}</h2>
                <p className='max-w-sm text-foreground/70'>{t('Contact.success')}</p>
              </div>
            ) : (
              <form action={action} className='grid gap-5 sm:grid-cols-2'>
                <div className='sm:col-span-2'>
                  <h2 className='font-bold text-2xl'>Envie sua mensagem</h2>
                  <p className='mt-2 text-foreground/70'>Será um prazer conversar sobre como podemos colaborar.</p>
                </div>

                <label className='sm:col-span-2'>
                  <span className='mb-2 block font-semibold text-sm'>{t('Contact.subject')}</span>
                  <select
                    name='subject'
                    required
                    defaultValue=''
                    className={cn('h-12', fieldClassName, state?.errors?.subject && 'border-destructive')}
                  >
                    <option value='' disabled>
                      {t('Contact.select_subject')}
                    </option>
                    {SUBJECT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  {state?.errors?.subject && (
                    <span className='mt-1 block text-destructive text-xs'>{state.errors.subject[0]}</span>
                  )}
                </label>

                <label>
                  <span className='mb-2 block font-semibold text-sm'>{t('Contact.name')}</span>
                  <input
                    name='name'
                    required
                    placeholder={t('Contact.name_placeholder')}
                    className={cn('h-12', fieldClassName, state?.errors?.name && 'border-destructive')}
                  />
                  {state?.errors?.name && (
                    <span className='mt-1 block text-destructive text-xs'>{state.errors.name[0]}</span>
                  )}
                </label>

                <label>
                  <span className='mb-2 block font-semibold text-sm'>{t('Contact.your_email')}</span>
                  <input
                    type='email'
                    name='email'
                    required
                    placeholder={t('Contact.email_placeholder')}
                    className={cn('h-12', fieldClassName, state?.errors?.email && 'border-destructive')}
                  />
                  {state?.errors?.email && (
                    <span className='mt-1 block text-destructive text-xs'>{state.errors.email[0]}</span>
                  )}
                </label>

                <label className='sm:col-span-2'>
                  <span className='mb-2 block font-semibold text-sm'>{t('Contact.message')}</span>
                  <textarea
                    name='message'
                    required
                    rows={5}
                    placeholder={t('Contact.message_placeholder')}
                    className={cn('resize-none py-3', fieldClassName, state?.errors?.message && 'border-destructive')}
                  />
                  {state?.errors?.message && (
                    <span className='mt-1 block text-destructive text-xs'>{state.errors.message[0]}</span>
                  )}
                </label>

                {state?.message && !state.success && (
                  <p className='text-destructive text-sm sm:col-span-2'>{state.message}</p>
                )}

                <Button
                  type='submit'
                  size='lg'
                  isLoading={isPending}
                  className='h-12 bg-linear-to-r from-primary to-[#74ad21] font-bold text-base shadow-sm hover:brightness-95 sm:col-span-2'
                >
                  <PaperPlaneTiltIcon className='size-5' />
                  {t('Contact.send')}
                </Button>

                <p className='flex items-center gap-2 text-foreground/65 text-xs sm:col-span-2'>
                  <LockSimpleIcon className='size-4 shrink-0' />
                  Seus dados estão seguros e serão usados apenas para responder sua mensagem.
                </p>
              </form>
            )}
          </ViewTransition>
        </div>
      </div>
    </Section>
  )
}
