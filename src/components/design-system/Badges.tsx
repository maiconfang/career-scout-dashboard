import type { ReactNode } from 'react'
import { cn } from './utils'

type BadgeTone = 'slate' | 'brand' | 'emerald' | 'amber' | 'red' | 'blue'

const badgeTones: Record<BadgeTone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  brand: 'border-brand-100 bg-brand-50 text-brand-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700'
}

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

export function StatusBadge({ children, tone = 'slate', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-bold', badgeTones[tone], className)}>
      {children}
    </span>
  )
}

export function RoleBadge({ children, tone = 'brand', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase', badgeTones[tone], className)}>
      {children}
    </span>
  )
}
