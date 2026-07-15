import type { ReactNode } from 'react'
import { cn } from './utils'

type PageContainerProps = {
  children: ReactNode
  className?: string
  size?: 'md' | 'lg' | 'xl'
}

const pageSizes = {
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl'
}

export function PageContainer({ children, className, size = 'xl' }: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6', pageSizes[size], className)}>
      {children}
    </div>
  )
}

type PageActionsProps = {
  children: ReactNode
  className?: string
}

export function PageActions({ children, className }: PageActionsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  )
}

type PageHeaderProps = {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <SectionCard className={className}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {eyebrow && <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</div>}
          <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <PageActions>{actions}</PageActions>}
      </div>
    </SectionCard>
  )
}

type SectionCardProps = {
  children: ReactNode
  className?: string
  padded?: boolean
  title?: ReactNode
  description?: ReactNode
}

export function SectionCard({ children, className, padded = true, title, description }: SectionCardProps) {
  return (
    <section className={cn('rounded-xl border border-slate-100 bg-white shadow-card', padded && 'p-5', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-extrabold text-agent-primary">{title}</h3>}
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
