'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

import { ArchiveIcon, CheckIcon, ClockIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { MarkdownEditor } from '../../components/MarkdownEditor'

import { useRouter } from '~/i18n/navigation'
import { api } from '@tv/backend-client'
import { useMutation } from 'convex/react'
import { PublicationSchema } from './schema'

const LOCALES = ['en', 'es', 'fr', 'pt'] as const
const LOCALE_LABEL_KEYS = {
  en: 'english',
  es: 'spanish',
  fr: 'french',
  pt: 'portuguese',
} as const

export type TranslationInput = {
  locale: (typeof LOCALES)[number]
  title: string
  bodyMd: string
  published?: boolean
}

export type ArticleFormInitial = {
  articleId?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  translations: TranslationInput[]
}

type ArticleFormProps = {
  mode: 'create' | 'edit'
  defaultValues?: ArticleFormInitial
}

const DraftTranslationSchema = z
  .object({
    locale: PublicationSchema.shape.locale,
    title: z.string().optional(),
    bodyMd: z.string().optional(),
    published: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const title = val.title?.trim() ?? ''
    const body = val.bodyMd?.trim() ?? ''

    // Allow empty locale blocks but require both fields when one is filled
    if (title.length === 0 && body.length === 0) {
      return
    }

    if (title.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Title required', path: ['title'] })
    }

    if (body.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Body required', path: ['bodyMd'] })
    }
  })

const ArticleFormSchema = z.object({
  translations: z.array(DraftTranslationSchema),
})

type ArticleFormValues = z.infer<typeof ArticleFormSchema>
type DraftTranslationInput = z.infer<typeof DraftTranslationSchema>

const toValidTranslation = (tr: DraftTranslationInput): TranslationInput | null => {
  const parsed = PublicationSchema.safeParse({
    locale: tr.locale,
    title: tr.title?.trim() ?? '',
    bodyMd: tr.bodyMd?.trim() ?? '',
    published: tr.published ?? false,
  })

  return parsed.success ? parsed.data : null
}

export const ArticleForm = ({ mode, defaultValues }: ArticleFormProps) => {
  const t = useTranslations()
  const locale = useLocale() as 'en' | 'es' | 'fr' | 'pt'
  const { replace } = useRouter()

  const [status, setStatus] = useState<ArticleFormInitial['status']>(defaultValues?.status ?? 'DRAFT')
  const [activeLocale, setActiveLocale] = useState<(typeof LOCALES)[number]>(locale)
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | 'archive' | null>(null)
  // Track which locale tabs have been successfully saved (persisted)
  const [savedLocales, setSavedLocales] = useState<Set<string>>(
    () =>
      new Set(
        defaultValues?.translations?.reduce<string[]>((locales, translation) => {
          if (translation.title && translation.bodyMd) {
            locales.push(translation.locale)
          }
          return locales
        }, []) ?? []
      )
  )

  const createArticle = useMutation(api.articles.create)
  const updateArticle = useMutation(api.articles.update)

  const defaultTranslations: DraftTranslationInput[] = LOCALES.map(
    (loc) => defaultValues?.translations?.find((tr) => tr.locale === loc) ?? { locale: loc, title: '', bodyMd: '' }
  )

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(ArticleFormSchema),
    defaultValues: { translations: defaultTranslations },
    mode: 'onChange',
  })

  const [mutationPending, setMutationPending] = useState(false)
  const isMutating = mutationPending || isSubmitting
  const isSaving = pendingAction === 'save' && isMutating
  const isPublishing = pendingAction === 'publish' && isMutating
  const isArchiving = pendingAction === 'archive' && isMutating
  const disabled = isMutating
  const hasChanges = isDirty || savedLocales.size === 0

  const statusConfig = {
    DRAFT: { icon: ClockIcon, label: t('publish_status.DRAFT'), color: 'text-yellow-600' },
    PUBLISHED: { icon: CheckIcon, label: t('publish_status.PUBLISHED'), color: 'text-green-600' },
    ARCHIVED: { icon: ArchiveIcon, label: t('publish_status.ARCHIVED'), color: 'text-gray-600' },
  }
  const currentStatus = statusConfig[status]

  const watchTranslations = (watch('translations') ?? []) as DraftTranslationInput[]

  const validLocales = watchTranslations.reduce<TranslationInput['locale'][]>((locales, translation) => {
    const validTranslation = toValidTranslation(translation)
    if (validTranslation) {
      locales.push(validTranslation.locale)
    }
    return locales
  }, [])

  const canPublish = validLocales.length === LOCALES.length
  const canArchive = status !== 'ARCHIVED'

  const localeDisplayName = (loc: (typeof LOCALES)[number]) => {
    const localeLabelKey = LOCALE_LABEL_KEYS[loc]
    return localeLabelKey ? t(localeLabelKey) : loc.toUpperCase()
  }

  const emitSavedToasts = (locales: (typeof LOCALES)[number][]) => {
    if (locales.length === 0) {
      return
    }
    for (const loc of locales) {
      const languageName = localeDisplayName(loc)
      const message = t('Admin.locale_saved', {
        language: languageName,
        language_lower: languageName.toLocaleLowerCase(locale),
      })
      toast.success(message)
    }
  }

  const buildPayload = (values: ArticleFormValues, overrideStatus?: ArticleFormInitial['status']) => {
    const nextStatus = overrideStatus ?? status
    const translations = (values.translations ?? []).reduce<TranslationInput[]>((validTranslations, translation) => {
      const validTranslation = toValidTranslation(translation)
      if (validTranslation) {
        validTranslations.push({ ...validTranslation, published: nextStatus === 'PUBLISHED' })
      }
      return validTranslations
    }, [])

    return {
      status: nextStatus,
      translations,
    }
  }

  const persist = async (nextStatus: ArticleFormInitial['status'], values: ArticleFormValues) => {
    const payload = buildPayload(values, nextStatus)
    const dirtyLocales = payload.translations.reduce<TranslationInput['locale'][]>((locales, translation) => {
      if (!savedLocales.has(translation.locale)) {
        locales.push(translation.locale)
      }
      return locales
    }, [])

    setMutationPending(true)
    try {
    if (mode === 'create') {
      await createArticle(payload)

      setSavedLocales(new Set(payload.translations.map((t) => t.locale)))
      emitSavedToasts(dirtyLocales)
      replace('/admin/content', { locale })
    } else if (mode === 'edit' && defaultValues?.articleId) {
      await updateArticle({ articleId: defaultValues.articleId as never, ...payload })

      setSavedLocales(new Set(payload.translations.map((t) => t.locale)))
      emitSavedToasts(dirtyLocales)

      if (nextStatus === 'PUBLISHED') {
        replace('/admin/content', { locale })
      }
    }
    } finally {
      setMutationPending(false)
    }
  }

  const resetPendingAction = () => setPendingAction(null)

  const onSave = handleSubmit(async (values: ArticleFormValues) => {
    setPendingAction('save')
    try {
      await persist(status === 'PUBLISHED' ? 'DRAFT' : status, values)
    } finally {
      resetPendingAction()
    }
  }, resetPendingAction)

  const onPublish = handleSubmit(async (values: ArticleFormValues) => {
    setPendingAction('publish')
    setStatus('PUBLISHED')
    try {
      await persist('PUBLISHED', values)
    } finally {
      resetPendingAction()
    }
  }, resetPendingAction)

  const onArchive = handleSubmit(async (values: ArticleFormValues) => {
    setPendingAction('archive')
    setStatus('ARCHIVED')
    try {
      await persist('ARCHIVED', values)
    } finally {
      resetPendingAction()
    }
  }, resetPendingAction)

  const markLocaleAsDirty = (loc: (typeof LOCALES)[number]) =>
    setSavedLocales((prev) => {
      if (!prev.has(loc)) {
        return prev
      }
      const next = new Set(prev)
      next.delete(loc)
      return next
    })

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <span className='font-medium text-sm'>{t('status')}:</span>

        <div className={`flex items-center gap-1.5 ${currentStatus.color}`}>
          <currentStatus.icon className='size-4' />
          <span className='font-medium text-sm'>{currentStatus.label}</span>
        </div>
      </div>

      <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as (typeof LOCALES)[number])}>
        <TabsList className='w-full'>
          {LOCALES.map((loc) => {
            const isValid = validLocales.includes(loc)
            const isSaved = savedLocales.has(loc)
            const localeLabelKey = LOCALE_LABEL_KEYS[loc]

            return (
              <TabsTrigger key={loc} value={loc} className='flex w-full items-center gap-1'>
                {isValid && isSaved ? (
                  <CheckIcon className='mt-0.5 size-4 text-primary' />
                ) : (
                  <ClockIcon className='mt-0.5' />
                )}
                {localeLabelKey ? t(localeLabelKey) : loc.toUpperCase()}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {LOCALES.map((loc) => {
          return (
            <TabsContent key={loc} value={loc} className='mt-4 flex w-full flex-col gap-6'>
              <div className='flex w-full flex-col gap-3'>
                <label className='font-medium text-sm' htmlFor={`title-${loc}`}>
                  Title ({loc.toUpperCase()})
                </label>

                <input
                  id={`title-${loc}`}
                  type='text'
                  className='h-9 rounded-md border px-3 text-sm shadow-sm'
                  placeholder={t('Admin.enter_title')}
                  {...register(`translations.${LOCALES.indexOf(loc)}.title`, {
                    onChange: () => markLocaleAsDirty(loc),
                  })}
                />

                {errors.translations?.[LOCALES.indexOf(loc)]?.title && (
                  <p className='font-semibold text-destructive text-xs'>
                    {String(errors.translations?.[LOCALES.indexOf(loc)]?.title?.message)}
                  </p>
                )}

                <div className='flex h-full flex-col gap-3'>
                  <label className='font-medium text-sm' htmlFor={`body-${loc}`}>
                    Markdown ({loc.toUpperCase()})
                  </label>

                  <Controller
                    control={control}
                    name={`translations.${LOCALES.indexOf(loc)}.bodyMd`}
                    render={({ field }) => (
                      <MarkdownEditor
                        id={`body-${loc}`}
                        value={field.value ?? ''}
                        onChangeAction={(markdown: string) => {
                          field.onChange(markdown)
                          markLocaleAsDirty(loc)
                        }}
                        onBlurAction={field.onBlur}
                        placeholder={t('Admin.enter_content')}
                        articleId={defaultValues?.articleId}
                      />
                    )}
                  />

                  {errors.translations?.[LOCALES.indexOf(loc)]?.bodyMd && (
                    <p className='font-semibold text-destructive text-xs'>
                      {String(errors.translations?.[LOCALES.indexOf(loc)]?.bodyMd?.message)}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      <div className='flex flex-wrap items-center gap-2 pt-2'>
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          onClick={() => replace('/admin/content', { locale })}
        >
          <XIcon />
          {t('cancel')}
        </Button>

        <Button type='button' disabled={disabled || !hasChanges} isLoading={isSaving} onClick={onSave}>
          <ClockIcon /> {t('save')}
        </Button>

        <Button type='button' disabled={disabled || !canPublish} isLoading={isPublishing} onClick={onPublish}>
          <CheckIcon /> {t('publish')}
        </Button>

        <Button
          type='button'
          variant='outline'
          disabled={disabled || !canArchive}
          isLoading={isArchiving}
          onClick={onArchive}
        >
          <ArchiveIcon /> {t('archive')}
        </Button>
      </div>
    </div>
  )
}
