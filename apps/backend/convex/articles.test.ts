// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.*s')

const makeTest = () => convexTest(schema, modules)

const adminIdentity = {
  tokenIdentifier: 'https://clerk.territoirevibrant.ca|admin_1',
  subject: 'admin_1',
  issuer: 'https://clerk.territoirevibrant.ca',
  email: 'admin@example.com',
}

const seedAdmin = async (t: ReturnType<typeof makeTest>) => {
  await t.run(async (ctx) => {
    await ctx.db.insert('users', {
      tokenIdentifier: adminIdentity.tokenIdentifier,
      clerkUserId: adminIdentity.subject,
      email: adminIdentity.email,
      isAdmin: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

describe('articles', () => {
  it('creates an article with its translations', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const articleId = await asAdmin.mutation(api.articles.create, {
      status: 'PUBLISHED',
      translations: [
        { locale: 'fr', title: 'Bonjour', bodyMd: 'Corps français', published: true },
        { locale: 'en', title: 'Hello', bodyMd: 'English body', published: true },
      ],
    })

    const article = await t.query(api.articles.getById, { articleId })
    expect(article?.status).toBe('PUBLISHED')
    expect(article?.translations).toHaveLength(2)
  })

  it('rejects a non-admin creating an article', async () => {
    const t = makeTest()
    await expect(
      t.mutation(api.articles.create, {
        status: 'DRAFT',
        translations: [{ locale: 'fr', title: 'x', bodyMd: 'y' }],
      })
    ).rejects.toThrow()
  })

  it('upserts translations on update instead of duplicating them', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const articleId = await asAdmin.mutation(api.articles.create, {
      status: 'DRAFT',
      translations: [{ locale: 'fr', title: 'v1', bodyMd: 'corps', published: false }],
    })

    await asAdmin.mutation(api.articles.update, {
      articleId,
      status: 'PUBLISHED',
      translations: [{ locale: 'fr', title: 'v2', bodyMd: 'corps', published: true }],
    })

    const article = await t.query(api.articles.getById, { articleId })
    expect(article?.translations).toHaveLength(1)
    expect(article?.translations[0]?.title).toBe('v2')
    expect(article?.status).toBe('PUBLISHED')
  })

  it('lists only published articles for the public feed', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await asAdmin.mutation(api.articles.create, {
      status: 'PUBLISHED',
      translations: [{ locale: 'fr', title: 'visible', bodyMd: 'a', published: true }],
    })
    await asAdmin.mutation(api.articles.create, {
      status: 'DRAFT',
      translations: [{ locale: 'fr', title: 'hidden', bodyMd: 'b', published: false }],
    })

    const published = await t.query(api.articles.listPublished, {})
    expect(published).toHaveLength(1)
    expect(published[0]?.translations[0]?.title).toBe('visible')
  })

  it('finds an article by its legacy postgres id', async () => {
    const t = makeTest()
    const legacyId = '11111111-2222-3333-4444-555555555555'

    await t.run(async (ctx) => {
      const articleId = await ctx.db.insert('articles', {
        legacyId,
        status: 'PUBLISHED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await ctx.db.insert('articleTranslations', {
        articleId,
        locale: 'fr',
        title: 'Legacy',
        bodyMd: 'corps',
        published: true,
        searchText: 'Legacy\ncorps',
      })
    })

    const article = await t.query(api.articles.getByAnyId, { id: legacyId })
    expect(article?.translations[0]?.title).toBe('Legacy')
  })

  it('searches across title and body', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await asAdmin.mutation(api.articles.create, {
      status: 'PUBLISHED',
      translations: [{ locale: 'fr', title: 'Territoire', bodyMd: 'parle de cartographie', published: true }],
    })

    const byTitle = await t.query(api.articles.search, { query: 'Territoire' })
    const byBody = await t.query(api.articles.search, { query: 'cartographie' })

    expect(byTitle).toHaveLength(1)
    expect(byBody).toHaveLength(1)
  })

  it('deletes translations together with the article', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const articleId = await asAdmin.mutation(api.articles.create, {
      status: 'DRAFT',
      translations: [
        { locale: 'fr', title: 'a', bodyMd: 'b', published: false },
        { locale: 'en', title: 'c', bodyMd: 'd', published: true },
      ],
    })

    await asAdmin.mutation(api.articles.remove, { articleId })

    const rows = await t.run(async (ctx) => ({
      articles: await ctx.db.query('articles').collect(),
      translations: await ctx.db.query('articleTranslations').collect(),
    }))
    expect(rows.articles).toHaveLength(0)
    // Prisma's onDelete: Cascade is now this explicit loop — no orphans allowed.
    expect(rows.translations).toHaveLength(0)
  })
})
