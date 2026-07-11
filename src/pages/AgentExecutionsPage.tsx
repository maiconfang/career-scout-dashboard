import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageState from '../components/PageState'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  AgentExecutionDetail,
  AgentExecutionQuery,
  AgentExecutionSummary,
  agentExecutionDownloadUrl,
  getAgentExecution,
  listAgentExecutions
} from '../lib/api'

const PAGE_SIZE = 25
const initialFilters: AgentExecutionQuery = {
  q: '',
  execution_status: '',
  sort_by: 'started_at',
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

function readable(value: string | null | undefined) {
  if (!value) return 'Not available'
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function statusClass(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'FAILED') return 'bg-red-50 text-red-700 ring-red-100'
  return 'bg-blue-50 text-blue-700 ring-blue-100'
}

function decisionClass(decision: string | null | undefined) {
  if (decision === 'APPLY') return 'bg-emerald-50 text-emerald-700'
  if (decision === 'CONSIDER') return 'bg-amber-50 text-amber-700'
  if (decision === 'DO_NOT_APPLY') return 'bg-red-50 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

function Kpi({ label, value, tone = 'slate' }: { label: string, value: ReactNode, tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    slate: 'border-slate-100 bg-slate-50 text-slate-900',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700'
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div>
    </div>
  )
}

function JsonBlock({ value, title }: { value: unknown, title: string }) {
  const empty = value === null || value === undefined
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">{title}</h3>
      </div>
      {empty ? (
        <div className="px-5 py-6 text-sm text-slate-500">No persisted data available for this section.</div>
      ) : (
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-5 text-xs leading-5 text-slate-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </section>
  )
}

function ExecutionTable() {
  const { t } = useLanguage()
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([])
  const [draftFilters, setDraftFilters] = useState<AgentExecutionQuery>(initialFilters)
  const [filters, setFilters] = useState<AgentExecutionQuery>(initialFilters)
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
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">{t('agentExecutions.section')}</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-agent-primary">{t('agentExecutions.title')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{t('agentExecutions.description')}</p>
        </div>

        <form className="grid gap-3 bg-slate-50/70 px-5 py-4 md:grid-cols-4" onSubmit={applyFilters}>
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
      </section>

      {loading && <PageState title={t('agentExecutions.loading')} message={t('agentExecutions.loadingDescription')} />}
      {!loading && error && <PageState title={t('agentExecutions.errorTitle')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('agentExecutions.tryAgain')}</button>} />}
      {!loading && !error && executions.length === 0 && <PageState title={t('agentExecutions.emptyTitle')} message={t('agentExecutions.emptyDescription')} />}

      {!loading && !error && executions.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-500">
            <span>{t('agentExecutions.showing')} {offset + 1}-{offset + returned}</span>
            <span>{t('agentExecutions.oneRowPerExecution')}</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
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
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(execution.status)}`}>{readable(execution.status)}</span></td>
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
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>{t('agentExecutions.previous')}</button>
            <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>{t('agentExecutions.next')}</button>
          </div>
        </>
      )}
    </div>
  )
}

function ExecutionDetailPage({ executionId }: { executionId: string }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AgentExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('summary')

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

  if (loading) return <PageState title={t('agentExecutions.loadingDetail')} message={t('agentExecutions.loadingDetailDescription')} />
  if (error) return <PageState title={t('agentExecutions.detailErrorTitle')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/agent/executions')}>{t('agentExecutions.backToExecutions')}</button>} />
  if (!detail) return <PageState title={t('agentExecutions.notFoundTitle')} message={t('agentExecutions.notFoundDescription')} />

  const summary = detail.summary
  const sections = [
    ['summary', t('agentExecutions.summary')],
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
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button className="mb-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate('/agent/executions')} type="button">← {t('agentExecutions.backToExecutions')}</button>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(summary.status)}`}>{readable(summary.status)}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{formatDuration(summary.duration_seconds)}</span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-agent-primary">{summary.campaign}</h2>
            <div className="mt-1 font-mono text-xs text-slate-500">{summary.execution_id}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.has_final_report && <a className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" href={agentExecutionDownloadUrl(summary.execution_id, 'final-report')}>{t('agentExecutions.downloadFinalReport')}</a>}
            {summary.has_execution_log && <a className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={agentExecutionDownloadUrl(summary.execution_id, 'log')}>{t('agentExecutions.downloadExecutionLog')}</a>}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t('agentExecutions.jobsCollected')} value={summary.jobs_collected} tone="blue" />
        <Kpi label={t('agentExecutions.jobsRanked')} value={summary.jobs_ranked} />
        <Kpi label="APPLY" value={summary.apply_count} tone="emerald" />
        <Kpi label="CONSIDER" value={summary.consider_count} tone="amber" />
        <Kpi label="DO_NOT_APPLY" value={summary.do_not_apply_count} tone="red" />
        <Kpi label={t('agentExecutions.progress')} value={`${Math.round(summary.progress)}%`} />
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
        {sections.map(([key, label]) => (
          <button className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${activeSection === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`} key={key} onClick={() => setActiveSection(key)} type="button">{label}</button>
        ))}
      </div>

      {activeSection === 'summary' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <JsonBlock title={t('agentExecutions.summary')} value={summary} />
          <JsonBlock title="Downloads" value={detail.downloads} />
        </section>
      )}

      {activeSection === 'recommended_set' && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
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
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${decisionClass(item.recommendation_decision)}`}>{readable(item.recommendation_decision)}</span>
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
        </section>
      )}

      {activeSection !== 'summary' && activeSection !== 'recommended_set' && (
        <JsonBlock title={sections.find(([key]) => key === activeSection)?.[1] ?? activeSection} value={sectionValue[activeSection]} />
      )}
    </div>
  )
}

export default function AgentExecutionsPage() {
  const { executionId } = useParams()
  return executionId ? <ExecutionDetailPage executionId={executionId} /> : <ExecutionTable />
}
