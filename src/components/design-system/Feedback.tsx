import type { ReactNode } from 'react'
import { cn } from './utils'

type AlertProps = {
  children: ReactNode
  className?: string
}

function Alert({ children, className }: AlertProps) {
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm font-semibold', className)}>
      {children}
    </div>
  )
}

export function SuccessAlert({ children, className }: AlertProps) {
  return <Alert className={cn('border-emerald-200 bg-emerald-50 text-emerald-700', className)}>{children}</Alert>
}

export function ErrorAlert({ children, className }: AlertProps) {
  return <Alert className={cn('border-red-200 bg-red-50 text-red-700', className)}>{children}</Alert>
}

export function InfoAlert({ children, className }: AlertProps) {
  return <Alert className={cn('border-brand-100 bg-brand-50 text-brand-700', className)}>{children}</Alert>
}
