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
import { getCandidateIntelligence } from '../lib/api'

type IntelligenceRecord = Record<string, unknown>

type FrequencyItem = {
  label: string
  count: number
  percent: number
}

type RankedItem = {
  name: string
  value: string
  detail: string
  rate: number
}

const NOT_AVAILABLE = 'Not Available'

const feedbackKeys = [
  ['Applied', ['applied', 'applied_count', 'applications']],
  ['Interview', ['interview', 'interviews', 'interview_count']],
  ['Offer', ['offer', 'offers', 'offer_count']],
  ['Rejected', ['rejected', 'rejected_count']],
  ['Saved for Later', ['saved_for_later', 'saved_later', 'saved_for_later_count']],
  ['Not Interested', ['not_interested', 'not_interested_count']]
] as const

function isRecord(value: unknown): value is IntelligenceRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function firstValue(source: unknown, keys: readonly string[]) {
  if (!isRecord(source)) return undefined
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function findFirst(source: unknown, keys: readonly string[], depth = 0): unknown {
  if (!isRecord(source) || depth > 6) return undefined
  const direct = firstValue(source, keys)
  if (direct !== undefined) return direct
  for (const value of Object.values(source)) {
    const found = findFirst(value, keys, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

function numberFrom(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace('%', ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function textFrom(value: unknown, fallback = NOT_AVAILABLE) {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function recordsFrom(source: unknown, keys: readonly string[]) {
  const value = findFirst(source, keys)
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    return Object.entries(value).map(([key, nested]) => (
      isRecord(nested) ? { name: key, ...nested } : { name: key, value: nested }
    ))
  }
  return []
}

function frequencyItems(source: unknown, keys: readonly string[]) {
  const value = findFirst(source, keys)
  const rows: FrequencyItem[] = []

  if (Array.isArray(value)) {
    value.forEach(item => {
      if (typeof item === 'string') {
        rows.push({ label: item, count: 1, percent: 0 })
        return
      }
      if (isRecord(item)) {
        rows.push({
          label: textFrom(firstValue(item, ['skill', 'name', 'label', 'technology'])),
          count: numberFrom(firstValue(item, ['frequency', 'count', 'total', 'value'])),
          percent: numberFrom(firstValue(item, ['percent', 'percentage', 'rate']))
        })
      }
    })
  } else if (isRecord(value)) {
    Object.entries(value).forEach(([label, count]) => {
      rows.push({ label, count: numberFrom(count), percent: 0 })
    })
  }

  const total = rows.reduce((sum, item) => sum + item.count, 0)
  return rows
    .map(item => ({ ...item, percent: item.percent || (total > 0 ? (item.count / total) * 100 : 0) }))
    .filter(item => item.label !== NOT_AVAILABLE)
    .sort((a, b) => b.count - a.count)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA').format(value)
}

function formatRate(value: number) {
  const normalized = value > 0 && value <= 1 ? value * 100 : value
  return `${normalized.toFixed(1)}%`
}

function formatMetric(value: unknown, kind: 'number' | 'rate' | 'duration' | 'text' = 'text') {
  if (kind === 'text') return textFrom(value)
  const number = numberFrom(value)
  if (!number) return NOT_AVAILABLE
  if (kind === 'rate') return formatRate(number)
  if (kind === 'duration') return `${number.toFixed(1)} days`
  return formatNumber(number)
}

function rateFromRecord(record: IntelligenceRecord, keys: readonly string[]) {
  return numberFrom(firstValue(record, keys))
}

function nameFromRecord(record: IntelligenceRecord) {
  return textFrom(firstValue(record, ['name', 'company', 'company_name', 'campaign', 'campaign_name', 'source', 'label', 'id']))
}

function displayEntity(value: unknown) {
  if (isRecord(value)) return nameFromRecord(value)
  return textFrom(value)
}

function rankedCompanies(data: IntelligenceRecord): RankedItem[] {
  const companyRecords = recordsFrom(data, ['best_companies', 'companies', 'company_performance'])
  const categories: Array<[string, string[], string[]]> = [
    ['Highest APPLY Rate', ['apply_rate', 'application_rate', 'applied_rate'], ['applied', 'applied_count', 'applications']],
    ['Highest INTERVIEW Rate', ['interview_rate'], ['interviews', 'interview_count']],
    ['Highest OFFER Rate', ['offer_rate'], ['offers', 'offer_count']]
  ]

  return categories.map(([label, rateKeys, countKeys]) => {
    const best = [...companyRecords].sort((a, b) => rateFromRecord(b, rateKeys) - rateFromRecord(a, rateKeys))[0]
    if (!best) return { name: label, value: NOT_AVAILABLE, detail: NOT_AVAILABLE, rate: 0 }
    const rate = rateFromRecord(best, rateKeys)
    return {
      name: label,
      value: nameFromRecord(best),
      detail: `${formatRate(rate)} - ${formatNumber(numberFrom(firstValue(best, countKeys)))} signals`,
      rate
    }
  })
}

function rankedCampaigns(data: IntelligenceRecord): RankedItem[] {
  return recordsFrom(data, ['best_campaigns', 'campaigns', 'campaign_performance'])
    .map(record => {
      const rate = rateFromRecord(record, ['performance_rate', 'success_rate', 'offer_rate', 'application_rate', 'apply_rate'])
      return {
        name: nameFromRecord(record),
        value: formatRate(rate),
        detail: textFrom(firstValue(record, ['reason', 'summary', 'description']), `${formatNumber(numberFrom(firstValue(record, ['opportunities', 'opportunity_count', 'feedbacks', 'feedback_count'])))} signals`),
        rate
      }
    })
    .sort((a, b) => b.rate - a.rate)
}

function recommendationsFrom(data: IntelligenceRecord) {
  const value = findFirst(data, ['recommendations', 'deterministic_recommendations', 'insights'])
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return item
    if (isRecord(item)) return textFrom(firstValue(item, ['recommendation', 'text', 'message', 'description', 'insight']))
    return NOT_AVAILABLE
  }).filter(item => item !== NOT_AVAILABLE)
}

function feedbackDistribution(data: IntelligenceRecord) {
  const distribution = findFirst(data, ['feedback_distribution', 'feedback', 'feedbacks', 'distribution'])
  const rows = feedbackKeys.map(([label, keys]) => ({
    label,
    count: numberFrom(findFirst(distribution, keys) ?? findFirst(data, keys))
  }))
  const total = rows.reduce((sum, item) => sum + item.count, 0)
  return rows.map(item => ({ ...item, percent: total > 0 ? (item.count / total) * 100 : 0 }))
}

function ProgressBar({ value, label }: { value: number, label?: string }) {
  const normalized = Math.max(0, Math.min(100, value > 0 && value <= 1 ? value * 100 : value))
  return (
    <div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${normalized}%` }} />
      </div>
      {label && <div className="mt-1 text-right text-xs font-bold tabular-nums text-slate-500">{label}</div>}
    </div>
  )
}

function FrequencySection({ title, description, items, showPercent = false }: { title: string, description: string, items: FrequencyItem[], showPercent?: boolean }) {
  return (
    <SectionCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <StatusBadge>{items.length}</StatusBadge>
      </div>
      {items.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} found`} message={NOT_AVAILABLE} />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 10).map(item => (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="font-bold text-slate-900">{item.label}</div>
                <div className="flex gap-2">
                  <StatusBadge>{formatNumber(item.count)}</StatusBadge>
                  {showPercent && <StatusBadge tone="blue">{formatRate(item.percent)}</StatusBadge>}
                </div>
              </div>
              <ProgressBar value={item.percent} />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function RankedSection({ title, description, items }: { title: string, description: string, items: RankedItem[] }) {
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} found`} message={NOT_AVAILABLE} />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.slice(0, 6).map(item => (
            <article className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={`${item.name}:${item.value}`}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.name}</div>
              <div className="mt-2 text-lg font-extrabold text-slate-950">{item.value}</div>
              <div className="mt-2 text-sm text-slate-600">{item.detail}</div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function RecommendationsSection({ recommendations }: { recommendations: string[] }) {
  return (
    <SectionCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">Recommendations</h3>
          <p className="text-sm text-slate-500">Deterministic recommendations produced by the backend.</p>
        </div>
        <StatusBadge>{recommendations.length}</StatusBadge>
      </div>
      {recommendations.length === 0 ? (
        <EmptyState title="No recommendations found" message={NOT_AVAILABLE} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.map((recommendation, index) => (
            <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4" key={`${recommendation}:${index}`}>
              <StatusBadge tone="emerald">Recommendation</StatusBadge>
              <p className="mt-3 text-sm font-semibold leading-6 text-emerald-900">{recommendation}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function FeedbackDistributionSection({ rows }: { rows: Array<{ label: string, count: number, percent: number }> }) {
  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">Feedback Distribution</h3>
        <p className="text-sm text-slate-500">Distribution of persisted candidate feedback signals.</p>
      </div>
      <div className="space-y-3">
        {rows.map(row => (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="font-bold text-slate-900">{row.label}</div>
              <StatusBadge>{formatNumber(row.count)}</StatusBadge>
            </div>
            <ProgressBar value={row.percent} label={row.count ? formatRate(row.percent) : NOT_AVAILABLE} />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export default function CareerIntelligencePage() {
  const [data, setData] = useState<IntelligenceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    getCandidateIntelligence()
      .then(response => {
        if (active) setData(isRecord(response) ? response : {})
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [reloadKey])

  const view = useMemo(() => {
    const source = data ?? {}
    const topSkills = frequencyItems(source, ['top_skills_found', 'top_skills', 'skills_found', 'skills'])
    const missingSkills = frequencyItems(source, ['most_missing_skills', 'skills_gap', 'missing_skills'])
    const companies = rankedCompanies(source)
    const campaigns = rankedCampaigns(source)
    const recommendations = recommendationsFrom(source)
    const feedbackRows = feedbackDistribution(source)

    return {
      topSkills,
      missingSkills,
      companies,
      campaigns,
      recommendations,
      feedbackRows,
      overview: {
        averageMatch: findFirst(source, ['average_match', 'average_match_score', 'avg_match_score']),
        averageTimeToFeedback: findFirst(source, ['average_time_to_feedback', 'avg_time_to_feedback', 'average_feedback_days']),
        mostEfficientCampaign: findFirst(source, ['most_efficient_campaign', 'efficient_campaign']),
        bestSource: findFirst(source, ['best_source', 'top_source']),
        totalInsights: findFirst(source, ['total_insights', 'insights_count']),
        totalRecommendations: findFirst(source, ['total_recommendations', 'recommendations_count'])
      }
    }
  }, [data])

  if (loading) {
    return <LoadingState title="Loading Career Intelligence" message="Fetching candidate intelligence from the Career Scout API." />
  }

  if (error) {
    return (
      <ErrorState
        title="Career Intelligence is unavailable"
        message={error}
        action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => setReloadKey(value => value + 1)} type="button">Try again</button>}
      />
    )
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow="Analytics"
        title="Career Intelligence"
        description="Candidate intelligence, deterministic insights, and feedback patterns from existing platform data."
        actions={<StatusBadge tone="blue">Candidate intelligence</StatusBadge>}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Average Match" value={formatMetric(view.overview.averageMatch, 'rate')} tone="blue" />
        <StatCard label="Average Time to Feedback" value={formatMetric(view.overview.averageTimeToFeedback, 'duration')} />
        <StatCard label="Most Efficient Campaign" value={displayEntity(view.overview.mostEfficientCampaign)} tone="emerald" />
        <StatCard label="Best Source" value={displayEntity(view.overview.bestSource)} tone="violet" />
        <StatCard label="Total Insights" value={formatMetric(view.overview.totalInsights, 'number')} />
        <StatCard label="Total Recommendations" value={formatMetric(view.overview.totalRecommendations, 'number')} tone="emerald" />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <FrequencySection title="Top Skills Found" description="Skills ordered by observed frequency." items={view.topSkills} />
        <FrequencySection title="Most Missing Skills" description="Skill gaps ordered by observed frequency." items={view.missingSkills} showPercent />
      </div>

      <RankedSection title="Best Companies" description="Companies with the strongest APPLY, INTERVIEW, and OFFER rates." items={view.companies} />
      <RankedSection title="Best Campaigns" description="Campaigns ordered by available performance signals." items={view.campaigns} />
      <RecommendationsSection recommendations={view.recommendations} />
      <FeedbackDistributionSection rows={view.feedbackRows} />
    </PageContainer>
  )
}
