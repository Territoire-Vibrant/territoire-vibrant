import { getTranslations } from 'next-intl/server'

import { ArticleForm, type ArticleFormInitial } from '../components/ArticleForm'

import { api } from '@tv/backend-client'

import { authedQuery, convexToken } from '~/server/convex'

export default async function PublicationEditPage({
  params,
}: {
  params: Promise<{
    articleId: string
    locale: string
  }>
}) {
  const { articleId } = await params

  const [, data] = await Promise.all([
    getTranslations(), // ensure messages available for client form
    authedQuery(api.articles.getByAnyId, { id: articleId }),
  ])

  const defaultValues: ArticleFormInitial | undefined = data
    ? {
        articleId: data._id,
        status: data.status,
        translations: data.translations.map((tr) => ({
          locale: tr.locale,
          title: tr.title,
          bodyMd: tr.bodyMd,
          published: tr.published ?? false,
        })),
      }
    : undefined

  return (
    <div className='mx-auto w-full max-w-6xl px-6 py-10'>
      <ArticleForm mode='edit' defaultValues={defaultValues} />
    </div>
  )
}
