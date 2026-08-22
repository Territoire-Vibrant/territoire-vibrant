import { api } from '@tv/backend-client'
import { DEFAULT_LOCALE } from '@tv/domain/locale'
import { useQuery } from 'convex/react'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  // getByAnyId also resolves pre-migration Postgres UUIDs.
  const article = useQuery(api.articles.getByAnyId, id ? { id } : 'skip')

  if (article === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (article === null) {
    return (
      <View style={styles.center}>
        <Text>Article introuvable.</Text>
      </View>
    )
  }

  const translation =
    article.translations.find((candidate) => candidate.locale === DEFAULT_LOCALE && candidate.published) ??
    article.translations.find((candidate) => candidate.published) ??
    article.translations[0]

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{translation?.title}</Text>
      {/* Plain text for v1; real markdown rendering is scoped for a later pass. */}
      <Text style={styles.body}>{translation?.bodyMd}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: 16, padding: 16 },
  title: { fontSize: 24, fontWeight: '700' },
})
