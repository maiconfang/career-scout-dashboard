import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  InfoCard,
  LoadingState,
  PageContainer,
  PageHeader,
  ProgressBar,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  getResumeOptimization,
  listAgentExecutions,
  type AgentExecutionSummary,
  type ResumeOptimization,
  type ResumeSkillOptimization
} from '../lib/api'

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA').format(value)
}

function coverageWithImprovement(data: ResumeOptimization) {
  return Math.max(0, Math.min(100, data.current_resume_coverage + data.estimated_coverage_improvement))
}

const terminalExecutionStatuses = new Set([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'DISCOVERY_COMPLETED',
  'MATCH_ENGINE_COMPLETED',
  'RANKING_COMPLETED',
  'DECISION_COMPLETED'
])

function isCompletedExecution(execution: AgentExecutionSummary) {
  return execution.status?.toUpperCase() === 'COMPLETED'
}

function isRunningExecution(execution: AgentExecutionSummary) {
  const status = execution.status?.toUpperCase()
  return Boolean(status) && !terminalExecutionStatuses.has(status)
}

type ResumeOptimizationLabels = {
  dataUnavailable: string
  marketFrequency: string
  present: string
  gap: string
  improve: string
  noMissingSkills: string
  missingSkillDataUnavailable: string
  noMarketFrequency: string
  marketFrequencyUnavailable: string
  skill: string
  frequency: string
  priority: string
  status: string
}

function SkillList({ items, emptyTitle, labels }: { items: ResumeSkillOptimization[], emptyTitle: string, labels: ResumeOptimizationLabels }) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={labels.dataUnavailable} />
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => (
        <div className="flex items-center justify-between gap-4 py-3" key={item.skill}>
          <div>
            <div className="font-bold text-slate-950">{item.skill}</div>
            <div className="text-xs font-medium text-slate-500">
              {labels.marketFrequency} {formatPercent(item.market_frequency)}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <StatusBadge tone={item.present ? 'emerald' : 'amber'}>
              {item.present ? labels.present : labels.gap}
            </StatusBadge>
            <StatusBadge tone="blue">{formatNumber(item.market_count)}</StatusBadge>
          </div>
        </div>
      ))}
    </div>
  )
}

function MissingSkillsTable({ items, labels }: { items: ResumeSkillOptimization[], labels: ResumeOptimizationLabels }) {
  if (items.length === 0) {
    return <EmptyState title={labels.noMissingSkills} message={labels.missingSkillDataUnavailable} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">{labels.skill}</th>
            <th className="py-2 pr-4">{labels.frequency}</th>
            <th className="py-2 pr-4">{labels.priority}</th>
            <th className="py-2">{labels.status}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(item => (
            <tr key={item.skill}>
              <td className="py-3 pr-4 font-bold text-slate-950">{item.skill}</td>
              <td className="py-3 pr-4 tabular-nums text-slate-600">{formatNumber(item.missing_count)}</td>
              <td className="py-3 pr-4 tabular-nums text-slate-600">{item.priority_score.toFixed(1)}</td>
              <td className="py-3">
                <StatusBadge tone={item.present ? 'emerald' : 'amber'}>{item.present ? labels.present : labels.improve}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarketFrequency({ items, labels }: { items: ResumeSkillOptimization[], labels: ResumeOptimizationLabels }) {
  if (items.length === 0) {
    return <EmptyState title={labels.noMarketFrequency} message={labels.marketFrequencyUnavailable} />
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.skill}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="font-bold text-slate-950">{item.skill}</div>
            <div className="text-xs font-bold tabular-nums text-slate-500">
              {formatPercent(item.market_frequency)}
            </div>
          </div>
          <ProgressBar value={item.market_frequency} tone={item.present ? 'emerald' : 'blue'} />
        </div>
      ))}
    </div>
  )
}

function JourneyStep({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
      <span>{children}</span>
    </div>
  )
}

function OutcomeItem({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
      {children}
    </div>
  )
}

function OnboardingState() {
  const { t } = useLanguage()
  return (
    <PageContainer size="xl">
      <SectionCard className="border-brand-100 bg-brand-50/40">
        <div className="max-w-3xl">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-700">{t('career.section')}</div>
          <h2 className="mt-2 text-3xl font-extrabold text-agent-primary">{t('resumeOptimization.title')}</h2>
          <p className="mt-3 text-base font-semibold text-slate-700">{t('resumeOptimization.onboardingTitle')}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t('resumeOptimization.onboardingDescription')}</p>
        </div>
        <div className="mt-5 rounded-2xl border border-white/80 bg-white/75 p-4">
          <h3 className="text-sm font-extrabold text-agent-primary">{t('resumeOptimization.noInsightsTitle')}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t('resumeOptimization.noInsightsDescription')}</p>
        </div>
        <div className="mt-6">
          <h3 className="text-base font-extrabold text-agent-primary">{t('resumeOptimization.firstCampaignTitle')}</h3>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <JourneyStep>{t('resumeOptimization.stepAnalyzeResume')}</JourneyStep>
          <JourneyStep>{t('resumeOptimization.stepSearchOpportunities')}</JourneyStep>
          <JourneyStep>{t('resumeOptimization.stepCompareMarket')}</JourneyStep>
          <JourneyStep>{t('resumeOptimization.stepDetectSkills')}</JourneyStep>
          <JourneyStep>{t('resumeOptimization.stepCalculateCoverage')}</JourneyStep>
          <JourneyStep>{t('resumeOptimization.stepGenerateRecommendations')}</JourneyStep>
        </div>
        <div className="mt-6 rounded-2xl border border-brand-100 bg-white/75 p-4">
          <p className="text-sm font-bold text-agent-primary">{t('resumeOptimization.afterCampaignTitle')}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <OutcomeItem>{t('resumeOptimization.outcomeStrengths')}</OutcomeItem>
            <OutcomeItem>{t('resumeOptimization.outcomeMissingSkills')}</OutcomeItem>
            <OutcomeItem>{t('resumeOptimization.outcomeCoverage')}</OutcomeItem>
            <OutcomeItem>{t('resumeOptimization.outcomeRecommendations')}</OutcomeItem>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/career/campaigns">
            {t('resumeOptimization.runFirstCampaign')}
          </Link>
        </div>
      </SectionCard>
    </PageContainer>
  )
}

function ProcessingState() {
  const { t } = useLanguage()
  return (
    <PageContainer size="xl">
      <SectionCard className="border-blue-100 bg-blue-50/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-blue-700">{t('career.section')}</div>
            <h2 className="mt-2 text-3xl font-extrabold text-agent-primary">{t('resumeOptimization.title')}</h2>
            <p className="mt-3 text-base font-semibold text-slate-800">{t('resumeOptimization.processingTitle')}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('resumeOptimization.processingDescription')}</p>
          </div>
          <StatusBadge tone="blue">{t('resumeOptimization.processingBadge')}</StatusBadge>
        </div>
      </SectionCard>
    </PageContainer>
  )
}

export default function ResumeOptimizationPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<ResumeOptimization | null>(null)
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getResumeOptimization(),
      listAgentExecutions({ limit: 100, offset: 0, sort_by: 'started_at', order: 'desc' })
    ])
      .then(([optimizationResult, executionsResult]) => {
        if (optimizationResult.status === 'fulfilled') {
          setData(optimizationResult.value)
        } else {
          setData(null)
        }

        if (executionsResult.status === 'fulfilled') {
          setExecutions(executionsResult.value.items)
        } else {
          setExecutions([])
        }

        if (optimizationResult.status === 'rejected' && executionsResult.status === 'rejected') {
          throw optimizationResult.reason
        }
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const estimatedCoverage = useMemo(() => data ? coverageWithImprovement(data) : 0, [data])
  const strongestSkills = data?.top_skills_already_present.slice(0, 3) ?? []
  const biggestGaps = data?.most_frequent_missing_skills.slice(0, 3) ?? []
  const highestPriority = data?.skills_priority[0]
  const hasCompletedCampaign = executions.some(isCompletedExecution)
  const hasRunningCampaign = executions.some(isRunningExecution)
  const labels: ResumeOptimizationLabels = {
    dataUnavailable: t('resumeOptimization.dataUnavailable'),
    marketFrequency: t('resumeOptimization.marketFrequency'),
    present: t('resumeOptimization.present'),
    gap: t('resumeOptimization.gap'),
    improve: t('resumeOptimization.improve'),
    noMissingSkills: t('resumeOptimization.noMissingSkillsFound'),
    missingSkillDataUnavailable: t('resumeOptimization.missingSkillDataUnavailable'),
    noMarketFrequency: t('resumeOptimization.noMarketFrequencyFound'),
    marketFrequencyUnavailable: t('resumeOptimization.marketFrequencyUnavailable'),
    skill: t('resumeOptimization.skill'),
    frequency: t('resumeOptimization.frequency'),
    priority: t('resumeOptimization.priority'),
    status: t('resumeOptimization.status')
  }

  if (loading) {
    return (
      <PageContainer size="xl">
        <LoadingState title={t('resumeOptimization.loading')} message={t('resumeOptimization.loadingDescription')} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer size="xl">
        <ErrorState title={t('resumeOptimization.errorTitle')} message={error} />
      </PageContainer>
    )
  }

  if (!hasCompletedCampaign) {
    if (hasRunningCampaign) {
      return <ProcessingState />
    }
    return <OnboardingState />
  }

  if (!data) {
    return <OnboardingState />
  }

  return (
    <PageContainer size="xl">
      <PageHeader
        eyebrow={t('career.section')}
        title={t('resumeOptimization.title')}
        description={t('resumeOptimization.description')}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('resumeOptimization.resumeCompleteness')} value={formatPercent(data.resume_completeness_score)} subtitle={t('resumeOptimization.resumeCompletenessSubtitle')} tone="emerald" />
        <StatCard label={t('resumeOptimization.currentCoverage')} value={formatPercent(data.current_resume_coverage)} subtitle={t('resumeOptimization.currentCoverageSubtitle')} tone="blue" />
        <StatCard label={t('resumeOptimization.estimatedImprovement')} value={formatPercent(data.estimated_coverage_improvement)} subtitle={t('resumeOptimization.estimatedImprovementSubtitle')} tone="amber" />
      </div>

      <SectionCard>
        <div className="mb-4">
          <h3 className="text-lg font-extrabold text-agent-primary">{t('resumeOptimization.metricContextTitle')}</h3>
          <p className="text-sm text-slate-500">{t('resumeOptimization.metricContextDescription')}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard title={t('resumeOptimization.resumeCompleteness')}>
            <div className="space-y-2 text-sm text-slate-600">
              <div>{t('resumeOptimization.basedOnContact')}</div>
              <div>{t('resumeOptimization.basedOnExperience')}</div>
              <div>{t('resumeOptimization.basedOnEducation')}</div>
              <div>{data.resume_completeness_score < 80 ? t('resumeOptimization.completenessNeedsAttention') : t('resumeOptimization.completenessHealthy')}</div>
            </div>
          </InfoCard>
          <InfoCard title={t('resumeOptimization.currentCoverage')}>
            <p className="text-sm leading-6 text-slate-600">
              {data.current_resume_coverage > 0
                ? t('resumeOptimization.coverageContextAvailable')
                : t('resumeOptimization.coverageContextUnavailable')}
            </p>
          </InfoCard>
          <InfoCard title={t('resumeOptimization.estimatedImprovement')}>
            <p className="text-sm leading-6 text-slate-600">
              {data.estimated_coverage_improvement > 0
                ? t('resumeOptimization.improvementContextAvailable')
                : t('resumeOptimization.improvementContextUnavailable')}
            </p>
          </InfoCard>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard label={t('resumeOptimization.resumeInsights')} title={t('resumeOptimization.strongestSkills')}>
          <SkillList items={strongestSkills} emptyTitle={t('resumeOptimization.noStrongestSkillsFound')} labels={labels} />
        </InfoCard>
        <InfoCard label={t('resumeOptimization.resumeInsights')} title={t('resumeOptimization.biggestSkillGaps')}>
          <SkillList items={biggestGaps} emptyTitle={t('resumeOptimization.noSkillGapsFound')} labels={labels} />
        </InfoCard>
        <InfoCard label={t('resumeOptimization.resumeInsights')} title={t('resumeOptimization.highestPrioritySkill')}>
          {highestPriority ? (
            <div>
              <div className="text-2xl font-black text-slate-950">{highestPriority.skill}</div>
              <div className="mt-2 text-sm text-slate-600">
                {t('resumeOptimization.prioritySummary')
                  .replace('{priority}', highestPriority.priority_score.toFixed(1))
                  .replace('{count}', formatNumber(highestPriority.missing_count))}
              </div>
              <ProgressBar className="mt-4" value={highestPriority.market_frequency} label={formatPercent(highestPriority.market_frequency)} tone="amber" />
            </div>
          ) : (
            <EmptyState title={t('resumeOptimization.noPrioritySkillFound')} message={t('resumeOptimization.skillPriorityUnavailable')} />
          )}
        </InfoCard>
      </div>

      <SectionCard>
        <div className="mb-5">
          <h3 className="text-lg font-extrabold text-agent-primary">{t('resumeOptimization.coverageImprovement')}</h3>
          <p className="text-sm text-slate-500">{t('resumeOptimization.coverageImprovementDescription')}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{t('resumeOptimization.currentCoverage')}</span>
              <span className="text-sm font-black text-slate-950">{formatPercent(data.current_resume_coverage)}</span>
            </div>
            <ProgressBar value={data.current_resume_coverage} tone="blue" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{t('resumeOptimization.estimatedCoverage')}</span>
              <span className="text-sm font-black text-slate-950">{formatPercent(estimatedCoverage)}</span>
            </div>
            <ProgressBar value={estimatedCoverage} tone="emerald" />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">{t('resumeOptimization.topSkillsAlreadyPresent')}</h3>
            <p className="text-sm text-slate-500">{t('resumeOptimization.topSkillsDescription')}</p>
          </div>
          <SkillList items={data.top_skills_already_present} emptyTitle={t('resumeOptimization.noPresentSkillsFound')} labels={labels} />
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">{t('resumeOptimization.mostFrequentMissingSkills')}</h3>
            <p className="text-sm text-slate-500">{t('resumeOptimization.missingSkillsDescription')}</p>
          </div>
          <MissingSkillsTable items={data.most_frequent_missing_skills} labels={labels} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">{t('resumeOptimization.skillsPriority')}</h3>
            <p className="text-sm text-slate-500">{t('resumeOptimization.skillsPriorityDescription')}</p>
          </div>
          <MissingSkillsTable items={data.skills_priority} labels={labels} />
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-agent-primary">{t('resumeOptimization.marketFrequency')}</h3>
            <p className="text-sm text-slate-500">{t('resumeOptimization.marketFrequencyDescription')}</p>
          </div>
          <MarketFrequency items={data.market_frequency} labels={labels} />
        </SectionCard>
      </div>
    </PageContainer>
  )
}
