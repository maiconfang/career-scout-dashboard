import type { ReactNode } from 'react'
import { cn } from './utils'

type FormSectionProps = {
  children: ReactNode
  className?: string
  columns?: 1 | 2
}

export function FormSection({ children, className, columns = 2 }: FormSectionProps) {
  return (
    <div className={cn('grid gap-3', columns === 2 && 'md:grid-cols-2', className)}>
      {children}
    </div>
  )
}

type ToolbarProps = {
  children: ReactNode
  className?: string
}

export function SearchToolbar({ children, className }: ToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-card md:flex-row md:items-end', className)}>
      {children}
    </div>
  )
}

export function FilterBar({ children, className }: ToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm', className)}>
      {children}
    </div>
  )
}
