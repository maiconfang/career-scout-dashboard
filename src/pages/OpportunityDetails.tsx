import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import OpportunityStatusBadge from '../components/OpportunityStatusBadge'
import PageState from '../components/PageState'
import {
  getOpportunity,
  getOpportunityHistory,
  Opportunity,
  OpportunityHistoryEvent,
  recommendationDetails
} from '../lib/api'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'long' }).format(new Date(value))
}

export default function OpportunityDetails() {
  const { opportunityId } = useParams()
  const id = Number(opportunityId)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [events, setEvents] = useState<OpportunityHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError('Invalid opportunity identifier.')
      setLoading(false)
      return
    }

    Promise.all([getOpportunity(id), getOpportunityHistory(id)])
      .then(([opportunityData, historyData]) => {
        setOpportunity(opportunityData)
        setEvents(historyData.events)
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageState title="Loading opportunity" message="Fetching opportunity details and recommendation evidence." />
  if (error || !opportunity) {
    return (
      <PageState
        title="Opportunity unavailable"
        message={error ?? 'The requested opportunity was not found.'}
        action={<Link className="text-sm font-semibold text-brand-500" to="/">Return to Opportunity Inbox</Link>}
      />
    )
  }

  const details = recommendationDetails(opportunity, events)
  const hasRecommendation = Boolean(
    details.reason || details.decision || details.matchedSkills.length || details.missingSkills.length
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link className="inline-flex text-sm font-semibold text-brand-500 hover:text-brand-700" to="/">← Back to Opportunity Inbox</Link>

      <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <OpportunityStatusBadge status={opportunity.lifecycle_status} decision={details.decision} />
              {details.matchScore !== null && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {Math.round(details.matchScore)}% match
                </span>
              )}
              {details.confidence && <span className="text-xs text-slate-500">{details.confidence} confidence</span>}
            </div>
            <h2 className="mt-3 text-3xl font-extrabold text-agent-primary">{opportunity.title}</h2>
            <div className="mt-2 text-lg font-semibold text-slate-700">{opportunity.company || 'Company not provided'}</div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {opportunity.location && <span>{opportunity.location}</span>}
              {opportunity.work_mode && <span>{opportunity.work_mode}</span>}
              {opportunity.employment_type && <span>{opportunity.employment_type}</span>}
              {opportunity.salary && <span>{opportunity.salary}</span>}
            </div>
          </div>

          {opportunity.job_url && (
            <a
              className="shrink-0 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              href={opportunity.job_url}
              rel="noreferrer"
              target="_blank"
            >
              Open on LinkedIn
            </a>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommendation</div>
        <h3 className="mt-1 text-xl font-extrabold text-agent-primary">Why Career Scout recommends this opportunity</h3>

        {hasRecommendation ? (
          <div className="mt-4 space-y-5">
            {details.reason && <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{details.reason}</p>}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-100 bg-accent-50 p-4">
                <div className="text-sm font-bold text-emerald-800">Matched skills</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {details.matchedSkills.length
                    ? details.matchedSkills.map(skill => <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700" key={skill}>{skill}</span>)
                    : <span className="text-sm text-slate-600">No matched skills were recorded.</span>}
                </div>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <div className="text-sm font-bold text-amber-800">Skills to review</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {details.missingSkills.length
                    ? details.missingSkills.map(skill => <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700" key={skill}>{skill}</span>)
                    : <span className="text-sm text-slate-600">No missing skills were recorded.</span>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            Career Scout has discovered this opportunity but has not recorded a recommendation yet.
          </p>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-card">
          <h3 className="text-lg font-extrabold text-agent-primary">Job description</h3>
          <div className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
            {opportunity.description || 'No description was provided.'}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-slate-900">Opportunity activity</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">First found</dt><dd className="font-medium text-slate-700">{formatDate(opportunity.first_discovered_at)}</dd></div>
              <div><dt className="text-xs text-slate-500">Last found</dt><dd className="font-medium text-slate-700">{formatDate(opportunity.last_discovered_at)}</dd></div>
              <div><dt className="text-xs text-slate-500">Campaigns</dt><dd className="font-medium text-slate-700">{opportunity.campaign_count}</dd></div>
              <div><dt className="text-xs text-slate-500">Appearances</dt><dd className="font-medium text-slate-700">{opportunity.appearance_count}</dd></div>
              {details.rankingPosition !== null && <div><dt className="text-xs text-slate-500">Best available rank</dt><dd className="font-medium text-slate-700">#{details.rankingPosition}</dd></div>}
            </dl>
          </div>

          {(opportunity.skills.length > 0 || opportunity.technologies.length > 0) && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-900">Role skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...new Set([...opportunity.skills, ...opportunity.technologies])].map(skill => (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700" key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
