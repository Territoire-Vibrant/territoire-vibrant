import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fromCents } from '@tv/domain/money'

import { api } from '@tv/backend-client'

import { publicQuery } from '~/server/convex'
import { formatPrice } from '~/lib/format-price'
import Image from 'next/image'
import { z } from 'zod'

import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '~/components/ui/button'

import { Link, notFound } from '~/i18n/navigation'
import { routing } from '~/i18n/routing'
import { Section } from '~/layouts/Section'


type PageProps = {
  params: Promise<{ locale: string; productId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, productId } = await params

  if (!hasLocale(routing.locales, locale)) {
    return { title: 'Shop' }
  }

  if (!z.uuid().safeParse(productId).success) {
    return { title: 'Shop' }
  }

  const product = await publicQuery(api.products.getByAnyId, { id: productId })
  if (!product?.isActive) {
    return { title: 'Shop' }
  }

  const t = await getTranslations({ locale })
  return {
    title: `${product.name} | ${t('shop_page_title')}`,
  }
}

export default async function ShopProductDetailPage({ params }: PageProps) {
  const { locale, productId } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)

  if (!z.uuid().safeParse(productId).success) {
    notFound()
  }

  const [t, fetched] = await Promise.all([
    getTranslations(),
    // getByAnyId also resolves pre-migration Postgres UUIDs, so old links keep working.
    publicQuery(api.products.getByAnyId, { id: productId }),
  ])

  const product = fetched?.isActive ? fetched : null
  if (!product) {
    notFound()
  }

  const formattedPrice = formatPrice(fromCents(product.priceCents), locale, product.currency)

  return (
    <Section limitWidth={false} className='bg-linear-to-b from-amber-50/50 to-stone-100 px-6 py-12'>
      <div className='mx-auto flex w-full max-w-3xl flex-col gap-8'>
        <Button variant='ghost' size='sm' className='-ml-2 w-fit gap-2 text-stone-600 hover:text-stone-900' asChild>
          <Link href='/shop'>
            <ArrowLeftIcon className='size-4' aria-hidden />
            {t('shop_product_back')}
          </Link>
        </Button>

        <div className='overflow-hidden rounded-2xl bg-white shadow-md'>
          <div className='relative aspect-16/10 w-full bg-amber-50'>
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 48rem'
              />
            ) : (
              <div className='flex size-full items-center justify-center bg-linear-to-br from-amber-100 to-orange-100 px-6'>
                <span className='text-center font-semibold text-2xl text-amber-800/50 tracking-tight sm:text-3xl md:text-4xl'>
                  {t('territoire_vibrant')}
                </span>
              </div>
            )}
            <div className='absolute top-4 left-4'>
              <span
                className={`rounded-full px-3 py-1 font-semibold text-xs uppercase tracking-wide ${
                  product.type === 'PHYSICAL' ? 'bg-amber-700 text-amber-50' : 'bg-green-700 text-green-50'
                }`}
              >
                {product.type === 'PHYSICAL' ? t('product_physical') : t('product_digital')}
              </span>
            </div>
          </div>

          <div className='flex flex-col gap-6 p-6 sm:p-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='font-semibold text-3xl text-stone-800 tracking-tight'>{product.name}</h1>
              <p className='font-bold text-2xl text-amber-800'>{formattedPrice}</p>
            </div>

            {product.description ? (
              <p className='whitespace-pre-wrap text-base text-stone-600 leading-relaxed'>{product.description}</p>
            ) : null}

            <Link href={product.partnerStoreUrl ?? `/shop/${product.legacyId ?? productId}`} target='_blank'>
              <Button type='button' className='cursor-pointer'>
                {t('shop_buy_at_partner')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  )
}
