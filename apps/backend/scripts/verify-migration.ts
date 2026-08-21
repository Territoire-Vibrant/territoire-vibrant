/**
 * Compares the Convex deployment against the legacy Postgres database and
 * exits non-zero on any mismatch. Run after every import, dev and prod.
 *
 *   LEGACY_DATABASE_URL=... CONVEX_URL=... bun run scripts/verify-migration.ts
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ConvexHttpClient } from 'convex/browser'
import { Client } from 'pg'

import { api } from '../convex/_generated/api'

const scriptDir = dirname(fileURLToPath(import.meta.url))

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const main = async () => {
  const pg = new Client({ connectionString: requireEnv('LEGACY_DATABASE_URL') })
  await pg.connect()
  const convex = new ConvexHttpClient(requireEnv('CONVEX_URL'))

  const count = async (table: string): Promise<number> => {
    const result = await pg.query<{ count: string }>(`SELECT count(*) AS count FROM "${table}"`)
    return Number(result.rows[0]?.count ?? 0)
  }

  const [pgUsers, pgArticles, pgTranslations, pgProducts, pgLeads] = await Promise.all([
    count('User'),
    count('Article'),
    count('ArticleTranslation'),
    count('Product'),
    count('Lead'),
  ])

  // Note: counts are >=, not ==, because the deployment may already hold rows
  // created after the migration (a dev smoke test, a new lead). The spot
  // checks below prove the migrated rows themselves.
  const convexCounts = await convex.query(api.migrations.countAll, {})

  const failures: string[] = []

  const compare = (label: string, expected: number, actual: number) => {
    const ok = actual >= expected
    console.log(`${ok ? '✓' : '✗'} ${label}: postgres=${expected} convex=${actual}`)
    if (!ok) failures.push(label)
  }

  compare('users', pgUsers, convexCounts.users)
  compare('articles', pgArticles, convexCounts.articles)
  compare('articleTranslations', pgTranslations, convexCounts.articleTranslations)
  compare('products', pgProducts, convexCounts.products)
  compare('leads', pgLeads, convexCounts.leads)

  // Spot check 1: every active product price survived the cents conversion.
  const pgPrices = await pg.query<{ id: string; price: string }>(
    'SELECT id, price::text AS price FROM "Product"'
  )
  const convexProducts = await convex.query(api.migrations.listAllProductsRaw, { secret: requireEnv('MIGRATION_SECRET') })
  for (const row of pgPrices.rows) {
    const migrated = convexProducts.find((product) => product.legacyId === row.id)
    if (!migrated) {
      failures.push(`missing product ${row.id}`)
      console.log(`✗ product ${row.id} absent from convex`)
      continue
    }
    const expectedCents = Math.round(Number(row.price) * 100)
    if (migrated.priceCents !== expectedCents) {
      failures.push(`price mismatch ${row.id}`)
      console.log(`✗ product ${row.id}: expected ${expectedCents} got ${migrated.priceCents}`)
    } else {
      console.log(`✓ product ${row.id} price ${expectedCents} cents`)
    }
  }

  // Spot check 2: every article's translations arrived with matching locales.
  const pgTranslationCounts = await pg.query<{ articleId: string; n: string; locales: string }>(
    'SELECT "articleId", count(*)::text AS n, array_to_string(array_agg(locale ORDER BY locale), \',\') AS locales FROM "ArticleTranslation" GROUP BY "articleId"'
  )
  for (const row of pgTranslationCounts.rows) {
    const article = await convex.query(api.articles.getByAnyId, { id: row.articleId })
    if (!article) {
      failures.push(`missing article ${row.articleId}`)
      console.log(`✗ article ${row.articleId} absent from convex`)
      continue
    }
    const locales = article.translations.map((translation) => translation.locale).sort().join(',')
    if (article.translations.length !== Number(row.n) || locales !== row.locales) {
      failures.push(`translation mismatch ${row.articleId}`)
      console.log(`✗ article ${row.articleId}: expected ${row.n} [${row.locales}] got ${article.translations.length} [${locales}]`)
    } else {
      console.log(`✓ article ${row.articleId.slice(0, 8)}… ${row.n} translations [${locales}]`)
    }
  }

  await pg.end()

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log('\nAll checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
