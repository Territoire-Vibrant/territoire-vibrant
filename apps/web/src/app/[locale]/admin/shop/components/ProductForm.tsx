'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon, CaretDownIcon } from '@phosphor-icons/react/dist/ssr'
import { useTranslations } from 'next-intl'
import type { ChangeEvent, ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import type { UploadError, UploadResponse } from '~/app/api/upload/schema'
import { Button } from '~/components/ui/button'
import { UnoptimizedImage } from '~/components/ui/unoptimized-image'

import { Link, useRouter } from '~/i18n/navigation'
import { ProductUpsertSchema } from '@tv/domain/product'
import { cn } from '~/lib/utils'
import { api } from '@tv/backend-client'
import { useMutation } from 'convex/react'

export type ProductFormDefaults = {
  name: string
  description: string
  price: number
  type: 'PHYSICAL' | 'DIGITAL'
  imageUrl: string
  isActive: boolean
  partnerStoreUrl: string
}

type ProductFormProps = {
  mode: 'create' | 'edit'
  productId?: string
  defaultValues?: ProductFormDefaults
}

const defaultEmpty: ProductFormDefaults = {
  name: '',
  description: '',
  price: 9.99,
  type: 'PHYSICAL',
  imageUrl: '',
  isActive: true,
  partnerStoreUrl: '',
}

type FormValues = z.infer<typeof ProductUpsertSchema>

const controlClass = cn(
  'w-full rounded-md border border-input bg-background px-3 text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow]',
  'placeholder:text-muted-foreground',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-destructive dark:bg-input/30'
)

const inputClass = cn(controlClass, 'h-9')
const textareaClass = cn(controlClass, 'min-h-[120px] resize-y py-2.5')
const selectClass = cn(inputClass, 'cursor-pointer appearance-none pr-10')
const numberInputClass = cn(
  inputClass,
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
)

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className='font-medium text-foreground text-sm leading-none'>
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs leading-snug'>{message}</p>
}

export function ProductForm({ mode, productId, defaultValues }: ProductFormProps) {
  const t = useTranslations()
  const { push } = useRouter()
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const createProduct = useMutation(api.products.create)
  const updateProduct = useMutation(api.products.update)

  const [pendingMutation, setPendingMutation] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(ProductUpsertSchema),
    defaultValues: defaultValues ?? defaultEmpty,
  })

  const pending = pendingMutation || isSubmitting
  const imageUrlWatch = watch('imageUrl')
  const imagePreviewSrc = imageUrlWatch?.trim()
  const showImagePreview = Boolean(imagePreviewSrc && /^https?:\/\//i.test(imagePreviewSrc))

  const uploadProductImage = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      if (mode === 'edit' && productId) {
        formData.append('productId', productId)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as UploadError | null
        throw new Error(errorData?.error ?? t('admin_shop_upload_error'))
      }

      const data = (await response.json()) as UploadResponse

      return data.url
    },
    [mode, productId, t]
  )

  const handleImageFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      setIsUploadingImage(true)
      try {
        const url = await uploadProductImage(file)
        setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })
        toast.success(t('admin_shop_upload_success'))
      } catch (error) {
        console.error('Product image upload failed:', error)
        toast.error(error instanceof Error ? error.message : t('admin_shop_upload_error'))
      } finally {
        setIsUploadingImage(false)
        if (imageFileInputRef.current) {
          imageFileInputRef.current.value = ''
        }
      }
    },
    [setValue, t, uploadProductImage]
  )

  const triggerImageUpload = () => {
    imageFileInputRef.current?.click()
  }

  const onSubmit = async (values: FormValues) => {
    setPendingMutation(true)
    try {
      if (mode === 'create') {
        await createProduct(values)
        toast.success(t('admin_shop_save_success'))
        push('/admin/shop')
        return
      }
      if (!productId) {
        toast.error(t('admin_shop_save_error'))
        return
      }
      // productId here is whatever id the edit page resolved (legacy UUID or
      // Convex id); the update mutation keys on the Convex _id passed through
      // defaultValues by the page.
      await updateProduct({ productId: productId as never, ...values })
      toast.success(t('admin_shop_save_success'))
      push('/admin/shop')
    } catch {
      toast.error(t('admin_shop_save_error'))
    } finally {
      setPendingMutation(false)
    }
  }

  return (
    <div className='mx-auto w-full max-w-3xl space-y-6'>
      <Button
        variant='ghost'
        size='sm'
        className='-ml-2.5 h-9 gap-1.5 text-muted-foreground hover:text-foreground'
        asChild
      >
        <Link href='/admin/shop'>
          <ArrowLeftIcon className='size-4' aria-hidden />
          {t('admin_shop_back')}
        </Link>
      </Button>

      <div className='rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-8'>
          <input
            ref={imageFileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/gif,image/webp'
            className='sr-only'
            tabIndex={-1}
            aria-hidden
            onChange={handleImageFileChange}
          />

          <div className='space-y-4'>
            <div className='space-y-2'>
              <FieldLabel htmlFor='product-name'>{t('admin_shop_field_name')}</FieldLabel>
              <input
                id='product-name'
                type='text'
                className={inputClass}
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className='space-y-2'>
              <FieldLabel htmlFor='product-description'>{t('admin_shop_field_description')}</FieldLabel>
              <textarea
                id='product-description'
                rows={4}
                className={textareaClass}
                aria-invalid={!!errors.description}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </div>

          <div className='h-px bg-border' aria-hidden />

          <div className='grid gap-6 sm:grid-cols-2'>
            <div className='space-y-2 sm:col-span-1'>
              <FieldLabel htmlFor='product-type'>{t('admin_shop_field_type')}</FieldLabel>
              <div className='relative'>
                <select id='product-type' className={selectClass} aria-invalid={!!errors.type} {...register('type')}>
                  <option value='PHYSICAL'>{t('admin_shop_type_physical')}</option>
                  <option value='DIGITAL'>{t('admin_shop_type_digital')}</option>
                </select>
                <CaretDownIcon
                  className='pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground'
                  aria-hidden
                />
              </div>
              <FieldError message={errors.type?.message} />
            </div>

            <div className='space-y-2 sm:col-span-1'>
              <FieldLabel htmlFor='product-price'>{t('admin_shop_field_price')}</FieldLabel>
              <input
                id='product-price'
                type='number'
                step='0.01'
                min='0.01'
                className={numberInputClass}
                aria-invalid={!!errors.price}
                {...register('price', { valueAsNumber: true })}
              />
              <FieldError message={errors.price?.message} />
            </div>
          </div>

          <div className='h-px bg-border' aria-hidden />

          <div className='space-y-4'>
            <div className='space-y-2'>
              <FieldLabel htmlFor='product-image'>{t('admin_shop_field_image_url')}</FieldLabel>
              <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch'>
                <input
                  id='product-image'
                  type='url'
                  placeholder='https://'
                  className={cn(inputClass, 'min-w-0 sm:min-w-48 sm:flex-1')}
                  aria-invalid={!!errors.imageUrl}
                  {...register('imageUrl')}
                />
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='shrink-0 sm:w-auto'
                    disabled={isUploadingImage}
                    isLoading={isUploadingImage}
                    onClick={triggerImageUpload}
                  >
                    {t('admin_shop_upload_image')}
                  </Button>
                  {imagePreviewSrc ? (
                    <Button
                      type='button'
                      variant='ghost'
                      className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                      disabled={isUploadingImage}
                      onClick={() => setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true })}
                    >
                      {t('admin_shop_remove_image')}
                    </Button>
                  ) : null}
                </div>
              </div>
              <FieldError message={errors.imageUrl?.message} />
              {showImagePreview && imagePreviewSrc ? (
                <div className='overflow-hidden rounded-lg border border-border bg-muted/30 p-2'>
                  <UnoptimizedImage
                    src={imagePreviewSrc}
                    alt=''
                    width={1200}
                    height={900}
                    sizes='(max-width: 768px) 100vw, 768px'
                    className='mx-auto max-h-48 w-auto max-w-full rounded-md object-contain'
                  />
                </div>
              ) : null}
            </div>

            <div className='space-y-2'>
              <FieldLabel htmlFor='product-partner-store'>{t('admin_shop_field_partner_store_url')}</FieldLabel>
              <input
                id='product-partner-store'
                type='url'
                placeholder='https://'
                className={inputClass}
                aria-invalid={!!errors.partnerStoreUrl}
                {...register('partnerStoreUrl')}
              />
              <FieldError message={errors.partnerStoreUrl?.message} />
            </div>
          </div>

          <div className='h-px bg-border' aria-hidden />

          <div className='space-y-2'>
            <label
              htmlFor='product-active'
              className='flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/25 px-4 py-3.5 transition-colors hover:bg-muted/40 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background'
            >
              <input
                id='product-active'
                type='checkbox'
                className='size-4 shrink-0 rounded border border-input text-primary accent-primary focus-visible:outline-none'
                {...register('isActive')}
              />
              <span className='font-medium text-foreground text-sm'>{t('admin_shop_field_active')}</span>
            </label>
            <FieldError message={errors.isActive?.message} />
          </div>

          <div className='flex flex-wrap items-center gap-3 border-border border-t pt-6'>
            <Link href='/admin/shop'>
              <Button type='button' variant='outline' className='cursor-pointer'>
                {t('cancel')}
              </Button>
            </Link>

            <Button type='submit' disabled={pending} isLoading={pending} className='cursor-pointer'>
              {t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
