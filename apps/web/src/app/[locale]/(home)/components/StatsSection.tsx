import { useTranslations } from 'next-intl'
import { LeafIcon } from '@phosphor-icons/react/dist/ssr'

export const StatsSection = () => {
  const t = useTranslations()

  const stats = [
    { value: t('Home.stats.communities'), label: t('Home.stats.communities_label') },
    { value: t('Home.stats.territories'), label: t('Home.stats.territories_label') },
    { value: t('Home.stats.partnerships'), label: t('Home.stats.partnerships_label') },
    { value: t('Home.stats.impact'), label: t('Home.stats.impact_label') },
  ] as const

  return (
    <div className='grid overflow-hidden rounded-[15px] border border-[#6e9f26] bg-[#063621]/55 backdrop-blur-sm lg:grid-cols-[1.55fr_2.45fr]'>
      <div className='grid items-center gap-5 border-[#6e9f26]/55 border-b px-6 py-6 sm:grid-cols-[68px_1fr_1.15fr] lg:border-r lg:border-b-0'>
        <span
          className='mx-auto flex size-16 items-center justify-center rounded-full border border-[#77aa21]'
          aria-hidden
        >
          <LeafIcon size={34} weight='thin' className='text-[#8fbd2e]' />
        </span>
        <p className='font-bold text-xl leading-snug sm:text-2xl'>{t('Home.projects.collective_title')}</p>
        <p className='border-[#6e9f26]/45 text-sm text-white/78 leading-relaxed sm:border-l sm:pl-6'>
          {t('Home.projects.collective_description')}
        </p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4'>
        {stats.map((stat, index) => (
          <div key={stat.label} className={index > 0 ? 'border-[#6e9f26]/45 border-l' : undefined}>
            <StatItem value={stat.value} label={stat.label} />
          </div>
        ))}
      </div>
    </div>
  )
}

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className='flex h-full min-h-[8.1rem] flex-col items-center justify-center px-3 py-5 text-center'>
    <p className='font-bold text-2xl text-[#8fbd2e]'>{value}</p>
    <p className='mt-1 max-w-32 text-white/84 text-xs leading-relaxed sm:text-sm'>{label}</p>
  </div>
)
