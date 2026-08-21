import {
  BankIcon,
  BriefcaseIcon,
  BuildingsIcon,
  HeartIcon,
  LeafIcon,
  MapTrifoldIcon,
  ShareNetworkIcon,
  TreeStructureIcon,
  UsersFourIcon,
} from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Link } from '~/i18n/navigation'

export const metadata: Metadata = {
  title: 'Serviços | Territoire Vibrant',
  description: 'Soluções para ativar ecossistemas territoriais vivos, colaborativos e regenerativos.',
}

const audiences = [
  { icon: <BuildingsIcon />, label: 'Municípios' },
  { icon: <BriefcaseIcon />, label: 'PME' },
  { icon: <BankIcon />, label: 'Instituições' },
  { icon: <UsersFourIcon />, label: 'Organizações' },
  { icon: <ShareNetworkIcon />, label: 'Ecossistemas Regionais' },
] as const

const services = [
  {
    number: '1',
    icon: <MapTrifoldIcon />,
    title: 'Diagnostic & Activation Territoriale',
    description:
      'Mapeamos atores, identificamos desconexões e revelamos potenciais para criar estratégias de mobilização que ativam o território.',
    deliverables: ['Relatório diagnóstico', 'Cartografia de atores', 'Plano de ativação', 'Workshops estratégicos'],
    problem: '“Temos recursos e instituições... mas os atores não colaboram.”',
  },
  {
    number: '2',
    icon: <HeartIcon />,
    title: 'Expériences Collectives & Mobilisation',
    description:
      'Criamos experiências territoriais que ativam a participação cidadã, conectam cultura, inovação e comunidade e fortalecem o sentimento de pertencimento.',
    deliverables: ['Eventos', 'Laboratórios territoriais', 'Jornadas de cocriação', 'Experiências regenerativas'],
    problem: '“As pessoas coexistem no território, mas não constroem juntas.”',
  },
  {
    number: '3',
    icon: <TreeStructureIcon />,
    title: 'Architecture d’Écosystèmes Collaboratifs',
    description:
      'Conectamos organizações, estruturamos redes e desenhamos ecossistemas territoriais sustentáveis com governança compartilhada.',
    deliverables: [
      'Modelo de governança',
      'Estratégia de ecossistema',
      'Roadmap colaborativo',
      'Estrutura APL Vibrant',
    ],
    problem: '“Existem muitos atores bons trabalhando isolados.”',
  },
] as const

const Principle = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <div className='border-primary/20 border-b pb-5 last:border-0 last:pb-0'>
    <div className='mb-3 flex items-center gap-2 text-primary'>
      <span className='text-xl'>{icon}</span>
      <h2 className='font-semibold text-xs uppercase tracking-wide'>{title}</h2>
    </div>
    <p className='text-[13px] text-foreground/78 leading-relaxed'>{children}</p>
  </div>
)

const ServiceCard = ({ service }: { service: (typeof services)[number] }) => (
  <article className='relative flex min-h-[510px] flex-col rounded-xl border border-foreground/15 bg-white p-5 shadow-[0_12px_32px_rgba(6,51,27,0.035)]'>
    <span className='absolute top-5 left-5 flex size-8 items-center justify-center rounded-full bg-primary font-bold text-sm text-white shadow-sm'>
      {service.number}
    </span>

    <div className='mx-auto flex size-[74px] items-center justify-center rounded-full bg-[#edf4dd] text-primary [&>svg]:size-10'>
      {service.icon}
    </div>
    <h2 className='mx-auto mt-3 max-w-[260px] text-center font-bold text-lg leading-tight'>{service.title}</h2>
    <p className='mt-4 min-h-[72px] text-[13px] text-foreground/75 leading-relaxed'>{service.description}</p>

    <div className='mt-5 border-foreground/12 border-t pt-4'>
      <h3 className='font-semibold text-primary text-xs uppercase tracking-wide'>Entregas concretas</h3>
      <ul className='mt-2 space-y-1 text-[13px] text-foreground/80'>
        {service.deliverables.map((deliverable) => (
          <li key={deliverable} className='flex gap-2'>
            <span aria-hidden>•</span>
            <span>{deliverable}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className='mt-5 border-foreground/12 border-t pt-4'>
      <h3 className='font-semibold text-primary text-xs uppercase tracking-wide'>Problema que resolve</h3>
      <p className='mt-1 text-[13px] text-foreground/80 leading-snug'>{service.problem}</p>
    </div>

    <Link
      href='/contact'
      className='mt-auto w-fit rounded-md bg-primary px-5 py-2.5 font-semibold text-sm text-white shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md'
    >
      Saiba mais
    </Link>
  </article>
)

export default async function ServicesPage() {
  const t = await getTranslations()

  return (
    <div className='border-foreground border-t-[30px]'>
      <section className='mx-auto w-full max-w-[1210px] px-5 pt-5 pb-4 sm:px-8'>
        <div className='text-center'>
          <h1 className='font-bold text-3xl tracking-tight sm:text-4xl'>{t('Home.services.title')}</h1>
          <p className='mt-2 text-foreground/70'>
            Concebemos e ativamos ecossistemas territoriais vivos que conectam pessoas, organizações e propósito.
          </p>
        </div>

        <div className='mt-7 flex flex-wrap items-center justify-center gap-x-9 gap-y-4'>
          <strong className='mr-1 text-sm'>Para quem:</strong>
          {audiences.map((audience) => (
            <div key={audience.label} className='flex items-center gap-2 text-sm'>
              <span className='text-primary [&>svg]:size-8'>{audience.icon}</span>
              <span className='max-w-32 leading-tight'>{audience.label}</span>
            </div>
          ))}
        </div>

        <div className='mt-7 grid gap-5 lg:grid-cols-[215px_repeat(3,minmax(0,1fr))]'>
          <aside className='rounded-xl border border-primary/45 bg-linear-to-br from-[#f7faef] to-[#eef3e6] p-5'>
            <div className='flex h-full flex-col justify-between gap-5'>
              <Principle icon={<LeafIcon />} title='Nossa missão'>
                Fortalecer territórios através da conexão entre pessoas, instituições e iniciativas que geram valor
                compartilhado e futuro.
              </Principle>
              <Principle icon='☆' title='Nossa abordagem'>
                Unimos estratégia, participação e inovação social para transformar diagnósticos em ação e colaboração em
                resultados duradouros.
              </Principle>
              <Principle icon='♡' title='Nosso compromisso'>
                Trabalhar com escuta profunda, inteligência territorial e foco na regeneração de vínculos e na
                vitalidade coletiva.
              </Principle>
            </div>
          </aside>

          {services.map((service) => (
            <ServiceCard key={service.number} service={service} />
          ))}
        </div>

        <div className='mt-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-primary/35 bg-[#f0f4e7] px-5 py-3 sm:flex-row'>
          <div className='flex items-center gap-4'>
            <span className='flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-white text-primary'>
              <LeafIcon className='size-7' />
            </span>
            <div>
              <p className='font-bold text-sm'>Territórios vibrantes não acontecem por acaso.</p>
              <p className='text-foreground/70 text-xs'>
                Eles são escutados, conectados e ativados com método, sensibilidade e propósito.
              </p>
            </div>
          </div>
          <Link
            href='/contact'
            className='rounded-md bg-foreground px-5 py-3 text-center font-semibold text-white text-xs hover:bg-foreground/90'
          >
            Vamos conversar sobre o seu território
          </Link>
        </div>
      </section>
    </div>
  )
}
