import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { Section } from '~/layouts/Section'
import { fromCents } from '@tv/domain/money'

import { api } from '@tv/backend-client'

import { publicQuery } from '~/server/convex'
import { formatPrice } from '~/lib/format-price'

import { EbookCard } from './components/EbookCard'
import { ProductCard } from './components/ProductCard'

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse Territoire Vibrant products and downloads.',
}

export default async function ShopPage() {
  const [t, locale, products] = await Promise.all([
    getTranslations(),
    getLocale(),
    publicQuery(api.products.listActive, {}),
  ])

  return (
    <Section limitWidth={false} className='bg-linear-to-b from-amber-50/50 to-stone-100 px-6 py-12'>
      <div className='mx-auto flex w-full max-w-6xl flex-col gap-10'>
        <div className='space-y-3 text-center'>
          <h1 className='font-semibold text-4xl text-stone-800 tracking-tight'>{t('shop_page_title')}</h1>
          <p className='mx-auto max-w-2xl text-base text-stone-600'>{t('shop_page_subtitle')}</p>
        </div>

        {/* Grid always renders - EbookCard ensures there's always at least one item */}
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {/* Free e-book download - always first */}
          <EbookCard />

          {products.map((product: { _id: string; legacyId?: string; name: string; description?: string; priceCents: number; currency: string; imageUrl?: string; type: 'PHYSICAL'|'DIGITAL'; partnerStoreUrl?: string }) => (
            <ProductCard
              key={product._id}
              product={{
                id: product.legacyId ?? product._id,
                name: product.name,
                description: product.description ?? null,
                formattedPrice: formatPrice(fromCents(product.priceCents), locale, product.currency),
                imageUrl: product.imageUrl ?? null,
                type: product.type,
                partnerStoreUrl: product.partnerStoreUrl ?? null,
              }}
            />
          ))}
        </div>
      </div>
    </Section>
  )
}
