import { LocaleValidator, PublishStatusValidator } from '@tv/domain/validators'
import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import { mutation, type QueryCtx, query } from './_generated/server'
import { buildSearchText } from '../src/content/policy'
import { requireAdmin } from './helpers/auth'

const translationInput = v.object({
  locale: LocaleValidator,
  title: v.string(),
  bodyMd: v.string(),
  published: v.optional(v.boolean()),
})

const withTranslations = async (ctx: QueryCtx, article: Doc<'articles'>) => ({
  ...article,
  translations: await ctx.db
    .query('articleTranslations')
    .withIndex('by_article', (q) => q.eq('articleId', article._id))
    .collect(),
})

/** Public feed. Replaces `article.getAll` filtered down to what visitors may see. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query('articles')
      .withIndex('by_status_createdAt', (q) => q.eq('status', 'PUBLISHED'))
      .order('desc')
      .collect()

    const hydrated = await Promise.all(articles.map((article) => withTranslations(ctx, article)))
    return hydrated.map((article) => ({
      ...article,
      translations: article.translations.filter((translation) => translation.published),
    }))
  },
})

/** Admin listing. Every article regardless of status, newest first. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const articles = await ctx.db.query('articles').withIndex('by_createdAt').order('desc').collect()
    return Promise.all(articles.map((article) => withTranslations(ctx, article)))
  },
})

export const getById = query({
  args: { articleId: v.id('articles') },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId)
    return article ? withTranslations(ctx, article) : null
  },
})

/**
 * Resolves an article by its Convex id or by the Postgres UUID it carried
 * before the migration, so links published before cutover keep working.
 */
export const getByAnyId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byLegacy = await ctx.db
      .query('articles')
      .withIndex('by_legacyId', (q) => q.eq('legacyId', args.id))
      .unique()

    if (byLegacy) return withTranslations(ctx, byLegacy)

    const article = await ctx.db.get(args.id as Id<'articles'>).catch(() => null)
    return article ? withTranslations(ctx, article) : null
  },
})

/**
 * Replaces the Prisma `contains` query that scanned title and bodyMd. Convex
 * search indexes one field, so both live in the denormalized `searchText`.
 */
export const search = query({
  args: { query: v.string(), locale: v.optional(LocaleValidator) },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim()
    if (!trimmed) return []

    const matches = await ctx.db
      .query('articleTranslations')
      .withSearchIndex('search_content', (q) => {
        const base = q.search('searchText', trimmed).eq('published', true)
        return args.locale ? base.eq('locale', args.locale) : base
      })
      .take(50)

    const byArticle = new Map<Id<'articles'>, Doc<'articleTranslations'>[]>()
    for (const match of matches) {
      const list = byArticle.get(match.articleId) ?? []
      list.push(match)
      byArticle.set(match.articleId, list)
    }

    const results = await Promise.all(
      [...byArticle.entries()].map(async ([articleId, translations]) => {
        const article = await ctx.db.get(articleId)
        if (!article || article.status !== 'PUBLISHED') return null
        return { ...article, translations }
      })
    )

    return results
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const create = mutation({
  args: { status: PublishStatusValidator, translations: v.array(translationInput) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const now = Date.now()

    const articleId = await ctx.db.insert('articles', {
      status: args.status,
      createdAt: now,
      updatedAt: now,
    })

    for (const translation of args.translations) {
      await ctx.db.insert('articleTranslations', {
        articleId,
        locale: translation.locale,
        title: translation.title,
        bodyMd: translation.bodyMd,
        published: translation.published ?? false,
        searchText: buildSearchText(translation.title, translation.bodyMd),
      })
    }

    return articleId
  },
})

export const update = mutation({
  args: {
    articleId: v.id('articles'),
    status: PublishStatusValidator,
    translations: v.array(translationInput),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    await ctx.db.patch(args.articleId, { status: args.status, updatedAt: Date.now() })

    for (const translation of args.translations) {
      const existing = await ctx.db
        .query('articleTranslations')
        .withIndex('by_article_locale', (q) => q.eq('articleId', args.articleId).eq('locale', translation.locale))
        .unique()

      const fields = {
        title: translation.title,
        bodyMd: translation.bodyMd,
        published: translation.published ?? false,
        searchText: buildSearchText(translation.title, translation.bodyMd),
      }

      if (existing) {
        await ctx.db.patch(existing._id, fields)
      } else {
        await ctx.db.insert('articleTranslations', { articleId: args.articleId, locale: translation.locale, ...fields })
      }
    }

    return args.articleId
  },
})

/** Prisma had `onDelete: Cascade`; Convex has no foreign keys, so it is explicit. */
export const remove = mutation({
  args: { articleId: v.id('articles') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const translations = await ctx.db
      .query('articleTranslations')
      .withIndex('by_article', (q) => q.eq('articleId', args.articleId))
      .collect()

    for (const translation of translations) {
      await ctx.db.delete(translation._id)
    }

    await ctx.db.delete(args.articleId)
  },
})
