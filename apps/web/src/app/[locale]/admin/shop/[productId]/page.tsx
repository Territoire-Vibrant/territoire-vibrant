import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

import { ArrowLeftIcon, PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '~/components/ui/button'
import { buttonVariants } from '~/components/ui/button-variants'
import { UnoptimizedImage } from '~/components/ui/unoptimized-image'

import { Link, notFound } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { api } from '@tv/backend-client'

import { authedQuery } from '~/server/convex'

const CAD_FORMATTER = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
})

export default async function AdminShopProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params

  if (!z.uuid().safeParse(productId).success) {
    notFound()
  }

  const [t, product] = await Promise.all([getTranslations(), authedQuery(api.products.getByAnyId, { id: productId })])
  if (!product) {
    notFound()
  }

  const formattedPrice = CAD_FORMATTER.format(product.priceCents / 100)

  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-10'>
      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <Link href='/admin/shop'>
          <Button
            variant='outline'
            size='sm'
            className='-ml-2 cursor-pointer text-muted-foreground hover:text-foreground'
          >
            <ArrowLeftIcon className='size-4' aria-hidden />
            {t('admin_shop_back')}
          </Button>
        </Link>

        <Link
          href={`/admin/shop/${product.legacyId ?? product._id}/edit`}
          className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-2')}
        >
          <PencilSimpleIcon className='size-4' aria-hidden />
          {t('admin_shop_edit')}
        </Link>
      </div>

      <div className='mb-6'>
        <p className='text-muted-foreground text-sm'>{t('admin_shop_view_product')}</p>
        <h1 className='font-semibold text-2xl text-foreground tracking-tight'>{product.name}</h1>
      </div>

      <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
        <div className='relative aspect-16/10 w-full bg-muted'>
          {product.imageUrl ? (
            <UnoptimizedImage
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes='(max-width: 768px) 100vw, 768px'
              className='object-cover'
            />
          ) : (
            <div className='flex size-full min-h-50 items-center justify-center bg-linear-to-br from-amber-100 to-orange-100 px-4'>
              <span className='text-center font-semibold text-amber-800/50 text-lg tracking-tight sm:text-2xl'>
                {t('territoire_vibrant')}
              </span>
            </div>
          )}
        </div>

        <div className='space-y-4 p-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold text-xs uppercase ${
                product.type === 'PHYSICAL' ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'
              }`}
            >
              {product.type === 'PHYSICAL' ? t('admin_shop_type_physical') : t('admin_shop_type_digital')}
            </span>
            {!product.isActive ? (
              <span className='rounded-full bg-stone-200 px-2 py-0.5 font-medium text-stone-700 text-xs'>
                {t('admin_shop_inactive')}
              </span>
            ) : null}
          </div>

          <p className='font-semibold text-foreground text-xl'>{formattedPrice}</p>

          {product.description ? (
            <div>
              <p className='mb-1 font-medium text-muted-foreground text-sm'>{t('admin_shop_field_description')}</p>
              <p className='whitespace-pre-wrap text-foreground text-sm leading-relaxed'>{product.description}</p>
            </div>
          ) : (
            <p className='text-muted-foreground text-sm italic'>{t('admin_shop_no_description')}</p>
          )}

          {product.partnerStoreUrl ? (
            <div>
              <p className='mb-1 font-medium text-muted-foreground text-sm'>
                {t('admin_shop_field_partner_store_url')}
              </p>
              <a
                href={product.partnerStoreUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='break-all text-primary text-sm underline hover:no-underline'
              >
                {product.partnerStoreUrl}
              </a>
            </div>
          ) : null}

          <div className='border-border border-t pt-4 text-muted-foreground text-xs'>
            <p>
              {t('admin_shop_created_at')}: {new Date(product.createdAt).toISOString().slice(0, 10)}
            </p>
            <p>
              {t('admin_shop_updated_at')}: {new Date(product.updatedAt).toISOString().slice(0, 10)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
