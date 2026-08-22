import { api } from '@tv/backend-client'
import { ClerkProvider, useAuth } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import Constants from 'expo-constants'
import { useEffect, type PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const convexUrl =
  (Constants.expoConfig?.extra?.convexUrl as string | undefined) ?? process.env.EXPO_PUBLIC_CONVEX_URL

if (!convexUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL is required (or set expo.extra.convexUrl in app.json)')
}

const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })

// Module-level so the compiler never sees a hook referenced as a value in render.
const convexClerkAuth = useAuth

/**
 * Replaces the Prisma upsert that used to run on every web layout render.
 * Fires once after authentication settles.
 */
const UserBootstrap = () => {
  const { isAuthenticated } = useConvexAuth()
  const store = useMutation(api.users.store)

  useEffect(() => {
    if (!isAuthenticated) return
    void store({}).catch(() => {})
  }, [isAuthenticated, store])

  return null
}

export const AppProviders = ({ children }: PropsWithChildren) => (
  <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
    <ConvexProviderWithClerk client={convex} useAuth={convexClerkAuth}>
      <SafeAreaProvider>
        <UserBootstrap />
        {children}
      </SafeAreaProvider>
    </ConvexProviderWithClerk>
  </ClerkProvider>
)
