'use client'

import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export const LogoutClient = () => {
  const { signOut } = useClerk()

  useEffect(() => {
    // Immediately sign out and redirect to home
    void signOut({ redirectUrl: '/' })
  }, [signOut])

  return null
}
