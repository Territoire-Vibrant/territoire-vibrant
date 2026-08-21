import type { Metadata } from 'next'

import { LogoutClient } from './LogoutClient'

export const metadata: Metadata = {
  title: 'Logout',
  description: 'Sign out of Territoire Vibrant.',
}

export default function LogoutPage() {
  return <LogoutClient />
}
