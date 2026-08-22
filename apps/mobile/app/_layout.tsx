import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { AppProviders } from '../src/providers/app-providers'

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTitle: 'Territoire Vibrant' }} />
    </AppProviders>
  )
}
