import React from 'react'

export default function KpiCard({
  title,
  value,
  subtitle,
  className,
}: {
  title: string
  value: React.ReactNode
  subtitle?: string
  className?: string
}) {
  return (
    <div className={"p-2 rounded-md " + (className ?? '')}>
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-lg font-semibold text-slate-700">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  )
}
