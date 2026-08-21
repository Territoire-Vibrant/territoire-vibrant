'use client'

import { BookOpenTextIcon } from '@phosphor-icons/react/dist/ssr'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import NextLink from 'next/link'
import { useActionState, useState } from 'react'
import { toast } from 'sonner'

import EbookCoverImage from '~/assets/images/shop/free-ebook-cover.png'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
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

type EbookDialogFormProps = {
  locale: LeadLocale
  onEmailSent: () => void
}

const EbookDialogForm = ({ locale, onEmailSent }: EbookDialogFormProps) => {
  const t = useTranslations('Ebook')
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

        // Delivery is scheduled server-side; treat capture success as sent.
        onEmailSent()
        toast.success(t('success_title'), { description: t('email_sent_hint') })

        return { success: true, deliveryStatus: 'sent' as const }
      } catch {
        return { success: false, message: t('error') }
      }
    },
    null
  )

  const inputClass = (field: string) =>
    cn(
      'h-11 rounded-lg border border-foreground/15 bg-background px-4 text-foreground outline-none transition-[border-color,box-shadow]',
      'placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20',
      state?.errors?.[field] && 'border-destructive'
    )

  if (state?.success && state.deliveryStatus === 'email_failed') {
    return (
      <div className='flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950'>
        <div className='space-y-1'>
          <h3 className='font-semibold text-base'>{t('delivery_warning_title')}</h3>
          <p className='text-amber-900/80 text-sm'>{t('delivery_warning_subtitle')}</p>
        </div>
        <Button asChild size='lg' className='bg-amber-600 hover:bg-amber-700'>
          <NextLink href='/downloads/ebook.pdf' download prefetch={false}>
            <BookOpenTextIcon weight='bold' />
            {t('download')}
          </NextLink>
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className='flex flex-col gap-4'>
      <input type='hidden' name='locale' value={locale} />

      {/* Name */}
      <div className='flex flex-col gap-2'>
        <label htmlFor='ebook-name' className='font-medium text-foreground text-sm'>
          {t('name')}
        </label>
        <input
          type='text'
          id='ebook-name'
          name='name'
          required
          placeholder={t('name_placeholder')}
          className={inputClass('name')}
        />
        {state?.errors?.name && <p className='text-destructive text-sm'>{state.errors.name[0]}</p>}
      </div>

      {/* Email */}
      <div className='flex flex-col gap-2'>
        <label htmlFor='ebook-email' className='font-medium text-foreground text-sm'>
          {t('email')}
        </label>
        <input
          type='email'
          id='ebook-email'
          name='email'
          required
          placeholder={t('email_placeholder')}
          className={inputClass('email')}
        />
        {state?.errors?.email && <p className='text-destructive text-sm'>{state.errors.email[0]}</p>}
      </div>

      {/* Phone */}
      <div className='flex flex-col gap-2'>
        <label htmlFor='ebook-phone' className='font-medium text-foreground text-sm'>
          {t('phone')}
        </label>
        <input
          type='tel'
          id='ebook-phone'
          name='phone'
          required
          placeholder={t('phone_placeholder')}
          className={inputClass('phone')}
        />
        {state?.errors?.phone && <p className='text-destructive text-sm'>{state.errors.phone[0]}</p>}
      </div>

      {/* General mutation error */}
      {state?.message && !state.success && <p className='text-destructive text-sm'>{state.message}</p>}

      <Button type='submit' size='lg' isLoading={isPending} className='mt-1'>
        <BookOpenTextIcon weight='bold' />
        {t('submit')}
      </Button>
    </form>
  )
}

export const EbookCard = () => {
  const t = useTranslations('Ebook')
  const locale = useLocale() as LeadLocale
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setFormKey((currentKey) => currentKey + 1)
    }
  }

  const handleEmailSent = () => {
    setOpen(false)
    setFormKey((currentKey) => currentKey + 1)
  }

  return (
    <div className='group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl'>
      {/* Cover area - same aspect + absolute-fill pattern as ProductCard */}
      <div className='relative aspect-4/3 w-full shrink-0 overflow-hidden bg-emerald-50'>
        <Image
          src={EbookCoverImage}
          alt={t('cover_alt')}
          fill
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw'
          className='object-cover transition-transform duration-500 group-hover:scale-105'
        />

        {/* FREE badge - emerald, distinct from amber (PHYSICAL) and green-700 (DIGITAL) */}
        <div className='pointer-events-none absolute top-3 left-3 z-10'>
          <span className='rounded-full bg-emerald-600 px-3 py-1 font-semibold text-emerald-50 text-xs uppercase tracking-wide'>
            {t('shop_badge')}
          </span>
        </div>
      </div>

      {/* Content area - mirrors ProductCard .p-5 structure */}
      <div className='flex flex-1 flex-col p-5'>
        <p className='mb-2 line-clamp-2 font-semibold text-lg text-stone-800'>{t('shop_title')}</p>
        <p className='mb-4 line-clamp-3 flex-1 text-sm text-stone-600'>{t('shop_description')}</p>

        <div className='mt-auto flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <span className='font-bold text-emerald-700 text-xl'>{t('shop_badge')}</span>
          </div>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button type='button' className='w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700'>
                {t('shop_button')}
              </Button>
            </DialogTrigger>

            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>{t('dialog_title')}</DialogTitle>
                <DialogDescription>{t('dialog_description')}</DialogDescription>
              </DialogHeader>

              <EbookDialogForm key={formKey} locale={locale} onEmailSent={handleEmailSent} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
