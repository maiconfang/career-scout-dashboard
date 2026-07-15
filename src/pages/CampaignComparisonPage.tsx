import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  FilterBar,
  InfoCard,
  LoadingState,
  PageContainer,
  PageHeader,
  SearchToolbar,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import {
  AgentExecutionDetail,
  AgentExecutionSummary,
  CampaignExecutionResults,
  CampaignResultOpportunity,
  getAgentExecution,
  getAgentExecutionResults,
  listAgentExecutions
} from '../lib/api'

type ComparisonBundle = {
  execution: AgentExecutionSummary
  results: CampaignExecutionResults
  detail: AgentExecutionDetail
}

type ComparisonMetric = {
  label: string
  a: number | null
  b: number | null
  formatter?: (value: number | null) => string
  higherIsBetter?: boolean
}

type SearchPolicySummary = {
  keywords: string[]
  countries: string[]
  provinces: string[]
  employmentTypes: string[]
  remotePreference: string
}

const RESULT_LIMIT = 100

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return 'Not available'
  if (seconds < 60) return `${seconds.toFixed(1)} sec`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  if (minutes < 60) return `${minutes} min ${remaining} sec`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not available'
  return value.toFixed(1)
}

function readable(value: string | null | undefined) {
  if (!value) return 'Not available'
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function statusTone(status: string): 'emerald' | 'red' | 'blue' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED') return 'red'
  return 'blue'
}

function decisionTone(decision: string | null | undefined): 'emerald' | 'amber' | 'red' | 'slate' {
  if (decision === 'APPLY') return 'emerald'
  if (decision === 'CONSIDER' || decision === 'DEFER') return 'amber'
  if (decision === 'DO_NOT_APPLY') return 'red'
  return 'slate'
}

function metricTrend(metric: ComparisonMetric) {
  if (metric.a === null || metric.b === null) return 'same'
  const delta = metric.b - metric.a
  if (Math.abs(delta) < 0.0001) return 'same'
  const improved = metric.higherIsBetter === false ? delta < 0 : delta > 0
  return improved ? 'up' : 'down'
}

function trendLabel(trend: string) {
  if (trend === 'up') return '↑ improved'
  if (trend === 'down') return '↓ declined'
  return '= unchanged'
}

function trendTone(trend: string): 'emerald' | 'red' | 'slate' {
  if (trend === 'up') return 'emerald'
  if (trend === 'down') return 'red'
  return 'slate'
}

function numeric(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function executionOptionLabel(execution: AgentExecutionSummary) {
  return `${execution.campaign} · ${formatDateTime(execution.started_at)} · ${readable(execution.status)}`
}

function opportunityKey(opportunity: CampaignResultOpportunity) {
  return opportunity.url || `${opportunity.company}:${opportunity.title}:${opportunity.location}`.toLowerCase()
}

function compareOpportunities(a: CampaignResultOpportunity[], b: CampaignResultOpportunity[]) {
  const aMap = new Map(a.map(item => [opportunityKey(item), item]))
  const bMap = new Map(b.map(item => [opportunityKey(item), item]))
  const added = b.filter(item => !aMap.has(opportunityKey(item)))
  const removed = a.filter(item => !bMap.has(opportunityKey(item)))
  const shared = b.filter(item => aMap.has(opportunityKey(item)))
  return { added, removed, shared }
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

function findFirst(source: unknown, keys: string[], depth = 0): unknown {
  if (!source || typeof source !== 'object' || depth > 8) return undefined
  const record = source as Record<string, unknown>
  for (const key of keys) {
    if (record[key] !== undefined) return record[key]
  }
  for (const value of Object.values(record)) {
    const found = findFirst(value, keys, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

function searchPolicySummary(detail: AgentExecutionDetail): SearchPolicySummary {
  const source = detail.final_report ?? {}
  return {
    keywords: arrayValue(findFirst(source, ['search_keywords', 'keywords', 'keyword'])),
    countries: arrayValue(findFirst(source, ['countries', 'country'])),
    provinces: arrayValue(findFirst(source, ['provinces', 'province', 'regions'])),
    employmentTypes: arrayValue(findFirst(source, ['employment_types', 'employment_type'])),
    remotePreference: String(findFirst(source, ['remote_preference', 'remote', 'work_mode']) ?? 'Not available')
  }
}

function metricsFor(a: ComparisonBundle, b: ComparisonBundle): ComparisonMetric[] {
  return [
    { label: 'Jobs Found', a: a.results.discovery.unique_jobs_found, b: b.results.discovery.unique_jobs_found },
    { label: 'Jobs Matched', a: a.results.match.jobs_processed, b: b.results.match.jobs_processed },
    { label: 'Jobs Ranked', a: a.results.ranking.jobs_ranked, b: b.results.ranking.jobs_ranked },
    { label: 'APPLY', a: a.results.decision.apply_count, b: b.results.decision.apply_count },
    { label: 'DEFER', a: a.results.decision.defer_count, b: b.results.decision.defer_count },
    { label: 'DO NOT APPLY', a: a.results.decision.do_not_apply_count, b: b.results.decision.do_not_apply_count, higherIsBetter: false },
    { label: 'Average Match', a: numeric(a.results.match.average_match_score), b: numeric(b.results.match.average_match_score), formatter: formatScore },
    { label: 'Highest Match', a: numeric(a.results.match.highest_match_score), b: numeric(b.results.match.highest_match_score), formatter: formatScore },
    { label: 'Lowest Match', a: numeric(a.results.match.lowest_match_score), b: numeric(b.results.match.lowest_match_score), formatter: formatScore },
    { label: 'Duration', a: a.results.summary.duration, b: b.results.summary.duration, formatter: formatDuration, higherIsBetter: false }
  ]
}

async function loadBundle(execution: AgentExecutionSummary): Promise<ComparisonBundle> {
  const [results, detail] = await Promise.all([
    getAgentExecutionResults(execution.execution_id, {
      sort_by: 'ranking_score',
      order: 'desc',
      limit: RESULT_LIMIT,
      offset: 0
    }),
    getAgentExecution(execution.execution_id)
  ])
  return { execution, results, detail }
}

function SelectPanel({
  label,
  value,
  executions,
  onChange
}: {
  label: string
  value: string
  executions: AgentExecutionSummary[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => onChange(event.target.value)} value={value}>
        <option value="">Select execution</option>
        {executions.map(execution => (
          <option key={execution.execution_id} value={execution.execution_id}>{executionOptionLabel(execution)}</option>
        ))}
      </select>
    </label>
  )
}

function SideBySideSection({
  title,
  children
}: {
  title: string
  children: (side: 'A' | 'B') => JSX.Element
}) {
  return (
    <SectionCard>
      <h3 className="mb-4 text-lg font-extrabold text-agent-primary">{title}</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Execution A</div>
          {children('A')}
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Execution B</div>
          {children('B')}
        </div>
      </div>
    </SectionCard>
  )
}

function MetricGrid({ a, b }: { a: ComparisonBundle, b: ComparisonBundle }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {metricsFor(a, b).map(metric => {
        const trend = metricTrend(metric)
        const formatter = metric.formatter ?? (value => value === null ? 'Not available' : String(value))
        return (
          <InfoCard key={metric.label} title={metric.label} actions={<StatusBadge tone={trendTone(trend)}>{trendLabel(trend)}</StatusBadge>}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs font-bold uppercase text-slate-500">A</div>
                <div className="mt-1 text-xl font-black text-slate-950">{formatter(metric.a)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs font-bold uppercase text-slate-500">B</div>
                <div className="mt-1 text-xl font-black text-slate-950">{formatter(metric.b)}</div>
              </div>
            </div>
          </InfoCard>
        )
      })}
    </section>
  )
}

function PipelineSections({ a, b }: { a: ComparisonBundle, b: ComparisonBundle }) {
  const card = (items: Array<[string, string | number]>) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <StatCard key={label} label={label} value={value} className="rounded-xl px-4 py-3" />
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      <SideBySideSection title="Summary">
        {side => {
          const bundle = side === 'A' ? a : b
          return card([
            ['Status', readable(bundle.results.summary.execution_status)],
            ['Duration', formatDuration(bundle.results.summary.duration)],
            ['Started', formatDateTime(bundle.results.summary.started_at)],
            ['Finished', formatDateTime(bundle.results.summary.finished_at)]
          ])
        }}
      </SideBySideSection>
      <SideBySideSection title="Discovery">
        {side => {
          const discovery = (side === 'A' ? a : b).results.discovery
          return card([
            ['Raw Jobs', discovery.raw_jobs_found],
            ['Unique Jobs', discovery.unique_jobs_found],
            ['Discarded Jobs', discovery.discarded_jobs],
            ['Duration', formatDuration(discovery.discovery_duration === null ? null : discovery.discovery_duration / 1000)]
          ])
        }}
      </SideBySideSection>
      <SideBySideSection title="Match">
        {side => {
          const match = (side === 'A' ? a : b).results.match
          return card([
            ['Jobs Processed', match.jobs_processed],
            ['Average Match', formatScore(match.average_match_score)],
            ['Highest Match', formatScore(match.highest_match_score)],
            ['Lowest Match', formatScore(match.lowest_match_score)]
          ])
        }}
      </SideBySideSection>
      <SideBySideSection title="Ranking">
        {side => {
          const ranking = (side === 'A' ? a : b).results.ranking
          return card([
            ['Jobs Ranked', ranking.jobs_ranked],
            ['Top Score', formatScore(ranking.top_score)],
            ['Average Score', formatScore(ranking.average_score)],
            ['Lowest Score', formatScore(ranking.lowest_score)]
          ])
        }}
      </SideBySideSection>
      <SideBySideSection title="Decision">
        {side => {
          const decision = (side === 'A' ? a : b).results.decision
          return card([
            ['APPLY', decision.apply_count],
            ['DEFER', decision.defer_count],
            ['DO NOT APPLY', decision.do_not_apply_count]
          ])
        }}
      </SideBySideSection>
      <SideBySideSection title="Recommendation">
        {side => {
          const recommendation = (side === 'A' ? a : b).results.recommendation
          return card([
            ['Generated', recommendation.recommendations_generated],
            ['APPLY', recommendation.apply_recommendations],
            ['DEFER', recommendation.defer_recommendations],
            ['Rejected', recommendation.rejected_recommendations]
          ])
        }}
      </SideBySideSection>
    </div>
  )
}

function OpportunityList({ title, opportunities, tone }: { title: string, opportunities: CampaignResultOpportunity[], tone: 'emerald' | 'red' | 'blue' }) {
  return (
    <SectionCard className="overflow-hidden" padded={false}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-lg font-extrabold text-agent-primary">{title}</h3>
        <StatusBadge tone={tone}>{opportunities.length}</StatusBadge>
      </div>
      {opportunities.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()}`} message="No opportunities in this comparison bucket." />
      ) : (
        <div className="divide-y divide-slate-100">
          {opportunities.slice(0, 10).map(opportunity => (
            <article className="p-5" key={opportunityKey(opportunity)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link className="font-bold text-slate-950 hover:text-brand-600" to={`/opportunities/${opportunity.opportunity_id}`}>{opportunity.title}</Link>
                  <div className="mt-1 text-sm text-slate-600">{[opportunity.company, opportunity.location].filter(Boolean).join(' · ') || 'Company and location not provided'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge tone={decisionTone(opportunity.decision)}>{readable(opportunity.decision)}</StatusBadge>
                    <StatusBadge>{opportunity.source || 'Source not provided'}</StatusBadge>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                    <div className="text-lg font-black text-slate-900">{formatScore(opportunity.ranking_score ?? opportunity.match_score)}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Score</div>
                  </div>
                  <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" to={`/opportunities/${opportunity.opportunity_id}`}>View details</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function TopOpportunities({ a, b }: { a: ComparisonBundle, b: ComparisonBundle }) {
  const comparison = compareOpportunities(a.results.opportunities.items, b.results.opportunities.items)
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <OpportunityList title="New Opportunities" opportunities={comparison.added} tone="emerald" />
      <OpportunityList title="Removed Opportunities" opportunities={comparison.removed} tone="red" />
      <OpportunityList title="Present In Both" opportunities={comparison.shared} tone="blue" />
    </div>
  )
}

function SearchPolicyComparison({ a, b }: { a: ComparisonBundle, b: ComparisonBundle }) {
  const policies = {
    A: searchPolicySummary(a.detail),
    B: searchPolicySummary(b.detail)
  }
  const rows: Array<[string, keyof SearchPolicySummary]> = [
    ['Keywords', 'keywords'],
    ['Countries', 'countries'],
    ['Provinces', 'provinces'],
    ['Employment Types', 'employmentTypes'],
    ['Remote Preference', 'remotePreference']
  ]

  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">Search Policy</h3>
        <p className="text-sm text-slate-500">Planner/search policy fields found in existing execution data.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Execution A</th>
              <th className="px-4 py-3">Execution B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, key]) => (
              <tr key={key}>
                <td className="px-4 py-3 font-bold text-slate-700">{label}</td>
                <td className="px-4 py-3 text-slate-600">{Array.isArray(policies.A[key]) ? (policies.A[key] as string[]).join(', ') || 'Not available' : policies.A[key]}</td>
                <td className="px-4 py-3 text-slate-600">{Array.isArray(policies.B[key]) ? (policies.B[key] as string[]).join(', ') || 'Not available' : policies.B[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

export default function CampaignComparisonPage() {
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([])
  const [executionAId, setExecutionAId] = useState('')
  const [executionBId, setExecutionBId] = useState('')
  const [bundleA, setBundleA] = useState<ComparisonBundle | null>(null)
  const [bundleB, setBundleB] = useState<ComparisonBundle | null>(null)
  const [loadingExecutions, setLoadingExecutions] = useState(true)
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadingExecutions(true)
    setError(null)
    listAgentExecutions({ sort_by: 'started_at', order: 'desc', limit: 100, offset: 0 })
      .then(response => {
        if (!active) return
        setExecutions(response.items)
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoadingExecutions(false)
      })
    return () => { active = false }
  }, [])

  const executionA = executions.find(execution => execution.execution_id === executionAId)
  const executionB = executions.find(execution => execution.execution_id === executionBId)
  const executionBOptions = useMemo(() => {
    if (!executionA) return executions
    return executions.filter(execution => execution.execution_id !== executionA.execution_id && execution.campaign === executionA.campaign)
  }, [executionA, executions])
  const sameCampaign = Boolean(executionA && executionB && executionA.campaign === executionB.campaign)

  function onExecutionAChange(value: string) {
    setExecutionAId(value)
    const selected = executions.find(execution => execution.execution_id === value)
    if (!selected) {
      setExecutionBId('')
      return
    }
    const currentB = executions.find(execution => execution.execution_id === executionBId)
    if (currentB && currentB.campaign !== selected.campaign) setExecutionBId('')
  }

  async function compare(event: FormEvent) {
    event.preventDefault()
    if (!executionA || !executionB) return
    setLoadingComparison(true)
    setError(null)
    try {
      const [nextA, nextB] = await Promise.all([
        loadBundle(executionA),
        loadBundle(executionB)
      ])
      setBundleA(nextA)
      setBundleB(nextB)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load campaign comparison.')
    } finally {
      setLoadingComparison(false)
    }
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow="Agent"
        title="Campaign Comparison"
        description="Compare two executions of the same campaign using existing execution results."
        actions={sameCampaign ? <StatusBadge tone="emerald">Same campaign</StatusBadge> : <StatusBadge tone="amber">Select matching executions</StatusBadge>}
      />

      <SearchToolbar className="bg-slate-50/70">
        <form className="grid w-full gap-3 lg:grid-cols-[1fr_1fr_auto]" onSubmit={compare}>
          <SelectPanel label="Execution A" value={executionAId} executions={executions} onChange={onExecutionAChange} />
          <SelectPanel label="Execution B" value={executionBId} executions={executionBOptions} onChange={setExecutionBId} />
          <div className="flex items-end">
            <button className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={!executionA || !executionB || loadingComparison} type="submit">
              Compare
            </button>
          </div>
        </form>
      </SearchToolbar>

      {loadingExecutions && <LoadingState title="Loading executions" message="Fetching recent agent executions for comparison." />}
      {!loadingExecutions && error && <ErrorState title="Campaign Comparison is unavailable" message={error} />}
      {!loadingExecutions && executions.length === 0 && <EmptyState title="No executions found" message="No persisted executions are available for comparison." />}
      {!loadingExecutions && executions.length > 0 && !executionA && <EmptyState title="Select Execution A" message="Choose the baseline execution to begin comparing campaign evolution." />}
      {!loadingExecutions && executionA && executionBOptions.length === 0 && <EmptyState title="No matching Execution B" message="No other execution with the same campaign name was found in the recent execution list." />}
      {loadingComparison && <LoadingState title="Loading comparison" message="Fetching both execution result sets and execution detail artifacts." />}

      {!loadingComparison && bundleA && bundleB && (
        <>
          <FilterBar className="justify-between">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(bundleA.execution.status)}>A: {readable(bundleA.execution.status)}</StatusBadge>
              <StatusBadge tone={statusTone(bundleB.execution.status)}>B: {readable(bundleB.execution.status)}</StatusBadge>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {bundleA.execution.campaign} · {formatDateTime(bundleA.execution.started_at)} vs {formatDateTime(bundleB.execution.started_at)}
            </div>
          </FilterBar>
          <MetricGrid a={bundleA} b={bundleB} />
          <PipelineSections a={bundleA} b={bundleB} />
          <TopOpportunities a={bundleA} b={bundleB} />
          <SearchPolicyComparison a={bundleA} b={bundleB} />
        </>
      )}
    </PageContainer>
  )
}
