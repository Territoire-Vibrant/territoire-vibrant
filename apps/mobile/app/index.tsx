import { api } from '@tv/backend-client'
import { DEFAULT_LOCALE } from '@tv/domain/locale'
import { useQuery } from 'convex/react'
import { Link } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'

export default function ArticlesScreen() {
  const articles = useQuery(api.articles.listPublished, {})

  if (articles === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (articles.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Aucun article.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(article) => article._id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        // Shared fallback rule with the web: requested locale, then any published.
        const translation =
          item.translations.find((candidate) => candidate.locale === DEFAULT_LOCALE && candidate.published) ??
          item.translations.find((candidate) => candidate.published) ??
          item.translations[0]

        return (
          <Link href={{ pathname: '/article/[id]', params: { id: item._id } }} style={styles.row}>
            <Text style={styles.title}>{translation?.title ?? 'Sans titre'}</Text>
          </Link>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  empty: { opacity: 0.6 },
  list: { padding: 16 },
  row: { borderBottomColor: '#e5e5e5', borderBottomWidth: 1, paddingVertical: 16 },
  title: { fontSize: 17, fontWeight: '600' },
})
