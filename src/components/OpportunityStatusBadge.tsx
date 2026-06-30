type Props = {
  status: string
  decision?: string | null
}

function statusLabel(status: string, decision?: string | null) {
  if (decision === 'APPLY' || status === 'APPLY_RECOMMENDED') return 'Apply'
  if (decision === 'DO_NOT_APPLY') return 'Do not apply'
  if (decision === 'CONSIDER' || status === 'SELECTED') return 'Consider'
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, (value: string) => value.toUpperCase())
}

export default function OpportunityStatusBadge({ status, decision }: Props) {
  const label = statusLabel(status, decision)
  const tone = label === 'Apply'
    ? 'bg-accent-50 text-emerald-700 border-emerald-200'
    : label === 'Do not apply'
      ? 'bg-red-50 text-red-700 border-red-200'
      : label === 'Consider'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
}
