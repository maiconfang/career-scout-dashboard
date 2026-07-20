import { useLanguage } from '../i18n/LanguageProvider'

type Props = {
  status: string
  decision?: string | null
}

function normalizedStatus(status: string, decision?: string | null) {
  if (decision === 'APPLY' || status === 'APPLY_RECOMMENDED') return 'APPLY'
  if (decision === 'DO_NOT_APPLY') return 'DO_NOT_APPLY'
  if (decision === 'CONSIDER' || status === 'SELECTED') return 'CONSIDER'
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, (value: string) => value.toUpperCase())
}

export default function OpportunityStatusBadge({ status, decision }: Props) {
  const { t } = useLanguage()
  const normalized = normalizedStatus(status, decision)
  const label = normalized === 'APPLY'
    ? t('opportunityStatus.apply')
    : normalized === 'DO_NOT_APPLY'
      ? t('opportunityStatus.doNotApply')
      : normalized === 'CONSIDER'
        ? t('opportunityStatus.consider')
        : normalized
  const tone = normalized === 'APPLY'
    ? 'bg-accent-50 text-emerald-700 border-emerald-200'
    : normalized === 'DO_NOT_APPLY'
      ? 'bg-red-50 text-red-700 border-red-200'
      : normalized === 'CONSIDER'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
}
