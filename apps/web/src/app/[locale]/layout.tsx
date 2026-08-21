import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { type Locale, NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'

import type { ReactNode } from 'react'
import { notFound } from '~/i18n/navigation'

import '../globals.css'

import { ConvexClientProvider } from '~/components/convex-client-provider'
import { Toaster } from '~/components/ui/sonner'
import { UserBootstrap } from '~/components/user-bootstrap'
import { routing } from '~/i18n/routing'
import { Footer } from '~/layouts/Footer'
import { Header } from '~/layouts/Header'

export const dynamic = 'force-dynamic'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type RootLayoutProps = Readonly<{
  children: ReactNode
  params: Promise<{ locale: string }>
}>

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: locale as Locale })

  return {
    title: `${t('territoire_vibrant')} | ${t.markup('Home.hero.title', { v: (chunks: string) => chunks })}`,
    description: t('Home.hero.paragraph_1'),
  }
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body className={`${geistSans.variable} ${geistMono.variable} relative antialiased`}>
          <Analytics />
          <SpeedInsights />
          <Toaster richColors />

          <NextIntlClientProvider locale={locale} messages={messages}>
            <ConvexClientProvider>
              {/* Replaces the per-render prisma upsert that used to live here. */}
              <UserBootstrap />
              <Header />
              <main className='mx-auto min-h-[50dvh] w-full min-w-0 flex-1'>{children}</main>
              <Footer />
            </ConvexClientProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
