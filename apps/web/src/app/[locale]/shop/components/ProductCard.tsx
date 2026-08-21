'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Button } from '~/components/ui/button'

import { Link } from '~/i18n/navigation'

type ProductType = 'PHYSICAL' | 'DIGITAL'

type Product = {
  id: string
  name: string
  description: string | null
  formattedPrice: string
  imageUrl: string | null
  type: ProductType
  partnerStoreUrl: string | null
}

interface ProductCardProps {
  product: Product
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const t = useTranslations()

  return (
    <div className='group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl'>
      <Link
        href={`/shop/${product.id}`}
        className='relative block aspect-4/3 w-full shrink-0 overflow-hidden bg-amber-50 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw'
            className='object-cover transition-transform duration-500 group-hover:scale-105'
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center bg-linear-to-br from-amber-100 to-orange-100 px-3'>
            <span className='text-center font-semibold text-amber-800/50 text-lg leading-tight tracking-tight sm:text-xl'>
              {t('territoire_vibrant')}
            </span>
          </div>
        )}

        <div className='pointer-events-none absolute top-3 left-3 z-10'>
          <span
            className={`rounded-full px-3 py-1 font-semibold text-xs uppercase tracking-wide ${
              product.type === 'PHYSICAL' ? 'bg-amber-700 text-amber-50' : 'bg-green-700 text-green-50'
            }`}
          >
            {product.type === 'PHYSICAL' ? t('product_physical') : t('product_digital')}
          </span>
        </div>
      </Link>

      <div className='flex flex-1 flex-col p-5'>
        <Link
          href={`/shop/${product.id}`}
          className='mb-2 line-clamp-2 font-semibold text-lg text-stone-800 transition-colors hover:text-primary hover:underline'
        >
          {product.name}
        </Link>

        {product.description ? (
          <p className='mb-4 line-clamp-3 flex-1 text-sm text-stone-600'>{product.description}</p>
        ) : null}

        <div className='mt-auto flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <span className='font-bold text-amber-800 text-xl'>{product.formattedPrice}</span>
          </div>

          <Link href={product.partnerStoreUrl ?? `/shop/${product.id}`} target='_blank'>
            <Button type='button' className='cursor-pointer'>
              {t('shop_buy_at_partner')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
