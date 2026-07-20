import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  FilterBar,
  InfoCard,
  LoadingState,
  PageActions,
  PageContainer,
  PageHeader,
  SearchToolbar,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  AgentExecutionDetail,
  AgentExecutionQuery,
  AgentExecutionSummary,
  CampaignExecutionResults,
  CampaignExecutionResultsQuery,
  CampaignResultOpportunity,
  agentExecutionDownloadUrl,
  getAgentExecution,
  getAgentExecutionResults,
  listAgentExecutions
} from '../lib/api'
import {
  getCampaignExecutionProgress,
  type CampaignExecutionProgress
} from '../lib/campaignRunApi'

const PAGE_SIZE = 25
const RESULTS_PAGE_SIZE = 25
const initialFilters: AgentExecutionQuery = {
  q: '',
  execution_status: '',
  sort_by: 'started_at',
  order: 'desc'
}

const initialResultFilters: CampaignExecutionResultsQuery = {
  decision: '',
  recommendation: '',
  company: '',
  source: '',
  minimum_match_score: undefined,
  sort_by: 'ranking_score',
  order: 'desc'
}

type CampaignResultsDraftFilters = Omit<CampaignExecutionResultsQuery, 'minimum_match_score'> & {
  minimum_match_score: string
}

const initialResultDraftFilters: CampaignResultsDraftFilters = {
  decision: '',
  recommendation: '',
  company: '',
  source: '',
  minimum_match_score: '',
  sort_by: 'ranking_score',
  order: 'desc'
}

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

function progressStatusTone(status: string): 'emerald' | 'red' | 'blue' | 'slate' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED') return 'red'
  if (status === 'CANCELLED') return 'slate'
  return 'blue'
}

function decisionTone(decision: string | null | undefined): 'emerald' | 'amber' | 'red' | 'slate' {
  if (decision === 'APPLY') return 'emerald'
  if (decision === 'CONSIDER' || decision === 'DEFER') return 'amber'
  if (decision === 'DO_NOT_APPLY') return 'red'
  return 'slate'
}

function JsonBlock({ value, title }: { value: unknown, title: string }) {
  const { t } = useLanguage()
  const empty = value === null || value === undefined
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0)

  return (
    <SectionCard className="rounded-2xl border-slate-200" padded={false}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">{title}</h3>
      </div>
      {empty ? (
        <div className="px-5 py-6 text-sm text-slate-500">{t('agentExecutions.noPersistedData')}</div>
      ) : (
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-5 text-xs leading-5 text-slate-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </SectionCard>
  )
}

const executionStages = [
  'PREPARING',
  'VALIDATING',
  'PLANNER',
  'DISCOVERY',
  'MATCH_ENGINE',
  'RANKING',
  'DECISION',
  'RECOMMENDATION'
]
const executionStageSet = new Set(executionStages)

const timelineStages = [
  'PREPARING',
  'VALIDATING',
  'PLANNER',
  'DISCOVERY',
  'MATCH_ENGINE',
  'RANKING',
  'DECISION',
  'RECOMMENDATION',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]

const terminalStatuses = new Set([
  'DISCOVERY_COMPLETED',
  'MATCH_ENGINE_COMPLETED',
  'RANKING_COMPLETED',
  'DECISION_COMPLETED',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
])

function progressPercentage(progress: CampaignExecutionProgress) {
  const status = progress.status?.toUpperCase()
  if (status === 'COMPLETED') {
    return 100
  }

  const completedStages = new Set(
    (progress.completed_stages ?? [])
      .map(stage => stage.toUpperCase())
      .filter(stage => executionStageSet.has(stage))
  )
  const currentStage = progress.current_stage?.toUpperCase()
  const currentStageIndex = currentStage ? executionStages.indexOf(currentStage) : -1
  const reachedStages = currentStageIndex >= 0 ? currentStageIndex + 1 : 0
  const completed = Math.max(completedStages.size, reachedStages)

  return Math.max(0, Math.min(100, Math.round((completed / executionStages.length) * 100)))
}

function summaryProgressPercentage(summary: AgentExecutionSummary, progress: CampaignExecutionProgress | null) {
  if (progress) return progressPercentage(progress)
  if (summary.status?.toUpperCase() === 'COMPLETED') return 100
  return Math.max(0, Math.min(100, Math.round(summary.progress)))
}

function shouldPollProgress(progress: CampaignExecutionProgress | null) {
  if (!progress) return true
  if (terminalStatuses.has(progress.status)) return false
  return true
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function nestedRecord(source: Record<string, unknown>, key: string) {
  return recordValue(source[key])
}

function durationFrom(report: Record<string, unknown>, key: string, candidates: string[] = ['duration_ms']) {
  const section = nestedRecord(report, key)
  for (const candidate of candidates) {
    const value = numberValue(section[candidate])
    if (value !== null) return candidate.endsWith('_ms') ? value / 1000 : value
  }
  return null
}

function countFrom(report: Record<string, unknown>, sectionName: string, fieldName: string) {
  return numberValue(nestedRecord(report, sectionName)[fieldName])
}

function ExecutionProgressPanel({ progress }: { progress: CampaignExecutionProgress }) {
  const { t } = useLanguage()
  const percentage = progressPercentage(progress)
  const duration = progress.duration_seconds ?? progress.duration

  return (
    <InfoCard
      actions={<StatusBadge tone={progressStatusTone(progress.status)}>{readable(progress.status)}</StatusBadge>}
      label={t('agentExecutions.campaignRunner')}
      title={t('agentExecutions.executionProgress')}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>{readable(progress.current_stage)}</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-xs font-bold uppercase text-slate-500">{t('agentExecutions.currentStage')}</div>
            <div className="mt-1 font-semibold text-slate-900">{readable(progress.current_stage)}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-xs font-bold uppercase text-slate-500">{t('agentExecutions.nextStage')}</div>
            <div className="mt-1 font-semibold text-slate-900">{readable(progress.next_stage)}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-xs font-bold uppercase text-slate-500">{t('agentExecutions.started')}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatDateTime(progress.started_at)}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-xs font-bold uppercase text-slate-500">{t('agentExecutions.duration')}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatDuration(duration)}</div>
          </div>
        </div>
      </div>
    </InfoCard>
  )
}

type TimelineStageStatus = 'Waiting' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'

function timelineStatus(stage: string, progress: CampaignExecutionProgress): TimelineStageStatus {
  if (stage === 'FAILED') return progress.status === 'FAILED' ? 'Failed' : 'Waiting'
  if (stage === 'CANCELLED') return progress.status === 'CANCELLED' ? 'Cancelled' : 'Waiting'
  if (stage === 'COMPLETED') return progress.status === 'COMPLETED' ? 'Completed' : 'Waiting'
  if (progress.status === 'COMPLETED' && executionStageSet.has(stage)) return 'Completed'
  if (progress.completed_stages?.includes(stage)) return 'Completed'
  if (progress.current_stage === stage && progress.status === 'FAILED') return 'Failed'
  if (progress.current_stage === stage && progress.status === 'CANCELLED') return 'Cancelled'
  if (progress.current_stage === stage && !terminalStatuses.has(progress.status)) return 'Running'
  return 'Waiting'
}

function timelineTone(status: TimelineStageStatus): 'emerald' | 'red' | 'blue' | 'slate' {
  if (status === 'Completed') return 'emerald'
  if (status === 'Failed') return 'red'
  if (status === 'Cancelled') return 'slate'
  if (status === 'Running') return 'blue'
  return 'slate'
}

function timelineTimestamp(stage: string, status: TimelineStageStatus, progress: CampaignExecutionProgress) {
  if (stage === 'PREPARING' && (status === 'Running' || status === 'Completed')) return progress.started_at
  if (stage === 'COMPLETED' && status === 'Completed') return progress.finished_at
  if (stage === 'FAILED' && status === 'Failed') return progress.finished_at
  if (stage === 'CANCELLED' && status === 'Cancelled') return progress.finished_at
  if (progress.current_stage === stage && status === 'Running') return progress.started_at
  return null
}

function TimelineIcon({ status }: { status: TimelineStageStatus }) {
  if (status === 'Completed') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      </svg>
    )
  }
  if (status === 'Failed') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    )
  }
  if (status === 'Cancelled') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M6 12h12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    )
  }
  if (status === 'Running') {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        <path d="M12 3a9 9 0 1 1-8.2 5.3" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  )
}

function ExecutionTimeline({ progress }: { progress: CampaignExecutionProgress | null }) {
  const { t } = useLanguage()
  if (!progress) {
    return (
      <SectionCard>
        <div className="mb-4">
          <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.executionTimeline')}</h3>
          <p className="text-sm text-slate-500">{t('agentExecutions.executionTimelineDescription')}</p>
        </div>
        <LoadingState title={t('agentExecutions.loadingTimeline')} message={t('agentExecutions.loadingTimelineDescription')} />
      </SectionCard>
    )
  }

  return (
    <SectionCard>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.executionTimeline')}</h3>
          <p className="text-sm text-slate-500">{t('agentExecutions.executionTimelineDescription')}</p>
        </div>
        <StatusBadge tone={progressStatusTone(progress.status)}>{readable(progress.status)}</StatusBadge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {timelineStages.map(stage => {
          const status = timelineStatus(stage, progress)
          const tone = timelineTone(status)
          const timestamp = timelineTimestamp(stage, status, progress)

          return (
            <InfoCard
              className="shadow-sm"
              key={stage}
              title={readable(stage)}
              actions={<StatusBadge tone={tone}>{status}</StatusBadge>}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  tone === 'emerald'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : tone === 'red'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : tone === 'blue'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}>
                  <TimelineIcon status={status} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.timestamp')}</div>
                  <div className="mt-1 break-words text-sm font-semibold text-slate-900">{formatDateTime(timestamp)}</div>
                </div>
              </div>
            </InfoCard>
          )
        })}
      </div>
    </SectionCard>
  )
}

function isFailedExecution(summaryStatus: string, progressStatus?: string) {
  return summaryStatus === 'FAILED' || progressStatus === 'FAILED'
}

function ExecutionFailurePanel({
  detail,
  progress
}: {
  detail: AgentExecutionDetail
  progress: CampaignExecutionProgress | null
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const stage = detail.current_stage || progress?.current_stage || t('common.notAvailable')
  const agent = detail.failed_agent || t('common.notAvailable')
  const message = detail.error_message || t('agentExecutions.failureMessageFallback')

  return (
    <SectionCard className="border-red-200 bg-red-50/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="red">FAILED</StatusBadge>
            <span className="text-xs font-bold uppercase tracking-wide text-red-700">{t('agentExecutions.executionError')}</span>
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-red-950">{t('agentExecutions.error')}</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-red-800">{message}</p>
        </div>
        <button
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!detail.stack_trace}
          onClick={() => setExpanded(value => !value)}
          type="button"
        >
          {expanded ? t('agentExecutions.hideDetails') : t('agentExecutions.showDetails')}
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoCard title={t('agentExecutions.failedAgent')}>
          <div className="text-sm font-bold text-slate-900">{agent}</div>
        </InfoCard>
        <InfoCard title={t('agentExecutions.stage')}>
          <div className="text-sm font-bold text-slate-900">{readable(stage)}</div>
        </InfoCard>
      </div>
      {expanded && detail.stack_trace && (
        <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-red-100 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          {detail.stack_trace}
        </pre>
      )}
    </SectionCard>
  )
}

type EndToEndMetrics = {
  totalDuration: number | null
  jobsFound: number
  jobsAnalyzed: number
  jobsRanked: number
  apply: number
  defer: number
  doNotApply: number
  plannerDuration: number | null
  discoveryDuration: number | null
  matchDuration: number | null
  rankingDuration: number | null
  decisionDuration: number | null
}

function executionMetrics(detail: AgentExecutionDetail): EndToEndMetrics {
  const report = detail.final_report ?? {}
  const summary = detail.summary
  const decisionExecution = nestedRecord(report, 'decision_execution')

  return {
    totalDuration: summary.duration_seconds ?? null,
    jobsFound: summary.jobs_collected
      || countFrom(report, 'discovery_execution', 'unique_jobs_found')
      || countFrom(report, 'discovery_execution', 'raw_jobs_found')
      || 0,
    jobsAnalyzed: countFrom(report, 'decision_execution', 'jobs_evaluated')
      || countFrom(report, 'match_execution', 'processed_jobs')
      || summary.jobs_ranked
      || 0,
    jobsRanked: summary.jobs_ranked
      || countFrom(report, 'ranking_execution', 'jobs_ranked')
      || 0,
    apply: summary.apply_count || numberValue(decisionExecution.apply) || 0,
    defer: summary.consider_count || numberValue(decisionExecution.defer) || 0,
    doNotApply: summary.do_not_apply_count || numberValue(decisionExecution.do_not_apply) || 0,
    plannerDuration: durationFrom(report, 'planner_execution', ['duration_ms', 'planner_duration_ms', 'duration']),
    discoveryDuration: durationFrom(report, 'discovery_execution', ['duration_ms', 'discovery_duration_ms', 'discovery_duration']),
    matchDuration: durationFrom(report, 'match_execution', ['duration_ms', 'match_duration_ms', 'match_duration']),
    rankingDuration: durationFrom(report, 'ranking_execution', ['duration_ms', 'ranking_duration_ms', 'ranking_duration']),
    decisionDuration: durationFrom(report, 'decision_execution', ['duration_ms', 'decision_duration_ms', 'decision_duration'])
  }
}

function DecisionSummary({ metrics }: { metrics: EndToEndMetrics }) {
  const { t } = useLanguage()
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.decisionSummary')}</h3>
        <p className="text-sm text-slate-500">{t('agentExecutions.decisionSummaryDescription')}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="APPLY" value={metrics.apply} tone="emerald" />
        <StatCard label="DEFER" value={metrics.defer} tone="amber" />
        <StatCard label="DO_NOT_APPLY" value={metrics.doNotApply} tone="red" />
      </div>
    </SectionCard>
  )
}

function CampaignSummary({ metrics }: { metrics: EndToEndMetrics }) {
  const { t } = useLanguage()
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.campaignSummary')}</h3>
        <p className="text-sm text-slate-500">{t('agentExecutions.campaignSummaryDescription')}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Duration" value={formatDuration(metrics.totalDuration)} tone="blue" />
        <StatCard label="Jobs Found" value={metrics.jobsFound} />
        <StatCard label="Jobs Analyzed" value={metrics.jobsAnalyzed} />
        <StatCard label="Jobs Ranked" value={metrics.jobsRanked} />
        <StatCard label="Jobs Approved" value={metrics.apply} tone="emerald" />
        <StatCard label="Jobs Deferred" value={metrics.defer} tone="amber" />
        <StatCard label="Jobs Rejected" value={metrics.doNotApply} tone="red" />
      </div>
    </SectionCard>
  )
}

function ExecutionMetrics({ metrics }: { metrics: EndToEndMetrics }) {
  const { t } = useLanguage()
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.executionMetrics')}</h3>
        <p className="text-sm text-slate-500">{t('agentExecutions.executionMetricsDescription')}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoCard title="Planner">
          <div className="text-2xl font-black text-slate-950">{formatDuration(metrics.plannerDuration)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.plannerDuration')}</div>
        </InfoCard>
        <InfoCard title="Discovery">
          <div className="text-2xl font-black text-slate-950">{formatDuration(metrics.discoveryDuration)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.discoveryDuration')}</div>
        </InfoCard>
        <InfoCard title="Match">
          <div className="text-2xl font-black text-slate-950">{formatDuration(metrics.matchDuration)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.matchDuration')}</div>
        </InfoCard>
        <InfoCard title="Ranking">
          <div className="text-2xl font-black text-slate-950">{formatDuration(metrics.rankingDuration)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.rankingDuration')}</div>
        </InfoCard>
        <InfoCard title="Decision">
          <div className="text-2xl font-black text-slate-950">{formatDuration(metrics.decisionDuration)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.decisionDuration')}</div>
        </InfoCard>
      </div>
    </SectionCard>
  )
}

function TopRecommendedOpportunities({ detail }: { detail: AgentExecutionDetail }) {
  const { t } = useLanguage()
  const applyItems = detail.recommended_set
    .filter(item => item.recommendation_decision === 'APPLY')
    .sort((left, right) => (left.ranking_position ?? 9999) - (right.ranking_position ?? 9999))

  return (
    <SectionCard className="rounded-2xl border-slate-200" padded={false}>
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.topRecommendedOpportunities')}</h3>
          <p className="text-sm text-slate-500">{t('agentExecutions.topRecommendedDescription')}</p>
        </div>
        <StatusBadge tone="emerald">{applyItems.length} APPLY</StatusBadge>
      </div>
      {applyItems.length === 0 ? (
        <EmptyState title={t('agentExecutions.noApplyOpportunities')} message={t('agentExecutions.noApplyOpportunitiesDescription')} />
      ) : (
        <div className="divide-y divide-slate-100">
          {applyItems.map(item => (
            <article className="p-5" key={item.sighting_id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="emerald">APPLY</StatusBadge>
                    {item.decision_confidence && <StatusBadge>{item.decision_confidence}</StatusBadge>}
                    {item.ranking_position && <StatusBadge tone="blue">{t('opportunityInbox.rank').replace('{position}', String(item.ranking_position))}</StatusBadge>}
                  </div>
                  <h4 className="mt-3 text-base font-bold text-slate-950">{item.title}</h4>
                  <div className="mt-1 text-sm text-slate-600">
                    {[item.company, item.location].filter(Boolean).join(' - ') || t('agentExecutions.companyLocationMissing')}
                  </div>
                  {item.decision_reason && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{item.decision_reason}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.match_score !== null && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                      <div className="text-lg font-black text-slate-900">{item.match_score.toFixed(1)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.score')}</div>
                    </div>
                  )}
                  {item.job_url && <a className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500" href={item.job_url} rel="noreferrer" target="_blank">LinkedIn</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function CampaignResultsTab({ executionId }: { executionId: string }) {
  const { t } = useLanguage()
  const [results, setResults] = useState<CampaignExecutionResults | null>(null)
  const [draftFilters, setDraftFilters] = useState<CampaignResultsDraftFilters>(initialResultDraftFilters)
  const [filters, setFilters] = useState<CampaignExecutionResultsQuery>(initialResultFilters)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getAgentExecutionResults(executionId, {
      ...filters,
      limit: RESULTS_PAGE_SIZE,
      offset
    })
      .then(response => {
        if (!active) return
        setResults(response)
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [executionId, filters, offset, reloadKey])

  function updateFilter(name: keyof CampaignResultsDraftFilters, value: string) {
    setDraftFilters(current => ({ ...current, [name]: value }))
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const minimumMatchScore = draftFilters.minimum_match_score.trim()
    setOffset(0)
    setFilters({
      decision: draftFilters.decision,
      recommendation: draftFilters.recommendation,
      company: draftFilters.company,
      source: draftFilters.source,
      minimum_match_score: minimumMatchScore === '' ? undefined : Number(minimumMatchScore),
      sort_by: draftFilters.sort_by,
      order: draftFilters.order
    })
  }

  function clearFilters() {
    setDraftFilters(initialResultDraftFilters)
    setFilters(initialResultFilters)
    setOffset(0)
  }

  async function copyUrl(url: string) {
    if (!url) return
    await navigator.clipboard.writeText(url)
  }

  const opportunities = results?.opportunities.items ?? []
  const total = results?.opportunities.total ?? 0
  const returned = results?.opportunities.returned ?? 0

  return (
    <div className="space-y-5">
      <SearchToolbar className="bg-slate-50/70">
        <form className="grid w-full gap-3 md:grid-cols-6" onSubmit={applyFilters}>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => updateFilter('decision', event.target.value)} value={draftFilters.decision}>
            <option value="">{t('opportunityRepository.allDecisions')}</option>
            <option value="APPLY">APPLY</option>
            <option value="DEFER">DEFER</option>
            <option value="CONSIDER">CONSIDER</option>
            <option value="DO_NOT_APPLY">DO_NOT_APPLY</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => updateFilter('recommendation', event.target.value)} value={draftFilters.recommendation}>
            <option value="">{t('opportunityInbox.allRecommendations')}</option>
            <option value="APPLY">APPLY</option>
            <option value="DEFER">DEFER</option>
            <option value="CONSIDER">CONSIDER</option>
            <option value="DO_NOT_APPLY">DO_NOT_APPLY</option>
          </select>
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => updateFilter('company', event.target.value)} placeholder={t('opportunityInbox.company')} value={draftFilters.company} />
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => updateFilter('source', event.target.value)} placeholder={t('agentExecutions.source')} value={draftFilters.source} />
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" min="0" max="100" onChange={event => updateFilter('minimum_match_score', event.target.value)} placeholder={t('agentExecutions.minimumMatch')} type="number" value={draftFilters.minimum_match_score} />
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => {
            const [sort_by, order] = event.target.value.split(':')
            setDraftFilters(current => ({
              ...current,
              sort_by: sort_by as CampaignExecutionResultsQuery['sort_by'],
              order: order as CampaignExecutionResultsQuery['order']
            }))
          }} value={`${draftFilters.sort_by}:${draftFilters.order}`}>
            <option value="ranking_score:desc">{t('agentExecutions.rankingScore')}</option>
            <option value="match_score:desc">{t('agentExecutions.matchScore')}</option>
            <option value="company:asc">{t('opportunityInbox.company')}</option>
            <option value="collected_at:desc">{t('agentExecutions.collectedAt')}</option>
          </select>
          <div className="flex flex-wrap gap-2 md:col-span-6">
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">{t('opportunityRepository.applyFilters')}</button>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={clearFilters} type="button">{t('opportunityRepository.clear')}</button>
          </div>
        </form>
      </SearchToolbar>

      {loading && <LoadingState title={t('agentExecutions.loadingCampaignResults')} message={t('agentExecutions.loadingCampaignResultsDescription')} />}
      {!loading && error && <ErrorState title={t('agentExecutions.campaignResultsUnavailable')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('home.tryAgain')}</button>} />}

      {!loading && !error && results && (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('agentExecutions.campaignStatus')} value={readable(results.summary.execution_status)} tone={statusTone(results.summary.execution_status)} />
            <StatCard label={t('agentExecutions.duration')} value={formatDuration(results.summary.duration)} tone="blue" />
            <StatCard label={t('agentExecutions.jobsFound')} value={results.discovery.unique_jobs_found} />
            <StatCard label={t('agentExecutions.jobsMatched')} value={results.match.jobs_processed} />
            <StatCard label={t('agentExecutions.jobsRanked')} value={results.ranking.jobs_ranked} />
            <StatCard label="APPLY" value={results.decision.apply_count} tone="emerald" />
            <StatCard label="DEFER" value={results.decision.defer_count} tone="amber" />
            <StatCard label="DO NOT APPLY" value={results.decision.do_not_apply_count} tone="red" />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <SectionCard>
              <div className="mb-4">
                <h3 className="text-lg font-extrabold text-agent-primary">Discovery</h3>
                <p className="text-sm text-slate-500">{t('agentExecutions.discoveryTotalsDescription')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label={t('agentExecutions.rawJobs')} value={results.discovery.raw_jobs_found} className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.uniqueJobs')} value={results.discovery.unique_jobs_found} className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.discardedJobs')} value={results.discovery.discarded_jobs} tone="amber" className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.discoveryDuration')} value={formatDuration(results.discovery.discovery_duration === null ? null : results.discovery.discovery_duration / 1000)} tone="blue" className="rounded-xl px-4 py-3" />
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-4">
                <h3 className="text-lg font-extrabold text-agent-primary">Match</h3>
                <p className="text-sm text-slate-500">{t('agentExecutions.matchDistributionDescription')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t('agentExecutions.averageMatch')} value={formatScore(results.match.average_match_score)} tone="blue" className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.highestMatch')} value={formatScore(results.match.highest_match_score)} tone="emerald" className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.lowestMatch')} value={formatScore(results.match.lowest_match_score)} tone="amber" className="rounded-xl px-4 py-3" />
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-4">
                <h3 className="text-lg font-extrabold text-agent-primary">Ranking</h3>
                <p className="text-sm text-slate-500">{t('agentExecutions.rankingOutputDescription')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label={t('agentExecutions.jobsRanked')} value={results.ranking.jobs_ranked} className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.topScore')} value={formatScore(results.ranking.top_score)} tone="emerald" className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.averageScore')} value={formatScore(results.ranking.average_score)} tone="blue" className="rounded-xl px-4 py-3" />
                <StatCard label={t('agentExecutions.lowestScore')} value={formatScore(results.ranking.lowest_score)} tone="amber" className="rounded-xl px-4 py-3" />
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-4">
                <h3 className="text-lg font-extrabold text-agent-primary">Decision</h3>
                <p className="text-sm text-slate-500">{t('agentExecutions.decisionCountsDescription')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="APPLY" value={results.decision.apply_count} tone="emerald" className="rounded-xl px-4 py-3" />
                <StatCard label="DEFER" value={results.decision.defer_count} tone="amber" className="rounded-xl px-4 py-3" />
                <StatCard label="DO NOT APPLY" value={results.decision.do_not_apply_count} tone="red" className="rounded-xl px-4 py-3" />
              </div>
            </SectionCard>
          </section>

          <SectionCard className="overflow-hidden rounded-2xl border-slate-200" padded={false}>
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-agent-primary">{t('agentExecutions.opportunities')}</h3>
                <p className="text-sm text-slate-500">{t('agentExecutions.opportunitiesDescription')}</p>
              </div>
              <StatusBadge>{t('agentExecutions.totalCount').replace('{count}', String(total))}</StatusBadge>
            </div>
            {opportunities.length === 0 ? (
              <EmptyState title={t('agentExecutions.noCampaignOpportunities')} message={t('agentExecutions.noCampaignOpportunitiesDescription')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t('agentExecutions.titleColumn')}</th>
                      <th className="px-4 py-3">{t('opportunityInbox.company')}</th>
                      <th className="px-4 py-3">{t('discoverySources.location')}</th>
                      <th className="px-4 py-3 text-right">{t('agentExecutions.matchScore')}</th>
                      <th className="px-4 py-3 text-right">{t('agentExecutions.rankingScore')}</th>
                      <th className="px-4 py-3">{t('agentExecutions.decision')}</th>
                      <th className="px-4 py-3">{t('agentExecutions.recommendation')}</th>
                      <th className="px-4 py-3">{t('agentExecutions.source')}</th>
                      <th className="px-4 py-3">{t('agentExecutions.collectedAt')}</th>
                      <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {opportunities.map(opportunity => (
                      <CampaignResultOpportunityRow key={`${opportunity.opportunity_id}:${opportunity.collected_at}`} opportunity={opportunity} onCopyUrl={copyUrl} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <FilterBar className="justify-between">
            <span className="px-2 text-xs font-medium text-slate-500">
              {t('agentExecutions.showingOf').replace('{from}', String(total === 0 ? 0 : offset + 1)).replace('{to}', String(Math.min(offset + returned, total))).replace('{total}', String(total))}
            </span>
            <div className="flex gap-2">
              <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - RESULTS_PAGE_SIZE))} type="button">{t('agentExecutions.previous')}</button>
              <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={offset + returned >= total} onClick={() => setOffset(value => value + RESULTS_PAGE_SIZE)} type="button">{t('agentExecutions.next')}</button>
            </div>
          </FilterBar>
        </>
      )}
    </div>
  )
}

function CampaignResultOpportunityRow({ opportunity, onCopyUrl }: { opportunity: CampaignResultOpportunity, onCopyUrl: (url: string) => void }) {
  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="max-w-[280px] px-4 py-3">
        <Link className="font-semibold text-slate-900 hover:text-brand-600" to={`/opportunities/${opportunity.opportunity_id}`}>
          {opportunity.title}
        </Link>
        {opportunity.recommendation_reason && (
          <div className="mt-1 max-w-md text-xs leading-5 text-slate-500">{opportunity.recommendation_reason}</div>
        )}
      </td>
      <td className="px-4 py-3 text-slate-700">{opportunity.company || 'Not provided'}</td>
      <td className="px-4 py-3 text-slate-600">{opportunity.location || 'Not provided'}</td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatScore(opportunity.match_score)}</td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatScore(opportunity.ranking_score)}</td>
      <td className="px-4 py-3"><StatusBadge tone={decisionTone(opportunity.decision)}>{readable(opportunity.decision)}</StatusBadge></td>
      <td className="px-4 py-3"><StatusBadge tone={decisionTone(opportunity.recommendation)}>{readable(opportunity.recommendation)}</StatusBadge></td>
      <td className="px-4 py-3 text-slate-600">{opportunity.source || 'Not provided'}</td>
      <td className="px-4 py-3 text-slate-600">{formatDateTime(opportunity.collected_at)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" to={`/opportunities/${opportunity.opportunity_id}`}>View details</Link>
          {opportunity.url && (
            <a className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500" href={opportunity.url} rel="noreferrer" target="_blank">Open Opportunity</a>
          )}
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={!opportunity.url} onClick={() => onCopyUrl(opportunity.url)} type="button">Copy URL</button>
        </div>
      </td>
    </tr>
  )
}

function ExecutionTable() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const queryFilter = searchParams.get('q') ?? ''
  const initialQueryFilters = queryFilter ? { ...initialFilters, q: queryFilter } : initialFilters
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([])
  const [draftFilters, setDraftFilters] = useState<AgentExecutionQuery>(initialQueryFilters)
  const [filters, setFilters] = useState<AgentExecutionQuery>(initialQueryFilters)
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listAgentExecutions({ ...filters, limit: PAGE_SIZE, offset })
      .then(response => {
        if (!active) return
        setExecutions(response.items)
        setReturned(response.returned)
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, offset, reloadKey])

  function updateFilter(name: keyof AgentExecutionQuery, value: string) {
    setDraftFilters(current => ({ ...current, [name]: value }))
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setFilters(draftFilters)
  }

  function clearFilters() {
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setOffset(0)
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        eyebrow={t('agentExecutions.section')}
        title={t('agentExecutions.title')}
        description={t('agentExecutions.description')}
      />

      <SearchToolbar className="bg-slate-50/70">
        <form className="grid w-full gap-3 md:grid-cols-4" onSubmit={applyFilters}>
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm md:col-span-2" onChange={event => updateFilter('q', event.target.value)} placeholder={t('agentExecutions.searchPlaceholder')} value={draftFilters.q} />
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => updateFilter('execution_status', event.target.value)} value={draftFilters.execution_status}>
            <option value="">{t('agentExecutions.allStatuses')}</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="STARTED">Running</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" onChange={event => {
            const [sort_by, order] = event.target.value.split(':')
            setDraftFilters(current => ({ ...current, sort_by: sort_by as AgentExecutionQuery['sort_by'], order: order as AgentExecutionQuery['order'] }))
          }} value={`${draftFilters.sort_by}:${draftFilters.order}`}>
            <option value="started_at:desc">{t('agentExecutions.sortNewest')}</option>
            <option value="started_at:asc">{t('agentExecutions.sortOldest')}</option>
            <option value="duration:desc">{t('agentExecutions.sortDuration')}</option>
            <option value="jobs_collected:desc">{t('agentExecutions.sortCollected')}</option>
            <option value="jobs_ranked:desc">{t('agentExecutions.sortRanked')}</option>
            <option value="apply:desc">{t('agentExecutions.sortApply')}</option>
          </select>
          <div className="flex flex-wrap gap-2 md:col-span-4">
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">{t('agentExecutions.applyFilters')}</button>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={clearFilters} type="button">{t('agentExecutions.clear')}</button>
          </div>
        </form>
      </SearchToolbar>

      {loading && <LoadingState title={t('agentExecutions.loading')} message={t('agentExecutions.loadingDescription')} />}
      {!loading && error && <ErrorState title={t('agentExecutions.errorTitle')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('agentExecutions.tryAgain')}</button>} />}
      {!loading && !error && executions.length === 0 && <EmptyState title={t('agentExecutions.emptyTitle')} message={t('agentExecutions.emptyDescription')} />}

      {!loading && !error && executions.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-500">
            <span>{t('agentExecutions.showing')} {offset + 1}-{offset + returned}</span>
            <span>{t('agentExecutions.oneRowPerExecution')}</span>
          </div>
          <SectionCard className="overflow-hidden rounded-2xl border-slate-200" padded={false}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t('agentExecutions.status')}</th>
                    <th className="px-4 py-3">{t('agentExecutions.campaign')}</th>
                    <th className="px-4 py-3">{t('agentExecutions.executionId')}</th>
                    <th className="px-4 py-3">{t('agentExecutions.startedAt')}</th>
                    <th className="px-4 py-3">{t('agentExecutions.finishedAt')}</th>
                    <th className="px-4 py-3">{t('agentExecutions.duration')}</th>
                    <th className="px-4 py-3 text-right">{t('agentExecutions.jobsCollected')}</th>
                    <th className="px-4 py-3 text-right">{t('agentExecutions.jobsRanked')}</th>
                    <th className="px-4 py-3 text-right">APPLY</th>
                    <th className="px-4 py-3 text-right">CONSIDER</th>
                    <th className="px-4 py-3 text-right">DO_NOT_APPLY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executions.map(execution => (
                    <tr className="transition hover:bg-slate-50/70" key={execution.execution_id}>
                      <td className="px-4 py-3"><StatusBadge tone={statusTone(execution.status)}>{readable(execution.status)}</StatusBadge></td>
                      <td className="max-w-[240px] px-4 py-3 font-semibold text-slate-900"><Link className="hover:text-brand-600" to={`/agent/executions/${execution.execution_id}`}>{execution.campaign}</Link></td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{execution.execution_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(execution.started_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(execution.finished_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDuration(execution.duration_seconds)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{execution.jobs_collected}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{execution.jobs_ranked}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{execution.apply_count}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums">{execution.consider_count}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700 tabular-nums">{execution.do_not_apply_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <FilterBar className="justify-between">
            <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>{t('agentExecutions.previous')}</button>
            <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>{t('agentExecutions.next')}</button>
          </FilterBar>
        </>
      )}
    </PageContainer>
  )
}

function ExecutionDetailPage({ executionId }: { executionId: string }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')?.trim()
  const [detail, setDetail] = useState<AgentExecutionDetail | null>(null)
  const [progress, setProgress] = useState<CampaignExecutionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(requestedSection || 'summary')

  useEffect(() => {
    if (requestedSection) setActiveSection(requestedSection)
  }, [requestedSection])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getAgentExecution(executionId)
      .then(response => { if (active) setDetail(response) })
      .catch((requestError: Error) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [executionId])

  useEffect(() => {
    let active = true
    let timeoutId: number | undefined

    async function loadProgress() {
      try {
        const response = await getCampaignExecutionProgress(executionId)
        if (!active) return
        setProgress(response)
        if (shouldPollProgress(response)) {
          timeoutId = window.setTimeout(loadProgress, 2000)
        }
      } catch {
        if (active) setProgress(null)
      }
    }

    void loadProgress()

    return () => {
      active = false
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [executionId])

  useEffect(() => {
    if (!progress || shouldPollProgress(progress)) {
      return
    }

    let active = true
    getAgentExecution(executionId)
      .then(response => { if (active) setDetail(response) })
      .catch(() => undefined)

    return () => { active = false }
  }, [executionId, progress?.status])

  if (loading && !progress) return <LoadingState title={t('agentExecutions.loadingDetail')} message={t('agentExecutions.loadingDetailDescription')} />
  if (error && !progress) return <ErrorState title={t('agentExecutions.detailErrorTitle')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/agent/executions')}>{t('agentExecutions.backToExecutions')}</button>} />
  if (!detail && progress) {
    return (
      <PageContainer className="space-y-5">
        <PageHeader
          eyebrow={t('agentExecutions.section')}
          title={t('agentExecutions.executionPreparing')}
          description={executionId}
          actions={<StatusBadge tone={progressStatusTone(progress.status)}>{readable(progress.status)}</StatusBadge>}
        />
        <ExecutionProgressPanel progress={progress} />
        <ExecutionTimeline progress={progress} />
        <LoadingState title={t('agentExecutions.reportPending')} message={t('agentExecutions.reportPendingDescription')} />
      </PageContainer>
    )
  }
  if (!detail) return <EmptyState title={t('agentExecutions.notFoundTitle')} message={t('agentExecutions.notFoundDescription')} />

  const summary = detail.summary
  const displayedProgress = summaryProgressPercentage(summary, progress)
  const endToEndMetrics = executionMetrics(detail)
  const sections = [
    ['summary', t('agentExecutions.summary')],
    ['campaign_results', 'Campaign Results'],
    ['planner', 'Planner'],
    ['discovery', 'Discovery'],
    ['ranking', 'Ranking'],
    ['decision', 'Decision'],
    ['recommended_set', 'Recommended Set'],
    ['runtime_settings', 'Runtime Settings'],
    ['configuration_resolution', 'Configuration Resolution'],
    ['goal_satisfaction', 'Goal Satisfaction'],
    ['self_review', 'Self Review'],
    ['generated_hypotheses', 'Generated Hypotheses'],
    ['semantic_match', 'Semantic Match'],
    ['final_report', 'Final Report']
  ]

  const sectionValue: Record<string, unknown> = {
    planner: detail.planner,
    discovery: detail.discovery,
    ranking: detail.ranking,
    decision: detail.decision,
    runtime_settings: detail.runtime_settings,
    configuration_resolution: detail.configuration_resolution,
    goal_satisfaction: detail.goal_satisfaction,
    self_review: detail.self_review,
    generated_hypotheses: detail.generated_hypotheses,
    semantic_match: detail.semantic_match,
    final_report: detail.final_report
  }

  return (
    <PageContainer className="space-y-5">
      <SectionCard className="rounded-2xl border-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button className="mb-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate('/agent/executions')} type="button">← {t('agentExecutions.backToExecutions')}</button>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(summary.status)}>{readable(summary.status)}</StatusBadge>
              <StatusBadge>{formatDuration(summary.duration_seconds)}</StatusBadge>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-agent-primary">{summary.campaign}</h2>
            <div className="mt-1 font-mono text-xs text-slate-500">{summary.execution_id}</div>
          </div>
          <PageActions>
            {summary.has_final_report && <a className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" href={agentExecutionDownloadUrl(summary.execution_id, 'final-report')}>{t('agentExecutions.downloadFinalReport')}</a>}
            {summary.has_execution_log && <a className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={agentExecutionDownloadUrl(summary.execution_id, 'log')}>{t('agentExecutions.downloadExecutionLog')}</a>}
          </PageActions>
        </div>
      </SectionCard>

      <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t('agentExecutions.jobsCollected')} value={summary.jobs_collected} tone="blue" className="rounded-xl px-4 py-3" />
        <StatCard label={t('agentExecutions.jobsRanked')} value={summary.jobs_ranked} className="rounded-xl px-4 py-3" />
        <StatCard label="APPLY" value={summary.apply_count} tone="emerald" className="rounded-xl px-4 py-3" />
        <StatCard label="CONSIDER" value={summary.consider_count} tone="amber" className="rounded-xl px-4 py-3" />
        <StatCard label="DO_NOT_APPLY" value={summary.do_not_apply_count} tone="red" className="rounded-xl px-4 py-3" />
        <StatCard label={t('agentExecutions.progress')} value={`${displayedProgress}%`} className="rounded-xl px-4 py-3" />
      </section>

      {progress && <ExecutionProgressPanel progress={progress} />}
      <ExecutionTimeline progress={progress} />
      {isFailedExecution(summary.status, progress?.status) && (
        <ExecutionFailurePanel detail={detail} progress={progress} />
      )}
      <CampaignSummary metrics={endToEndMetrics} />
      <DecisionSummary metrics={endToEndMetrics} />
      <TopRecommendedOpportunities detail={detail} />
      <ExecutionMetrics metrics={endToEndMetrics} />

      <FilterBar className="overflow-x-auto rounded-2xl border-slate-200">
        {sections.map(([key, label]) => (
          <button className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${activeSection === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`} key={key} onClick={() => setActiveSection(key)} type="button">{label}</button>
        ))}
      </FilterBar>

      {activeSection === 'summary' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <JsonBlock title={t('agentExecutions.summary')} value={summary} />
          <JsonBlock title="Downloads" value={detail.downloads} />
        </section>
      )}

      {activeSection === 'recommended_set' && (
        <SectionCard className="rounded-2xl border-slate-200" padded={false}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Recommended Set</h3>
          </div>
          {detail.recommended_set.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No persisted Recommended Set items found for this execution.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {detail.recommended_set.map(item => (
                <article className="p-5" key={item.sighting_id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={decisionTone(item.recommendation_decision)}>{readable(item.recommendation_decision)}</StatusBadge>
                        {item.decision_confidence && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{item.decision_confidence}</span>}
                        {item.ranking_position && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Rank {item.ranking_position}</span>}
                      </div>
                      <h4 className="mt-2 text-base font-bold text-slate-950">{item.title}</h4>
                      <div className="mt-1 text-sm text-slate-600">{item.company || 'Company not provided'}</div>
                      {item.decision_reason && <p className="mt-2 max-w-3xl text-sm text-slate-600">{item.decision_reason}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.match_score !== null && <div className="rounded-xl bg-slate-50 px-3 py-2 text-right"><div className="text-lg font-black text-slate-900">{item.match_score.toFixed(1)}</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Match</div></div>}
                      {item.job_url && <a className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500" href={item.job_url} rel="noreferrer" target="_blank">LinkedIn ↗</a>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {activeSection === 'campaign_results' && (
        <CampaignResultsTab executionId={summary.execution_id} />
      )}

      {activeSection !== 'summary' && activeSection !== 'campaign_results' && activeSection !== 'recommended_set' && (
        <JsonBlock title={sections.find(([key]) => key === activeSection)?.[1] ?? activeSection} value={sectionValue[activeSection]} />
      )}
    </PageContainer>
  )
}

export default function AgentExecutionsPage() {
  const { executionId } = useParams()
  return executionId ? <ExecutionDetailPage executionId={executionId} /> : <ExecutionTable />
}
