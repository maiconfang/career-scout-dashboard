import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  InfoCard,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import {
  getOpportunity,
  getOpportunityExplainability,
  getOpportunityHistory,
  Opportunity,
  OpportunityExplainability,
  OpportunityFeedback,
  OpportunityHistoryEvent,
  recommendationDetails
} from '../lib/api'

const NOT_AVAILABLE = 'Not Available'

type DetailItem = {
  label: string
  value: string
  href?: string
}

type TimelineStatus = 'Recommendation' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Collected' | 'Calculated' | 'Completed' | 'Generated' | 'Feedback' | 'Not Available'

type TimelineEvent = {
  key: string
  occurredAt: string | null
  title: string
  description: string
  status: TimelineStatus
  icon: 'collected' | 'match' | 'ranking' | 'decision' | 'recommendation' | 'feedback'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return NOT_AVAILABLE
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function readable(value: string | null | undefined) {
  if (!value) return NOT_AVAILABLE
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_AVAILABLE
  return value > 0 && value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function firstString(...values: Array<string | null | undefined>) {
  return values.find(value => Boolean(value?.trim())) ?? NOT_AVAILABLE
}

function firstNumberFrom(source: unknown, keys: string[], depth = 0): number | null {
  if (!isRecord(source) || depth > 6) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  for (const value of Object.values(source)) {
    const found = firstNumberFrom(value, keys, depth + 1)
    if (found !== null) return found
  }
  return null
}

function latestByDate<T>(items: T[], dateValue: (item: T) => string | null | undefined) {
  return [...items].sort((a, b) => {
    const aTime = new Date(dateValue(a) ?? '').getTime() || 0
    const bTime = new Date(dateValue(b) ?? '').getTime() || 0
    return bTime - aTime
  })[0]
}

function statusTone(value: string | null | undefined): 'emerald' | 'amber' | 'red' | 'blue' | 'slate' {
  if (!value) return 'slate'
  const normalized = value.toUpperCase()
  if (['APPLY', 'APPLIED', 'OFFER', 'INTERVIEW', 'SELECTED'].includes(normalized)) return 'emerald'
  if (['CONSIDER', 'DEFER', 'SAVED_FOR_LATER'].includes(normalized)) return 'amber'
  if (['DO_NOT_APPLY', 'REJECTED', 'NOT_INTERESTED'].includes(normalized)) return 'red'
  return 'blue'
}

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {items.map(item => (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3" key={item.label}>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
            {item.href && item.value !== NOT_AVAILABLE
              ? <a className="text-brand-600 hover:text-brand-700" href={item.href} rel="noreferrer" target="_blank">{item.value}</a>
              : item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function SkillList({ skills, emptyLabel }: { skills: string[], emptyLabel: string }) {
  if (skills.length === 0) {
    return <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500">{emptyLabel}</div>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map(skill => (
        <StatusBadge key={skill}>{skill}</StatusBadge>
      ))}
    </div>
  )
}

function SearchPolicyBlock({ policy }: { policy: Record<string, unknown> | null }) {
  if (!policy || Object.keys(policy).length === 0) {
    return <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500">{NOT_AVAILABLE}</div>
  }

  return (
    <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
      {JSON.stringify(policy, null, 2)}
    </pre>
  )
}

function stringFromRecord(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  }
  return null
}

function recommendationFromExplainability(explainability: OpportunityExplainability | null) {
  if (!explainability) return NOT_AVAILABLE
  return firstString(
    stringFromRecord(explainability.recommendation_summary, ['recommendation', 'decision', 'action', 'status']),
    explainability.recommendation_reason
  )
}

function ExplainabilityFlow({ explainability }: { explainability: OpportunityExplainability | null }) {
  const steps = [
    {
      label: 'Matched Skills',
      value: explainability?.matched_skills?.length ? `${explainability.matched_skills.length} skills` : NOT_AVAILABLE,
      tone: 'emerald' as const
    },
    {
      label: 'Decision',
      value: firstString(explainability?.decision_reason),
      tone: statusTone(stringFromRecord(explainability?.recommendation_summary, ['decision']))
    },
    {
      label: 'Recommendation',
      value: recommendationFromExplainability(explainability),
      tone: statusTone(recommendationFromExplainability(explainability))
    },
    {
      label: 'Confidence',
      value: firstString(explainability?.confidence),
      tone: statusTone(explainability?.confidence)
    }
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => (
        <div className="relative rounded-xl border border-slate-100 bg-slate-50 p-4" key={step.label}>
          {index < steps.length - 1 && <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 bg-slate-200 md:block" />}
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{step.label}</div>
          <div className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-800">{step.value}</div>
          <StatusBadge className="mt-3" tone={step.tone}>{step.value === NOT_AVAILABLE ? NOT_AVAILABLE : 'Available'}</StatusBadge>
        </div>
      ))}
    </div>
  )
}

function RecommendationExplainabilitySection({
  explainability,
  loading
}: {
  explainability: OpportunityExplainability | null
  loading: boolean
}) {
  if (loading) {
    return (
      <SectionCard>
        <LoadingState title="Loading recommendation explainability" message="Fetching the structured explanation for this opportunity." />
      </SectionCard>
    )
  }

  if (!explainability) {
    return (
      <SectionCard>
        <EmptyState title="Recommendation Explainability" message="Not Available" />
      </SectionCard>
    )
  }

  const recommendation = recommendationFromExplainability(explainability)
  const decision = stringFromRecord(explainability.recommendation_summary, ['decision', 'action', 'status'])

  return (
    <SectionCard>
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-agent-primary">Recommendation Explainability</h3>
        <p className="text-sm text-slate-500">Structured explanation produced by the platform for this opportunity.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recommendation" value={readable(recommendation)} tone={statusTone(recommendation)} />
        <StatCard label="Confidence" value={readable(explainability.confidence)} tone={statusTone(explainability.confidence)} />
        <StatCard label="Match Score" value={formatScore(explainability.match_score)} tone="blue" />
        <StatCard label="Ranking Position" value={explainability.ranking_position ?? NOT_AVAILABLE} />
      </section>

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Visual Flow</div>
        <ExplainabilityFlow explainability={explainability} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InfoCard title="Matched Skills">
          <SkillList skills={explainability.matched_skills ?? []} emptyLabel={NOT_AVAILABLE} />
        </InfoCard>
        <InfoCard title="Missing Skills">
          <SkillList skills={explainability.missing_skills ?? []} emptyLabel={NOT_AVAILABLE} />
        </InfoCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InfoCard title="Planner Context">
          <DetailGrid items={[{ label: 'Planner Goal', value: firstString(explainability.planner_goal) }]} />
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Search Policy Summary</div>
            <SearchPolicyBlock policy={explainability.search_policy_summary ?? null} />
          </div>
        </InfoCard>
        <InfoCard title="Decision Explanation">
          <DetailGrid
            items={[
              { label: 'Decision', value: readable(decision) },
              { label: 'Decision Reason', value: firstString(explainability.decision_reason) }
            ]}
          />
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Recommendation Summary</div>
            <SearchPolicyBlock policy={explainability.recommendation_summary ?? null} />
          </div>
        </InfoCard>
      </div>
    </SectionCard>
  )
}

function decisionFromRecommendation(recommendation: unknown) {
  if (!isRecord(recommendation)) return null
  const direct = recommendation.decision
  if (typeof direct === 'string' && direct.trim()) return direct
  const decisionRecord = recommendation.decision_record
  if (isRecord(decisionRecord) && typeof decisionRecord.decision === 'string') return decisionRecord.decision
  const recommendedSet = recommendation.recommended_set_decision
  if (isRecord(recommendedSet) && typeof recommendedSet.decision === 'string') return recommendedSet.decision
  return null
}

function hasRecommendationSignal(recommendation: unknown) {
  return isRecord(recommendation) && Object.keys(recommendation).length > 0
}

function eventStatusFromFeedback(feedbackType: string | null | undefined): TimelineStatus {
  const normalized = feedbackType?.toUpperCase() ?? ''
  if (normalized.includes('OFFER')) return 'Offer'
  if (normalized.includes('INTERVIEW')) return 'Interview'
  if (normalized.includes('APPLIED') || normalized.includes('APPLICATION')) return 'Applied'
  if (normalized.includes('REJECT') || normalized.includes('NOT_INTERESTED')) return 'Rejected'
  return 'Feedback'
}

function eventStatusFromDecision(decision: string | null | undefined): TimelineStatus {
  const normalized = decision?.toUpperCase() ?? ''
  if (normalized === 'APPLY' || normalized === 'APPLIED') return 'Applied'
  if (normalized === 'DO_NOT_APPLY' || normalized === 'REJECTED') return 'Rejected'
  return 'Generated'
}

function timelineTone(status: TimelineStatus): 'emerald' | 'amber' | 'red' | 'blue' | 'slate' {
  if (status === 'Applied' || status === 'Interview' || status === 'Offer') return 'emerald'
  if (status === 'Recommendation' || status === 'Generated') return 'blue'
  if (status === 'Rejected') return 'red'
  if (status === 'Feedback') return 'amber'
  return 'slate'
}

function indicatorActive(indicator: 'Recommendation' | 'Applied' | 'Interview' | 'Offer' | 'Rejected', opportunity: Opportunity, events: OpportunityHistoryEvent[], feedback: OpportunityFeedback[]) {
  const feedbackTypes = feedback.map(item => item.feedback_type?.toUpperCase() ?? '')
  const decisions = [
    opportunity.recommendation_decision,
    opportunity.recommended_set?.decision,
    ...events.map(event => event.apply_decision),
    ...events.map(event => decisionFromRecommendation(event.recommendation))
  ].filter(Boolean).map(String).map(value => value.toUpperCase())
  const lifecycle = opportunity.lifecycle_status?.toUpperCase() ?? ''

  if (indicator === 'Recommendation') return Boolean(opportunity.recommended_at || opportunity.recommendation_decision || hasRecommendationSignal(opportunity.recommendation) || events.some(event => hasRecommendationSignal(event.recommendation)))
  if (indicator === 'Applied') return decisions.includes('APPLY') || decisions.includes('APPLIED') || feedbackTypes.some(value => value.includes('APPLIED') || value.includes('APPLICATION')) || lifecycle.includes('APPLIED')
  if (indicator === 'Interview') return feedbackTypes.some(value => value.includes('INTERVIEW')) || lifecycle.includes('INTERVIEW')
  if (indicator === 'Offer') return feedbackTypes.some(value => value.includes('OFFER')) || lifecycle.includes('OFFER')
  return decisions.includes('DO_NOT_APPLY') || decisions.includes('REJECTED') || feedbackTypes.some(value => value.includes('REJECT') || value.includes('NOT_INTERESTED')) || lifecycle.includes('REJECT')
}

function buildOpportunityTimeline(opportunity: Opportunity, events: OpportunityHistoryEvent[], feedback: OpportunityFeedback[]): TimelineEvent[] {
  const timeline: TimelineEvent[] = []
  const sortedEvents = [...events].sort((a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime())
  const sortedFeedback = [...feedback].sort((a, b) => new Date(a.feedback_at).getTime() - new Date(b.feedback_at).getTime())

  if (sortedEvents.length === 0 && opportunity.first_discovered_at) {
    timeline.push({
      key: 'opportunity-collected:first',
      occurredAt: opportunity.first_discovered_at,
      title: 'Opportunity Collected',
      description: firstString(opportunity.company, opportunity.title),
      status: 'Collected',
      icon: 'collected'
    })
  }

  sortedEvents.forEach((event, index) => {
    const eventLabel = firstString(event.search_keyword, event.search_family, event.campaign_id)
    timeline.push({
      key: `opportunity-collected:${event.sighting_id || index}`,
      occurredAt: event.collected_at,
      title: 'Opportunity Collected',
      description: eventLabel,
      status: 'Collected',
      icon: 'collected'
    })

    if (event.match_score !== null && event.match_score !== undefined) {
      timeline.push({
        key: `match-calculated:${event.sighting_id || index}`,
        occurredAt: event.collected_at,
        title: 'Match Calculated',
        description: `Match score ${formatScore(event.match_score)}`,
        status: 'Calculated',
        icon: 'match'
      })
    }

    if (event.ranking_position !== null && event.ranking_position !== undefined) {
      timeline.push({
        key: `ranking-completed:${event.sighting_id || index}`,
        occurredAt: event.collected_at,
        title: 'Ranking Completed',
        description: `Ranking position #${event.ranking_position}`,
        status: 'Completed',
        icon: 'ranking'
      })
    }

    const eventDecision = event.apply_decision ?? decisionFromRecommendation(event.recommendation)
    if (eventDecision) {
      timeline.push({
        key: `decision-generated:${event.sighting_id || index}`,
        occurredAt: event.collected_at,
        title: 'Decision Generated',
        description: readable(eventDecision),
        status: eventStatusFromDecision(eventDecision),
        icon: 'decision'
      })
    }

    if (hasRecommendationSignal(event.recommendation)) {
      timeline.push({
        key: `recommendation-generated:${event.sighting_id || index}`,
        occurredAt: event.collected_at,
        title: 'Recommendation Generated',
        description: firstString(decisionFromRecommendation(event.recommendation), event.apply_decision, event.rejection_reason),
        status: 'Recommendation',
        icon: 'recommendation'
      })
    }
  })

  if (sortedEvents.length === 0 && opportunity.match_score !== null) {
    timeline.push({
      key: 'match-calculated:current',
      occurredAt: opportunity.recommended_at ?? opportunity.last_discovered_at,
      title: 'Match Calculated',
      description: `Match score ${formatScore(opportunity.match_score)}`,
      status: 'Calculated',
      icon: 'match'
    })
  }

  if (sortedEvents.length === 0 && opportunity.ranking_position !== null) {
    timeline.push({
      key: 'ranking-completed:current',
      occurredAt: opportunity.recommended_at ?? opportunity.last_discovered_at,
      title: 'Ranking Completed',
      description: `Ranking position #${opportunity.ranking_position}`,
      status: 'Completed',
      icon: 'ranking'
    })
  }

  if (opportunity.recommendation_decision || opportunity.recommended_set?.decision) {
    const decision = opportunity.recommendation_decision ?? opportunity.recommended_set?.decision ?? null
    timeline.push({
      key: 'decision-generated:current',
      occurredAt: opportunity.recommended_at ?? opportunity.last_discovered_at,
      title: 'Decision Generated',
      description: readable(decision),
      status: eventStatusFromDecision(decision),
      icon: 'decision'
    })
  }

  if (opportunity.recommended_at || hasRecommendationSignal(opportunity.recommendation)) {
    timeline.push({
      key: 'recommendation-generated:current',
      occurredAt: opportunity.recommended_at ?? opportunity.last_discovered_at,
      title: 'Recommendation Generated',
      description: firstString(opportunity.recommendation_decision, opportunity.recommended_set?.decision, opportunity.decision_reason),
      status: 'Recommendation',
      icon: 'recommendation'
    })
  }

  sortedFeedback.forEach((item, index) => {
    timeline.push({
      key: `feedback:${item.feedback_id || index}`,
      occurredAt: item.feedback_at,
      title: index === 0 ? 'Feedback Added' : 'Feedback Updated',
      description: firstString(item.notes, item.feedback_type),
      status: eventStatusFromFeedback(item.feedback_type),
      icon: 'feedback'
    })
  })

  return timeline.sort((a, b) => {
    const aTime = new Date(a.occurredAt ?? '').getTime() || Number.MAX_SAFE_INTEGER
    const bTime = new Date(b.occurredAt ?? '').getTime() || Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })
}

function TimelineIcon({ icon }: { icon: TimelineEvent['icon'] }) {
  const common = 'h-4 w-4'
  if (icon === 'collected') {
    return <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24"><path d="M5 7h14M7 7v12h10V7M9 7a3 3 0 0 1 6 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" /></svg>
  }
  if (icon === 'match') {
    return <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" /></svg>
  }
  if (icon === 'ranking') {
    return <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24"><path d="M7 20V10M12 20V4M17 20v-7" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" /></svg>
  }
  if (icon === 'decision') {
    return <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24"><path d="M6 12l4 4 8-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" /></svg>
  }
  if (icon === 'recommendation') {
    return <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.1" /></svg>
  }
  return <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24"><path d="M6 5h12v14H6zM9 9h6M9 13h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" /></svg>
}

function OpportunityTimeline({ timeline, opportunity, events, feedback }: { timeline: TimelineEvent[], opportunity: Opportunity, events: OpportunityHistoryEvent[], feedback: OpportunityFeedback[] }) {
  const indicators: Array<'Recommendation' | 'Applied' | 'Interview' | 'Offer' | 'Rejected'> = ['Recommendation', 'Applied', 'Interview', 'Offer', 'Rejected']

  return (
    <SectionCard>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-agent-primary">Opportunity Timeline</h3>
          <p className="text-sm text-slate-500">Chronological history built from the persisted opportunity and feedback APIs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {indicators.map(indicator => (
            <StatusBadge key={indicator} tone={indicatorActive(indicator, opportunity, events, feedback) ? timelineTone(indicator) : 'slate'}>
              {indicator}
            </StatusBadge>
          ))}
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500">{NOT_AVAILABLE}</div>
      ) : (
        <div className="space-y-3">
          {timeline.map(item => (
            <InfoCard
              actions={<StatusBadge tone={timelineTone(item.status)}>{item.status}</StatusBadge>}
              className="shadow-sm"
              key={item.key}
              title={item.title}
            >
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                  <TimelineIcon icon={item.icon} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{formatDateTime(item.occurredAt)}</div>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-700">{item.description || NOT_AVAILABLE}</p>
                </div>
              </div>
            </InfoCard>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export default function OpportunityDetails() {
  const { opportunityId } = useParams()
  const id = Number(opportunityId)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [events, setEvents] = useState<OpportunityHistoryEvent[]>([])
  const [feedback, setFeedback] = useState<OpportunityFeedback[]>([])
  const [explainability, setExplainability] = useState<OpportunityExplainability | null>(null)
  const [explainabilityLoading, setExplainabilityLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setExplainabilityLoading(true)
    setError(null)
    setExplainability(null)

    if (!Number.isInteger(id) || id < 1) {
      setError('Invalid opportunity identifier.')
      setLoading(false)
      setExplainabilityLoading(false)
      return () => { active = false }
    }

    Promise.all([getOpportunity(id), getOpportunityHistory(id)])
      .then(([opportunityData, historyData]) => {
        if (!active) return
        setOpportunity(opportunityData)
        setEvents(historyData.events ?? [])
        setFeedback(historyData.feedback?.length ? historyData.feedback : opportunityData.feedback ?? [])
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    getOpportunityExplainability(id)
      .then(explainabilityData => {
        if (active) setExplainability(explainabilityData)
      })
      .catch(() => {
        if (active) setExplainability(null)
      })
      .finally(() => {
        if (active) setExplainabilityLoading(false)
      })

    return () => { active = false }
  }, [id])

  const view = useMemo(() => {
    if (!opportunity) return null

    const details = recommendationDetails(opportunity, events)
    const latestEvent = latestByDate(events, event => event.collected_at)
    const latestFeedback = latestByDate(feedback, item => item.feedback_at)
    const searchPolicy = isRecord(latestEvent?.search_policy) ? latestEvent.search_policy : null
    const rankingScore = firstNumberFrom(latestEvent?.recommendation, ['ranking_score', 'rankingScore', 'rank_score'])
      ?? firstNumberFrom(opportunity.recommendation, ['ranking_score', 'rankingScore', 'rank_score'])
    const source = firstString(latestFeedback?.source, latestEvent?.search_family, opportunity.apply_type)
    const collectedAt = latestEvent?.collected_at ?? opportunity.last_discovered_at ?? opportunity.first_discovered_at
    const currentFeedback = firstString(latestFeedback?.feedback_type, opportunity.lifecycle_status)

    return {
      details,
      latestEvent,
      latestFeedback,
      searchPolicy,
      rankingScore,
      source,
      collectedAt,
      currentFeedback,
      campaign: firstString(latestEvent?.campaign_id, opportunity.last_campaign_id),
      execution: NOT_AVAILABLE,
      recommendation: firstString(opportunity.recommendation_decision, opportunity.recommended_set?.decision, details.decision),
      matchExplanation: firstString(details.reason, opportunity.decision_reason),
      skillsFound: details.matchedSkills,
      skillsMissing: details.missingSkills,
      timeline: buildOpportunityTimeline(opportunity, events, feedback)
    }
  }, [events, feedback, opportunity])

  async function copyUrl() {
    if (!opportunity?.job_url) return
    await navigator.clipboard.writeText(opportunity.job_url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return <LoadingState title="Loading opportunity" message="Fetching opportunity details and recommendation evidence." />
  }

  if (error) {
    return (
      <ErrorState
        title="Opportunity unavailable"
        message={error}
        action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/repository">Back to repository</Link>}
      />
    )
  }

  if (!opportunity || !view) {
    return <EmptyState title="Opportunity not found" message="The requested opportunity was not returned by the current API response." />
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow="Opportunity Details"
        title={firstString(opportunity.title)}
        description={[opportunity.company, opportunity.location].filter(Boolean).join(' - ') || NOT_AVAILABLE}
        actions={<StatusBadge tone={statusTone(view.details.decision)}>{readable(view.details.decision)}</StatusBadge>}
      />

      <SectionCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-agent-primary">Summary</h3>
            <p className="text-sm text-slate-500">Original opportunity identity and collection metadata.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/repository">Repository</Link>
            <a className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 aria-disabled:pointer-events-none aria-disabled:opacity-40" aria-disabled={!opportunity.job_url} href={opportunity.job_url || undefined} rel="noreferrer" target="_blank">Open Opportunity</a>
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={!opportunity.job_url} onClick={copyUrl} type="button">{copied ? 'Copied!' : 'Copy URL'}</button>
          </div>
        </div>
        <DetailGrid
          items={[
            { label: 'Title', value: firstString(opportunity.title) },
            { label: 'Company', value: firstString(opportunity.company) },
            { label: 'Location', value: firstString(opportunity.location) },
            { label: 'Source', value: view.source },
            { label: 'URL', value: firstString(opportunity.job_url), href: opportunity.job_url || undefined },
            { label: 'Collected At', value: formatDateTime(view.collectedAt) }
          ]}
        />
      </SectionCard>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Decision" value={readable(view.details.decision)} tone={statusTone(view.details.decision)} />
        <StatCard label="Recommendation" value={readable(view.recommendation)} tone={statusTone(view.recommendation)} />
        <StatCard label="Match Score" value={formatScore(view.details.matchScore)} tone="blue" />
        <StatCard label="Ranking Score" value={formatScore(view.rankingScore)} />
      </section>

      <RecommendationExplainabilitySection
        explainability={explainability}
        loading={explainabilityLoading}
      />

      <OpportunityTimeline timeline={view.timeline} opportunity={opportunity} events={events} feedback={feedback} />

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-agent-primary">Campaign</h3>
              <p className="text-sm text-slate-500">Campaign and discovery context available from opportunity history.</p>
            </div>
            <DetailGrid
              items={[
                { label: 'Campaign', value: view.campaign },
                { label: 'Execution', value: view.execution }
              ]}
            />
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Search Policy</div>
              <SearchPolicyBlock policy={view.searchPolicy} />
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-agent-primary">Skills</h3>
              <p className="text-sm text-slate-500">Skill evidence recorded by the recommendation pipeline.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Skills Found</div>
                <SkillList skills={view.skillsFound} emptyLabel={NOT_AVAILABLE} />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Skills Missing</div>
                <SkillList skills={view.skillsMissing} emptyLabel={NOT_AVAILABLE} />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Match Explanation</div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{view.matchExplanation}</div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-agent-primary">Feedback</h3>
              <p className="text-sm text-slate-500">Latest feedback signal persisted for this opportunity.</p>
            </div>
            <DetailGrid
              items={[
                { label: 'Feedback atual', value: readable(view.currentFeedback) },
                { label: 'Notes', value: firstString(view.latestFeedback?.notes) },
                { label: 'Data do feedback', value: formatDateTime(view.latestFeedback?.feedback_at) }
              ]}
            />
          </SectionCard>

          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-agent-primary">Actions</h3>
              <p className="text-sm text-slate-500">Read-only actions for the original opportunity URL.</p>
            </div>
            <div className="grid gap-2">
              <a className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 aria-disabled:pointer-events-none aria-disabled:opacity-40" aria-disabled={!opportunity.job_url} href={opportunity.job_url || undefined} rel="noreferrer" target="_blank">Open Opportunity</a>
              <button className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={!opportunity.job_url} onClick={copyUrl} type="button">{copied ? 'Copied!' : 'Copy URL'}</button>
            </div>
          </SectionCard>
        </aside>
      </div>
    </PageContainer>
  )
}
