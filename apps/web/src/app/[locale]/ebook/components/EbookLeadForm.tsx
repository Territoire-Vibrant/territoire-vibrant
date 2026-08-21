'use client'

import { ArrowDownIcon, BookOpenIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react/dist/ssr'
import NextLink from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { LeadLocale } from '@tv/domain/lead'
import { LeadCaptureSchema } from '@tv/domain/lead'
import { api } from '@tv/backend-client'
import { useMutation } from 'convex/react'

type FormState = {
  deliveryStatus?: 'email_failed' | 'sent'
  errors?: Record<string, string[] | undefined>
  success?: boolean
  message?: string
}

export const EbookLeadForm = () => {
  const t = useTranslations('Ebook')
  const locale = useLocale() as LeadLocale
  const capture = useMutation(api.leads.capture)

  const [state, action, isPending] = useActionState(
    async (_prev: FormState | null, formData: FormData): Promise<FormState> => {
      const raw = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        locale: formData.get('locale'),
      }

      const validation = LeadCaptureSchema.safeParse(raw)

      if (!validation.success) {
        return { errors: validation.error.flatten().fieldErrors }
      }

      try {
        await capture(validation.data)
        // Delivery is scheduled server-side; failures no longer surface here.
        return { success: true, deliveryStatus: 'sent' as const }
      } catch {
        return { success: false, message: t('error') }
      }
    },
    null
  )

  if (state?.success) {
    const warningState = state.deliveryStatus === 'email_failed'

    return (
      <div className='flex flex-col items-center gap-6 py-8 text-center'>
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-full',
            warningState ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
          )}
        >
          {warningState ? (
            <WarningCircleIcon className='size-8' weight='fill' />
          ) : (
            <CheckCircleIcon className='size-8' weight='fill' />
          )}
        </div>
        <div>
          <h3 className='font-semibold text-foreground text-xl'>
            {warningState ? t('delivery_warning_title') : t('success_title')}
          </h3>
          <p className='mt-1 text-foreground/70'>
            {warningState ? t('delivery_warning_subtitle') : t('success_subtitle')}
          </p>
        </div>
        <NextLink
          href='/downloads/ebook.pdf'
          download
          prefetch={false}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3',
            'font-medium text-primary-foreground text-sm shadow-xs',
            'transition-colors hover:bg-primary/90 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary/50'
          )}
        >
          <ArrowDownIcon className='size-4' weight='bold' />
          {t('download')}
        </NextLink>
      </div>
    )
  }

  return (
    <form action={action} className='flex flex-col gap-5'>
      <input type='hidden' name='locale' value={locale} />
      <h3 className='font-semibold text-foreground text-lg'>{t('form_title')}</h3>

      {/* Name */}
      <div className='flex flex-col gap-2'>
        <label htmlFor='name' className='font-medium text-foreground text-sm'>
          {t('name')}
        </label>
        <input
          type='text'
          id='name'
          name='name'
          required
          placeholder={t('name_placeholder')}
          className={cn(
            'h-11 rounded-lg border border-foreground/15 bg-background px-4 text-foreground outline-none transition-[border-color,box-shadow]',
            'placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20',
            state?.errors?.name && 'border-destructive'
          )}
        />
        {state?.errors?.name && <p className='text-destructive text-sm'>{state.errors.name[0]}</p>}
      </div>

      {/* Email */}
      <div className='flex flex-col gap-2'>
        <label htmlFor='email' className='font-medium text-foreground text-sm'>
          {t('email')}
        </label>
        <input
          type='email'
          id='email'
          name='email'
          required
          placeholder={t('email_placeholder')}
          className={cn(
            'h-11 rounded-lg border border-foreground/15 bg-background px-4 text-foreground outline-none transition-[border-color,box-shadow]',
            'placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20',
            state?.errors?.email && 'border-destructive'
          )}
        />
        {state?.errors?.email && <p className='text-destructive text-sm'>{state.errors.email[0]}</p>}
      </div>

      {/* Phone */}
      <div className='flex flex-col gap-2'>
        <label htmlFor='phone' className='font-medium text-foreground text-sm'>
          {t('phone')}
        </label>
        <input
          type='tel'
          id='phone'
          name='phone'
          required
          placeholder={t('phone_placeholder')}
          className={cn(
            'h-11 rounded-lg border border-foreground/15 bg-background px-4 text-foreground outline-none transition-[border-color,box-shadow]',
            'placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20',
            state?.errors?.phone && 'border-destructive'
          )}
        />
        {state?.errors?.phone && <p className='text-destructive text-sm'>{state.errors.phone[0]}</p>}
      </div>

      {/* General error */}
      {state?.message && !state.success && <p className='text-destructive text-sm'>{state.message}</p>}

      <Button type='submit' size='lg' isLoading={isPending} className='mt-2'>
        <BookOpenIcon weight='bold' />
        {t('submit')}
      </Button>
    </form>
  )
}
