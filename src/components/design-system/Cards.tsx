import type { ReactNode } from 'react'
import { cn } from './utils'

type Tone = 'slate' | 'emerald' | 'amber' | 'blue' | 'violet' | 'red'

const statTones: Record<Tone, string> = {
  slate: 'border-slate-100 bg-white text-slate-950',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-700',
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  violet: 'border-violet-100 bg-violet-50 text-violet-700',
  red: 'border-red-100 bg-red-50 text-red-700'
}

type StatCardProps = {
  label: string
  value: ReactNode
  subtitle?: ReactNode
  tone?: Tone
  className?: string
}

export function StatCard({ label, value, subtitle, tone = 'slate', className }: StatCardProps) {
  return (
    <article className={cn('rounded-2xl border p-5 shadow-sm', statTones[tone], className)}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight tabular-nums">{value}</div>
      {subtitle && <div className="mt-1 text-xs font-medium opacity-60">{subtitle}</div>}
    </article>
  )
}

type InfoCardProps = {
  label?: ReactNode
  title?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function InfoCard({ label, title, children, actions, className }: InfoCardProps) {
  return (
    <article className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-card', className)}>
      {(label || title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {label && <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">{label}</div>}
            {title && <h3 className="mt-1 text-xl font-extrabold text-slate-950">{title}</h3>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </article>
  )
}

type ProgressBarProps = {
  value: number
  label?: ReactNode
  tone?: 'brand' | 'emerald' | 'amber' | 'blue'
  className?: string
}

const progressTones: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  brand: 'bg-brand-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500'
}

export function ProgressBar({ value, label, tone = 'brand', className }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value > 0 && value <= 1 ? value * 100 : value))

  return (
    <div className={className}>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', progressTones[tone])} style={{ width: `${normalized}%` }} />
      </div>
      {label && <div className="mt-1 text-right text-xs font-bold tabular-nums text-slate-500">{label}</div>}
    </div>
  )
}
