import { getTranslations } from 'next-intl/server'

import { Button } from '~/components/ui/button'
import { ProductForm } from '../components/ProductForm'

import { Link } from '~/i18n/navigation'

export default async function AdminShopCreatePage() {
  const t = await getTranslations()

  return (
    <div className='mx-auto w-full max-w-6xl px-6 py-10'>
      <div className='mx-auto mb-8 flex max-w-3xl items-center justify-between gap-4'>
        <h1 className='font-semibold text-2xl text-foreground tracking-tight'>{t('admin_shop_new_product')}</h1>
        <Button variant='outline' size='sm' asChild>
          <Link href='/admin/shop'>{t('cancel')}</Link>
        </Button>
      </div>
      <ProductForm mode='create' />
    </div>
  )
}
