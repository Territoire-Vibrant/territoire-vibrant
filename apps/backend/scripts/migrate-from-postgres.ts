/**
 * Reads the legacy Postgres database and imports it into Convex.
 *
 *   LEGACY_DATABASE_URL=... CLERK_JWT_ISSUER_DOMAIN=https://clerk.territoirevibrant.ca \
 *   CONVEX_URL=... MIGRATION_SECRET=... bun run scripts/migrate-from-postgres.ts --dry-run
 *
 * The issuer used for tokenIdentifier composition is ALWAYS the production
 * Clerk issuer, regardless of the target deployment — the real users live on
 * the production instance. Do not parameterize this away.
 *
 * Every import is idempotent on legacyId, so re-running after a failure
 * resumes rather than duplicating.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ConvexHttpClient } from 'convex/browser'
import { Client } from 'pg'

import { api } from '../convex/_generated/api'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 25
const ARTIFACT_DIR = join(scriptDir, '..', '.migration-artifacts')

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const DEFAULT_CURRENCY = 'CAD'
const toMillis = (value: Date): number => value.getTime()
const optional = (value: string | null): string | undefined => value?.trim() || undefined

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const writeArtifact = (name: string, rows: unknown[]) => {
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  const path = join(ARTIFACT_DIR, `${name}.json`)
  writeFileSync(path, JSON.stringify(rows, null, 2))
  console.log(`  artifact → ${path} (${rows.length} rows)`)
}

type ProductRow = {
  legacyId: string
  name: string
  description?: string
  priceCents: number
  currency: string
  imageUrl?: string
  type: 'PHYSICAL' | 'DIGITAL'
  isActive: boolean
  partnerStoreUrl?: string
  createdAt: number
  updatedAt: number
}

type ArticleRow = {
  legacyId: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: number
  updatedAt: number
  translations: Array<{
    legacyId: string
    locale: 'en' | 'es' | 'fr' | 'pt'
    title: string
    bodyMd: string
    published: boolean
  }>
}

const main = async () => {
  const pg = new Client({ connectionString: requireEnv('LEGACY_DATABASE_URL') })
  await pg.connect()

  // ALWAYS the production issuer — see the file comment.
  const issuer = requireEnv('CLERK_JWT_ISSUER_DOMAIN')
  if (!issuer.startsWith('https://clerk.territoirevibrant.ca')) {
    throw new Error(`Refusing to import with a non-production issuer: ${issuer}`)
  }

  const convex = DRY_RUN ? null : new ConvexHttpClient(requireEnv('CONVEX_URL'))
  const secret = DRY_RUN ? '' : requireEnv('MIGRATION_SECRET')

  console.log(DRY_RUN ? '── DRY RUN — nothing will be written ──' : '── LIVE IMPORT ──')

  // ---- Users -------------------------------------------------------------
  const users = await pg.query<{
    id: string
    email: string | null
    name: string | null
    imageUrl: string | null
    createdAt: Date
    updatedAt: Date
  }>('SELECT id, email, name, "imageUrl", "createdAt", "updatedAt" FROM "User"')

  const userRows = users.rows.map((row) => ({
    clerkUserId: row.id,
    // Convex composes tokenIdentifier as `${issuer}|${subject}`.
    tokenIdentifier: `${issuer}|${row.id}`,
    email: optional(row.email),
    name: optional(row.name),
    imageUrl: optional(row.imageUrl),
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
  }))
  writeArtifact('users', userRows)

  // ---- Products ----------------------------------------------------------
  const products = await pg.query<{
    id: string
    name: string
    description: string | null
    price: string
    imageUrl: string | null
    type: 'PHYSICAL' | 'DIGITAL'
    isActive: boolean
    partnerStoreUrl: string | null
    createdAt: Date
    updatedAt: Date
  }>(
    'SELECT id, name, description, price::text AS price, "imageUrl", type, "isActive", "amazonUrl" AS "partnerStoreUrl", "createdAt", "updatedAt" FROM "Product"'
  )

  const productRows: ProductRow[] = products.rows.map((row) => ({
    legacyId: row.id,
    name: row.name,
    description: optional(row.description),
    priceCents: Math.round(Number(row.price) * 100),
    currency: DEFAULT_CURRENCY,
    imageUrl: optional(row.imageUrl),
    type: row.type,
    isActive: row.isActive,
    partnerStoreUrl: optional(row.partnerStoreUrl),
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
  }))
  writeArtifact('products', productRows)

  // ---- Articles + translations ------------------------------------------
  const articles = await pg.query<{
    id: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    createdAt: Date
    updatedAt: Date
  }>('SELECT id, status, "createdAt", "updatedAt" FROM "Article"')

  const translations = await pg.query<{
    id: string
    articleId: string
    locale: 'en' | 'es' | 'fr' | 'pt'
    title: string
    bodyMd: string
    published: boolean
  }>('SELECT id, "articleId", locale, title, "bodyMd", published FROM "ArticleTranslation"')

  const byArticle = new Map<string, typeof translations.rows>()
  for (const row of translations.rows) {
    const list = byArticle.get(row.articleId) ?? []
    list.push(row)
    byArticle.set(row.articleId, list)
  }

  const orphans = [...byArticle.keys()].filter(
    (articleId) => !articles.rows.some((article) => article.id === articleId)
  )
  if (orphans.length > 0) {
    throw new Error(`Orphan translations reference missing articles: ${orphans.join(', ')}`)
  }

  const articleRows: ArticleRow[] = articles.rows.map((row) => ({
    legacyId: row.id,
    status: row.status,
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
    translations: (byArticle.get(row.id) ?? []).map((translation) => ({
      legacyId: translation.id,
      locale: translation.locale,
      title: translation.title,
      bodyMd: translation.bodyMd,
      published: translation.published,
    })),
  }))
  writeArtifact('articles', articleRows)

  // ---- Leads -------------------------------------------------------------
  const leads = await pg.query<{ id: string; name: string; email: string; phone: string; createdAt: Date }>(
    'SELECT id, name, email, phone, "createdAt" FROM "Lead"'
  )

  const leadRows = leads.rows.map((row) => ({
    legacyId: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: toMillis(row.createdAt),
  }))
  writeArtifact('leads', leadRows)

  await pg.end()

  console.log('\nSource counts:')
  console.log(`  users        ${userRows.length}`)
  console.log(`  products     ${productRows.length}`)
  console.log(`  articles     ${articleRows.length}`)
  console.log(`  translations ${translations.rows.length}`)
  console.log(`  leads        ${leadRows.length}`)

  if (DRY_RUN || !convex) {
    console.log('\nDry run complete. Inspect .migration-artifacts/ before importing.')
    return
  }

  const runBatches = async <T>(
    label: string,
    rows: T[],
    fn: (batch: T[]) => Promise<{ inserted: number; skipped?: number }>
  ) => {
    let inserted = 0
    let skipped = 0
    for (const [index, batch] of chunk(rows, BATCH_SIZE).entries()) {
      const result = await fn(batch)
      inserted += result.inserted
      skipped += result.skipped ?? 0
      console.log(`  ${label} batch ${index + 1}: +${result.inserted} (${result.skipped ?? 0} existing)`)
    }
    console.log(`${label}: ${inserted} inserted, ${skipped} already present`)
  }

  console.log('\nImporting…')
  await runBatches('users', userRows, (rows) => convex.mutation(api.migrations.importUsers, { secret, rows }))
  await runBatches('products', productRows, (rows) =>
    convex.mutation(api.migrations.importProducts, { secret, rows })
  )
  await runBatches('articles', articleRows, (rows) =>
    convex.mutation(api.migrations.importArticles, { secret, rows })
  )
  await runBatches('leads', leadRows, (rows) => convex.mutation(api.migrations.importLeads, { secret, rows }))

  console.log('\nImport finished. Run `bun run migrate:verify` next.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
