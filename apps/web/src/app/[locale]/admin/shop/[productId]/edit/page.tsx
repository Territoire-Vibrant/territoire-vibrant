import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

import { ProductForm } from '../../components/ProductForm'

import { fromCents } from '@tv/domain/money'

import { api } from '@tv/backend-client'

import { authedQuery } from '~/server/convex'
import { notFound } from '~/i18n/navigation'

export default async function AdminShopEditPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params

  if (!z.uuid().safeParse(productId).success) {
    notFound()
  }

  const [t, product] = await Promise.all([getTranslations(), authedQuery(api.products.getByAnyId, { id: productId })])
  if (!product) {
    notFound()
  }

  const defaultValues = {
    name: product.name,
    description: product.description ?? '',
    price: fromCents(product.priceCents),
    type: product.type,
    imageUrl: product.imageUrl ?? '',
    isActive: product.isActive,
    partnerStoreUrl: product.partnerStoreUrl ?? '',
  }

  return (
    <div className='mx-auto w-full max-w-6xl px-6 py-10'>
      <div className='mx-auto mb-8 max-w-3xl'>
        <h1 className='font-semibold text-2xl text-foreground tracking-tight'>{t('admin_shop_edit_product')}</h1>
      </div>

      <ProductForm mode='edit' productId={product._id} defaultValues={defaultValues} />
    </div>
  )
}
