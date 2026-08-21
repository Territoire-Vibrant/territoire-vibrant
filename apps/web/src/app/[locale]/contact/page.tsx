import type { Metadata } from 'next'

import { ContactSection } from '../(home)/components/ContactSection'

export const metadata: Metadata = {
  title: 'Contato | Territoire Vibrant',
  description: 'Vamos conversar sobre como ativar o seu território.',
}

export default function ContactPage() {
  return <ContactSection />
}
