import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  FilterBar,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { currentUser } from '../lib/authApi'
import {
  AgentExecutionSummary,
  Campaign,
  listAgentExecutions,
  listCampaigns,
  platformHealth
} from '../lib/api'

type HealthStatus = 'OK' | 'ATTENTION' | 'NOT_AVAILABLE'

type OverviewItem = {
  label: string
  status: HealthStatus
  updatedAt: string | null
  info: string
}

type PipelineStage = {
  name: string
  enabled: HealthStatus
  operational: HealthStatus
  lastExecution: string | null
}

const NOT_AVAILABLE = 'Not Available'
const runningStatuses = new Set(['QUEUED', 'RUNNING', 'PREPARING', 'VALIDATING', 'PLANNER', 'DISCOVERY', 'MATCH_ENGINE', 'RANKING', 'DECISION', 'RECOMMENDATION', 'STARTED'])

function formatDateTime(value: string | null | undefined) {
  if (!value) return NOT_AVAILABLE
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return NOT_AVAILABLE
  if (seconds < 60) return `${seconds.toFixed(1)} sec`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  if (minutes < 60) return `${minutes} min ${remaining} sec`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

function readable(value: string | null | undefined) {
  if (!value) return NOT_AVAILABLE
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function healthTone(status: HealthStatus): 'emerald' | 'amber' | 'slate' {
  if (status === 'OK') return 'emerald'
  if (status === 'ATTENTION') return 'amber'
  return 'slate'
}

function executionTone(status: string): 'emerald' | 'red' | 'blue' | 'slate' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED') return 'red'
  if (status === 'CANCELLED') return 'slate'
  return 'blue'
}

function latestExecution(executions: AgentExecutionSummary[], predicate: (execution: AgentExecutionSummary) => boolean) {
  return executions.find(predicate)?.started_at ?? null
}

function hasDecisionSignal(execution: AgentExecutionSummary) {
  return execution.apply_count > 0 || execution.consider_count > 0 || execution.do_not_apply_count > 0
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

function PlatformOverview({ items }: { items: OverviewItem[] }) {
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">Platform Overview</h3>
        <p className="text-sm text-slate-500">Operational signals available from existing APIs.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(item => (
          <article className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={item.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-950">{item.label}</h4>
                <p className="mt-1 text-sm text-slate-600">{item.info}</p>
              </div>
              <StatusBadge tone={healthTone(item.status)}>{item.status === 'NOT_AVAILABLE' ? NOT_AVAILABLE : item.status}</StatusBadge>
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Last updated: {formatDateTime(item.updatedAt)}
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}

function AgentPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">Agent Pipeline</h3>
        <p className="text-sm text-slate-500">Stage availability inferred only when recent execution summaries expose a signal.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-6">
        {stages.map((stage, index) => (
          <div className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm" key={stage.name}>
            {index < stages.length - 1 && <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 bg-slate-200 lg:block" />}
            <h4 className="font-extrabold text-slate-950">{stage.name}</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={healthTone(stage.enabled)}>Enabled: {stage.enabled === 'NOT_AVAILABLE' ? NOT_AVAILABLE : stage.enabled}</StatusBadge>
              <StatusBadge tone={healthTone(stage.operational)}>Operational: {stage.operational === 'NOT_AVAILABLE' ? NOT_AVAILABLE : stage.operational}</StatusBadge>
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Last execution
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{formatDateTime(stage.lastExecution)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function RecentExecutions({ executions }: { executions: AgentExecutionSummary[] }) {
  return (
    <SectionCard className="overflow-hidden" padded={false}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">Recent Executions</h3>
          <p className="text-sm text-slate-500">Latest persisted executions available to the current admin user.</p>
        </div>
        <StatusBadge>{executions.length}</StatusBadge>
      </div>
      {executions.length === 0 ? (
        <EmptyState title="No recent executions" message="No persisted executions are available from the current API response." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Finished</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">Jobs</th>
                <th className="px-4 py-3 text-right">APPLY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {executions.slice(0, 10).map(execution => (
                <tr className="transition hover:bg-slate-50/70" key={execution.execution_id}>
                  <td className="px-4 py-3"><StatusBadge tone={executionTone(execution.status)}>{readable(execution.status)}</StatusBadge></td>
                  <td className="max-w-[280px] px-4 py-3 font-semibold text-slate-900"><Link className="hover:text-brand-600" to={`/agent/executions/${execution.execution_id}`}>{execution.campaign}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(execution.started_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(execution.finished_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(execution.duration_seconds)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{execution.jobs_collected}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{execution.apply_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

export default function PlatformHealthPage() {
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [authOk, setAuthOk] = useState<boolean | null>(null)
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      platformHealth(),
      currentUser(),
      listAgentExecutions({ sort_by: 'started_at', order: 'desc', limit: 100, offset: 0 }),
      listCampaigns(100, 0)
    ]).then(results => {
      if (!active) return
      const [healthResult, authResult, executionsResult, campaignsResult] = results
      setHealthOk(healthResult.status === 'fulfilled' && healthResult.value.status === 'ok')
      setAuthOk(authResult.status === 'fulfilled')
      setExecutions(executionsResult.status === 'fulfilled' ? executionsResult.value.items : [])
      setCampaigns(campaignsResult.status === 'fulfilled' ? campaignsResult.value.items : [])
      const failed = results.find(result => result.status === 'rejected')
      setError(failed ? 'Some platform health signals are unavailable. Missing values are shown as Not Available.' : null)
      setLastUpdated(new Date().toISOString())
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [reloadKey])

  const overview = useMemo<OverviewItem[]>(() => [
    {
      label: 'Database',
      status: healthOk ? 'OK' : 'NOT_AVAILABLE',
      updatedAt: lastUpdated,
      info: healthOk ? 'Health endpoint responded successfully.' : NOT_AVAILABLE
    },
    {
      label: 'Queue',
      status: 'NOT_AVAILABLE',
      updatedAt: null,
      info: NOT_AVAILABLE
    },
    {
      label: 'Worker',
      status: 'NOT_AVAILABLE',
      updatedAt: null,
      info: NOT_AVAILABLE
    },
    {
      label: 'API',
      status: healthOk ? 'OK' : 'ATTENTION',
      updatedAt: lastUpdated,
      info: healthOk === null ? NOT_AVAILABLE : healthOk ? 'Career Scout API is reachable.' : 'Health endpoint did not return ok.'
    },
    {
      label: 'Schema',
      status: 'NOT_AVAILABLE',
      updatedAt: null,
      info: NOT_AVAILABLE
    },
    {
      label: 'Authentication',
      status: authOk ? 'OK' : 'NOT_AVAILABLE',
      updatedAt: lastUpdated,
      info: authOk ? 'Current session validated with /api/auth/me.' : NOT_AVAILABLE
    }
  ], [authOk, healthOk, lastUpdated])

  const pipeline = useMemo<PipelineStage[]>(() => [
    {
      name: 'Planner',
      enabled: 'NOT_AVAILABLE',
      operational: executions.some(execution => execution.status === 'COMPLETED') ? 'OK' : 'NOT_AVAILABLE',
      lastExecution: latestExecution(executions, execution => execution.status === 'COMPLETED')
    },
    {
      name: 'Discovery',
      enabled: 'NOT_AVAILABLE',
      operational: executions.some(execution => execution.jobs_collected > 0) ? 'OK' : 'NOT_AVAILABLE',
      lastExecution: latestExecution(executions, execution => execution.jobs_collected > 0)
    },
    {
      name: 'Match Engine',
      enabled: 'NOT_AVAILABLE',
      operational: 'NOT_AVAILABLE',
      lastExecution: null
    },
    {
      name: 'Ranking',
      enabled: 'NOT_AVAILABLE',
      operational: executions.some(execution => execution.jobs_ranked > 0) ? 'OK' : 'NOT_AVAILABLE',
      lastExecution: latestExecution(executions, execution => execution.jobs_ranked > 0)
    },
    {
      name: 'Decision',
      enabled: 'NOT_AVAILABLE',
      operational: executions.some(hasDecisionSignal) ? 'OK' : 'NOT_AVAILABLE',
      lastExecution: latestExecution(executions, hasDecisionSignal)
    },
    {
      name: 'Recommendation',
      enabled: 'NOT_AVAILABLE',
      operational: executions.some(hasDecisionSignal) ? 'OK' : 'NOT_AVAILABLE',
      lastExecution: latestExecution(executions, hasDecisionSignal)
    }
  ], [executions])

  const stats = useMemo(() => {
    const durations = executions
      .map(execution => execution.duration_seconds)
      .filter(duration => Number.isFinite(duration) && duration > 0)
    return {
      totalCampaigns: campaigns.length || executions.length,
      running: executions.filter(execution => runningStatuses.has(execution.status)).length,
      completed: executions.filter(execution => execution.status === 'COMPLETED').length,
      failed: executions.filter(execution => execution.status === 'FAILED').length,
      cancelled: executions.filter(execution => execution.status === 'CANCELLED').length,
      averageDuration: average(durations),
      fastest: durations.length ? Math.min(...durations) : null,
      slowest: durations.length ? Math.max(...durations) : null
    }
  }, [campaigns.length, executions])

  if (loading) {
    return <LoadingState title="Loading Platform Health" message="Fetching available operational signals from existing APIs." />
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow="Administration"
        title="Platform Health"
        description="Operational dashboard for available platform, execution, and campaign health signals."
        actions={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => setReloadKey(value => value + 1)} type="button">Refresh</button>}
      />

      {error && (
        <SectionCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-agent-primary">Warnings</h3>
              <p className="mt-1 text-sm text-slate-600">{error}</p>
            </div>
            <StatusBadge tone="amber">Not Available</StatusBadge>
          </div>
        </SectionCard>
      )}

      <PlatformOverview items={overview} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Campaigns" value={stats.totalCampaigns || NOT_AVAILABLE} tone="blue" />
        <StatCard label="Running" value={stats.running} />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="Failed" value={stats.failed} tone="red" />
        <StatCard label="Cancelled" value={stats.cancelled} tone="amber" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Average Duration" value={formatDuration(stats.averageDuration)} tone="blue" />
        <StatCard label="Fastest Campaign" value={formatDuration(stats.fastest)} tone="emerald" />
        <StatCard label="Slowest Campaign" value={formatDuration(stats.slowest)} tone="amber" />
      </section>

      <AgentPipeline stages={pipeline} />
      <RecentExecutions executions={executions} />

      <FilterBar>
        <StatusBadge tone={healthOk ? 'emerald' : 'slate'}>API: {healthOk ? 'OK' : NOT_AVAILABLE}</StatusBadge>
        <StatusBadge tone={authOk ? 'emerald' : 'slate'}>Authentication: {authOk ? 'OK' : NOT_AVAILABLE}</StatusBadge>
        <StatusBadge>Last updated: {formatDateTime(lastUpdated)}</StatusBadge>
      </FilterBar>
    </PageContainer>
  )
}
