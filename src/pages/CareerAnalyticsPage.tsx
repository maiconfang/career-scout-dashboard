import { useEffect, useMemo, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import {
  getCareerFeedbackAnalytics,
  listCareerFeedbackCampaigns,
  listCareerFeedbackCompanies,
  listCareerFeedbackExecutions,
  listCareerFeedbackSources
} from '../lib/api'

type AnalyticsRecord = Record<string, unknown>

type AnalyticsState = {
  overview: AnalyticsRecord
  companies: AnalyticsRecord[]
  sources: AnalyticsRecord[]
  campaigns: AnalyticsRecord[]
  executions: AnalyticsRecord[]
}

const emptyAnalytics: AnalyticsState = {
  overview: {},
  companies: [],
  sources: [],
  campaigns: [],
  executions: []
}

const overviewMetrics = [
  ['Total Opportunities', ['total_opportunities', 'opportunities', 'opportunity_count']],
  ['Total Feedbacks', ['total_feedbacks', 'feedbacks', 'feedback_count']],
  ['Applied', ['applied', 'applied_count', 'applications']],
  ['Interviews', ['interviews', 'interview_count']],
  ['Offers', ['offers', 'offer_count']],
  ['Rejected', ['rejected', 'rejected_count']],
  ['Not Interested', ['not_interested', 'not_interested_count']],
  ['Saved For Later', ['saved_for_later', 'saved_later', 'saved_for_later_count']]
] as const

function isRecord(value: unknown): value is AnalyticsRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function recordsFrom(value: unknown, keys: string[] = ['items', 'data', 'results']) {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (!isRecord(value)) return []
  for (const key of keys) {
    const nested = value[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

function nestedRecord(source: AnalyticsRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (isRecord(value)) return value
  }
  return source
}

function firstValue(source: AnalyticsRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function numberValue(source: AnalyticsRecord, keys: readonly string[]) {
  const value = firstValue(source, keys)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace('%', ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function textValue(source: AnalyticsRecord, keys: readonly string[], fallback = 'Not available') {
  const value = firstValue(source, keys)
  return value === undefined ? fallback : String(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA').format(value)
}

function formatRate(value: number) {
  const normalized = value > 0 && value <= 1 ? value * 100 : value
  return `${normalized.toFixed(1)}%`
}

function rateFromCounts(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0
}

function rateValue(source: AnalyticsRecord, keys: readonly string[]) {
  return numberValue(source, keys)
}

function ProgressBar({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(100, value > 0 && value <= 1 ? value * 100 : value))
  return (
    <div className="min-w-[120px]">
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${normalized}%` }} />
      </div>
      <div className="mt-1 text-right text-xs font-bold tabular-nums text-slate-500">{normalized.toFixed(1)}%</div>
    </div>
  )
}

function AnalyticsTable({
  title,
  description,
  columns,
  rows
}: {
  title: string
  description: string
  columns: Array<{ label: string, render: (row: AnalyticsRecord) => JSX.Element | string | number }>
  rows: AnalyticsRecord[]
}) {
  return (
    <SectionCard className="overflow-hidden" padded={false}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <StatusBadge>{rows.length}</StatusBadge>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} found`} message="No analytics rows were returned by the current API response." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map(column => (
                  <th className="px-4 py-3" key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr className="transition hover:bg-slate-50/70" key={`${title}:${index}:${JSON.stringify(row).slice(0, 80)}`}>
                  {columns.map(column => (
                    <td className="px-4 py-3 text-slate-700" key={column.label}>{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

export default function CareerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsState>(emptyAnalytics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    Promise.all([
      getCareerFeedbackAnalytics(),
      listCareerFeedbackCompanies(),
      listCareerFeedbackSources(),
      listCareerFeedbackCampaigns(),
      listCareerFeedbackExecutions()
    ]).then(([overviewResponse, companiesResponse, sourcesResponse, campaignsResponse, executionsResponse]) => {
      if (!active) return
      const overview = isRecord(overviewResponse) ? nestedRecord(overviewResponse, ['summary', 'overview', 'totals']) : {}
      setData({
        overview,
        companies: recordsFrom(companiesResponse, ['items', 'companies', 'data', 'results']),
        sources: recordsFrom(sourcesResponse, ['items', 'sources', 'data', 'results']),
        campaigns: recordsFrom(campaignsResponse, ['items', 'campaigns', 'data', 'results']),
        executions: recordsFrom(executionsResponse, ['items', 'executions', 'data', 'results'])
      })
    }).catch((requestError: Error) => {
      if (active) setError(requestError.message)
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [reloadKey])

  const totals = useMemo(() => {
    const totalOpportunities = numberValue(data.overview, ['total_opportunities', 'opportunities', 'opportunity_count'])
    const applied = numberValue(data.overview, ['applied', 'applied_count', 'applications'])
    const interviews = numberValue(data.overview, ['interviews', 'interview_count'])
    const offers = numberValue(data.overview, ['offers', 'offer_count'])
    return { totalOpportunities, applied, interviews, offers }
  }, [data.overview])

  const successRates = useMemo(() => ({
    applicationRate: rateValue(data.overview, ['application_rate', 'apply_rate', 'applied_rate']) || rateFromCounts(totals.applied, totals.totalOpportunities),
    interviewRate: rateValue(data.overview, ['interview_rate']) || rateFromCounts(totals.interviews, totals.applied),
    offerRate: rateValue(data.overview, ['offer_rate']) || rateFromCounts(totals.offers, totals.applied)
  }), [data.overview, totals])

  if (loading) {
    return <LoadingState title="Loading Career Analytics" message="Fetching feedback analytics from existing Career Scout APIs." />
  }

  if (error) {
    return (
      <ErrorState
        title="Career Analytics is unavailable"
        message={error}
        action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => setReloadKey(value => value + 1)} type="button">Try again</button>}
      />
    )
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow="Analytics"
        title="Career Analytics"
        description="Feedback analytics for opportunities, companies, sources, campaigns, and executions using persisted platform data."
        actions={<StatusBadge tone="blue">Feedback analytics</StatusBadge>}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {overviewMetrics.map(([label, keys]) => (
          <StatCard key={label} label={label} value={formatNumber(numberValue(data.overview, keys))} tone={label === 'Offers' ? 'emerald' : label === 'Rejected' || label === 'Not Interested' ? 'red' : label === 'Interviews' ? 'blue' : 'slate'} />
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Application Rate" value={formatRate(successRates.applicationRate)} subtitle={<ProgressBar value={successRates.applicationRate} />} tone="blue" />
        <StatCard label="Interview Rate" value={formatRate(successRates.interviewRate)} subtitle={<ProgressBar value={successRates.interviewRate} />} tone="violet" />
        <StatCard label="Offer Rate" value={formatRate(successRates.offerRate)} subtitle={<ProgressBar value={successRates.offerRate} />} tone="emerald" />
      </section>

      <AnalyticsTable
        title="Companies"
        description="Company-level opportunity and feedback outcomes."
        rows={data.companies}
        columns={[
          { label: 'Company', render: row => <span className="font-bold text-slate-900">{textValue(row, ['company', 'company_name', 'name'])}</span> },
          { label: 'Opportunities', render: row => formatNumber(numberValue(row, ['opportunities', 'opportunity_count', 'total_opportunities'])) },
          { label: 'Applied', render: row => formatNumber(numberValue(row, ['applied', 'applied_count', 'applications'])) },
          { label: 'Interviews', render: row => formatNumber(numberValue(row, ['interviews', 'interview_count'])) },
          { label: 'Offers', render: row => formatNumber(numberValue(row, ['offers', 'offer_count'])) },
          { label: 'Offer Rate', render: row => <ProgressBar value={rateValue(row, ['offer_rate']) || rateFromCounts(numberValue(row, ['offers', 'offer_count']), numberValue(row, ['applied', 'applied_count', 'applications']))} /> }
        ]}
      />

      <AnalyticsTable
        title="Sources"
        description="Source-level opportunity and feedback volume."
        rows={data.sources}
        columns={[
          { label: 'Source', render: row => <span className="font-bold text-slate-900">{textValue(row, ['source', 'source_name', 'name'])}</span> },
          { label: 'Opportunities', render: row => formatNumber(numberValue(row, ['opportunities', 'opportunity_count', 'total_opportunities'])) },
          { label: 'Feedbacks', render: row => formatNumber(numberValue(row, ['feedbacks', 'feedback_count', 'total_feedbacks'])) }
        ]}
      />

      <AnalyticsTable
        title="Campaigns"
        description="Campaign-level conversion and outcome signals."
        rows={data.campaigns}
        columns={[
          { label: 'Campaign', render: row => <span className="font-bold text-slate-900">{textValue(row, ['campaign', 'campaign_name', 'campaign_id', 'name'])}</span> },
          { label: 'Opportunities', render: row => formatNumber(numberValue(row, ['opportunities', 'opportunity_count', 'total_opportunities'])) },
          { label: 'Feedbacks', render: row => formatNumber(numberValue(row, ['feedbacks', 'feedback_count', 'total_feedbacks'])) },
          { label: 'Application Rate', render: row => <ProgressBar value={rateValue(row, ['application_rate', 'apply_rate']) || rateFromCounts(numberValue(row, ['applied', 'applied_count', 'applications']), numberValue(row, ['opportunities', 'opportunity_count', 'total_opportunities']))} /> },
          { label: 'Offer Rate', render: row => <ProgressBar value={rateValue(row, ['offer_rate']) || rateFromCounts(numberValue(row, ['offers', 'offer_count']), numberValue(row, ['applied', 'applied_count', 'applications']))} /> }
        ]}
      />

      <AnalyticsTable
        title="Executions"
        description="Execution-level opportunity and feedback volume."
        rows={data.executions}
        columns={[
          { label: 'Execution', render: row => <span className="font-mono text-xs font-bold text-slate-900">{textValue(row, ['execution', 'execution_id', 'id'])}</span> },
          { label: 'Campaign', render: row => textValue(row, ['campaign', 'campaign_name', 'campaign_id']) },
          { label: 'Opportunities', render: row => formatNumber(numberValue(row, ['opportunities', 'opportunity_count', 'total_opportunities'])) },
          { label: 'Feedbacks', render: row => formatNumber(numberValue(row, ['feedbacks', 'feedback_count', 'total_feedbacks'])) }
        ]}
      />
    </PageContainer>
  )
}
