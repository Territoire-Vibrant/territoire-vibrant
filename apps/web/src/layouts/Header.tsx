'use client'

import {
  CheckIcon,
  GlobeIcon,
  ListIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  XIcon,
} from '@phosphor-icons/react/dist/ssr'
import { type Locale, useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Link, usePathname, useRouter } from '~/i18n/navigation'
import { routing } from '~/i18n/routing'
import { cn } from '~/lib/utils'

const NAV_ITEMS = [
  { href: '/method', label: 'method' },
  { href: '/who-we-are', label: 'who_we_are' },
  { href: '/#projects', label: 'projects' },
  { href: '/services', label: 'services' },
  { href: '/content', label: 'content' },
  { href: '/shop', label: 'Shop.title' },
  { href: '/contact', label: 'contact' },
] as const

const localeLabelKey: Record<string, string> = {
  en: 'english',
  pt: 'portuguese',
  es: 'spanish',
  fr: 'french',
}

export const Header = () => {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const { push, replace } = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    push(`/search?q=${encodeURIComponent(query)}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const handleLanguageChange = (newLocale: Locale) => {
    replace(pathname, { locale: newLocale })
  }

  const isCurrent = (href: (typeof NAV_ITEMS)[number]['href']) => {
    if (href === '/#projects') return pathname === '/' && false
    return pathname === href
  }

  return (
    <header className='sticky top-0 z-40 border-foreground/10 border-b bg-background/95 backdrop-blur-xl'>
      <nav className='mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between px-5 sm:px-8'>
        <Link href='/' prefetch aria-label={t('territoire_vibrant')} className='shrink-0'>
          <Image
            src='/images/logotype_no_bg.png'
            alt={t('territoire_vibrant')}
            width={500}
            height={200}
            priority
            className='h-[46px] w-auto object-contain'
          />
        </Link>

        <div className='flex items-center gap-2'>
          <ul className='hidden items-stretch lg:flex'>
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className='relative flex items-center'>
                <Link
                  href={item.href}
                  prefetch
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={cn(
                    'relative flex h-[72px] items-center px-4 font-medium text-[15px] text-foreground/90 transition-colors hover:text-primary',
                    'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-primary after:transition-transform',
                    isCurrent(item.href) && 'font-semibold text-primary after:scale-x-100'
                  )}
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>

          <div className='flex items-center gap-0.5 lg:ml-3'>
            <div className='relative flex items-center'>
              <form
                onSubmit={handleSearch}
                className={cn(
                  'overflow-hidden transition-[width,opacity] duration-300',
                  searchOpen ? 'w-40 opacity-100 sm:w-56' : 'w-0 opacity-0'
                )}
              >
                <input
                  ref={searchInputRef}
                  type='search'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('search')}
                  className='h-10 w-full border-primary/30 border-b bg-transparent px-2 text-sm outline-none placeholder:text-foreground/40 focus:border-primary'
                />
              </form>
              <Button
                variant='ghost'
                size='icon'
                aria-label={searchOpen ? 'Fechar busca' : t('search')}
                className='rounded-full hover:bg-primary/10 hover:text-primary'
                onClick={() => setSearchOpen((current) => !current)}
              >
                {searchOpen ? <XIcon className='size-5' /> : <MagnifyingGlassIcon className='size-5' />}
              </Button>
            </div>

            <Link href='/shop' prefetch aria-label={t('Shop.title')}>
              <Button variant='ghost' size='icon' className='rounded-full hover:bg-primary/10 hover:text-primary'>
                <ShoppingCartIcon className='size-5' />
              </Button>
            </Link>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='rounded-full hover:bg-primary/10 hover:text-primary'>
                  <GlobeIcon className='size-5' />
                  <span className='sr-only'>Idioma</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {routing.locales.map((loc) => (
                  <DropdownMenuItem key={loc} onClick={() => handleLanguageChange(loc as Locale)}>
                    <span>{localeLabelKey[loc] ? t(localeLabelKey[loc] as never) : loc.toUpperCase()}</span>
                    {loc === locale && <CheckIcon className='ml-auto size-4 text-primary' />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogTrigger asChild>
                <Button variant='ghost' size='icon' className='rounded-full lg:hidden'>
                  <ListIcon className='size-6' />
                  <span className='sr-only'>Abrir menu</span>
                </Button>
              </DialogTrigger>
              <DialogContent className='inset-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col justify-center rounded-none border-0 bg-background p-8 sm:max-w-none'>
                <DialogHeader className='sr-only'>
                  <DialogTitle>Menu</DialogTitle>
                  <DialogDescription>Navegação principal</DialogDescription>
                </DialogHeader>
                <ul className='flex flex-col items-center gap-5'>
                  {NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch
                        className={cn('font-semibold text-2xl', isCurrent(item.href) && 'text-primary')}
                        onClick={() => setMenuOpen(false)}
                      >
                        {t(item.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>
    </header>
  )
}
