'use client'

import { useTranslations } from 'next-intl'
import { type ChangeEvent, useCallback, useEffect, useEffectEvent, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

import { Link, useRouter } from '~/i18n/navigation'

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type PublishStatusValue = (typeof STATUSES)[number]

type Props = {
  initialQuery: string
  initialSort: string
  initialStatus?: PublishStatusValue
}

export const Filters = ({ initialQuery, initialSort, initialStatus }: Props) => {
  const t = useTranslations()
  const { replace } = useRouter()
  const [queryDraft, setQueryDraft] = useState<string | null>(null)
  const [sortDraft, setSortDraft] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState<PublishStatusValue | '' | null>(null)

  const query = queryDraft ?? initialQuery
  const sort = sortDraft ?? initialSort ?? 'newest'
  const status = statusDraft ?? initialStatus ?? ''

  // Helper to write the URL with current state
  const commit = useCallback(
    (next: Partial<{ q: string; sort: string; status: string | undefined }>) => {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      if (next.q !== undefined) {
        const v = next.q.trim()
        if (v) params.set('q', v)
        else params.delete('q')
      }
      if (next.sort !== undefined) {
        if (next.sort) params.set('sort', next.sort)
        else params.delete('sort')
      }
      if (next.status !== undefined) {
        const v = next.status
        if (v) params.set('status', v)
        else params.delete('status')
      }
      const qs = params.toString()
      replace(qs ? `?${qs}` : '?', { scroll: false })
    },
    [replace]
  )
  const commitLatest = useEffectEvent(commit)

  // Debounce query updates for responsiveness without spamming navigation
  useEffect(() => {
    if (queryDraft === null) {
      return
    }
    const id = setTimeout(() => {
      commitLatest({ q: queryDraft })
    }, 300)
    return () => clearTimeout(id)
  }, [queryDraft])

  // Immediate update for sort and status
  useEffect(() => {
    if (sortDraft !== null) {
      commit({ sort: sortDraft })
    }
  }, [sortDraft, commit])

  useEffect(() => {
    if (statusDraft !== null) {
      commit({ status: statusDraft || undefined })
    }
  }, [statusDraft, commit])

  const onChangeQuery = (e: ChangeEvent<HTMLInputElement>) => setQueryDraft(e.target.value)
  return (
    <div className='flex w-full flex-col items-center gap-2 md:flex-row'>
      <input
        type='text'
        name='q'
        value={query}
        onChange={onChangeQuery}
        placeholder={t('publications_search_placeholder')}
        className='h-9 w-full rounded-md border px-3 text-sm shadow-sm'
      />

      <div className='flex w-full items-center gap-2 md:w-auto'>
        <Select value={sort} onValueChange={setSortDraft}>
          <SelectTrigger className='h-9 w-full border px-2 text-sm shadow-sm md:w-40'>
            <SelectValue placeholder={t('newest')} />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value='newest'>{t('newest')}</SelectItem>
            <SelectItem value='oldest'>{t('oldest')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status ? status : 'ALL'}
          onValueChange={(value) => setStatusDraft(value === 'ALL' ? '' : (value as PublishStatusValue))}
        >
          <SelectTrigger className='h-9 w-full border px-2 text-sm shadow-sm md:w-48'>
            <SelectValue placeholder={t('all_statuses')} />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value='ALL'>{t('all_statuses')}</SelectItem>

            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`publish_status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Link href='/admin/content/create'>
          <Button className='cursor-pointer'>{t('create')}</Button>
        </Link>
      </div>
    </div>
  )
}
