import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OpportunityStatusBadge from '../components/OpportunityStatusBadge'
import PageState from '../components/PageState'
import {
  listOpportunities,
  Opportunity,
  recommendationDetails
} from '../lib/api'

const PAGE_SIZE = 50

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatScore(value: number) {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 4
  }).format(value)
}

function readable(value?: string | null) {
  if (!value) return 'Not available'
  return value.replace(/_/g, ' ').replace(/\//g, ' / ').toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())
}

function confidenceClass(confidence?: string | null) {
  if (confidence === 'HIGH') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (confidence === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

export default function OpportunityInbox() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [confidence, setConfidence] = useState('')
  const [occupationType, setOccupationType] = useState('')
  const [compatibility, setCompatibility] = useState('')
  const [company, setCompany] = useState('')
  const [workMode, setWorkMode] = useState('')
  const [minMatchScore, setMinMatchScore] = useState('')
  const [postedFrom, setPostedFrom] = useState('')
  const [postedTo, setPostedTo] = useState('')
  const [sort, setSort] = useState('match_score:desc')
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const [sortBy, order] = sort.split(':')
    listOpportunities({
      q: query,
      recommendation,
      confidence,
      occupation_type: occupationType,
      compatibility,
      company,
      work_mode: workMode,
      min_match_score: minMatchScore === '' ? undefined : Number(minMatchScore),
      posted_from: postedFrom,
      posted_to: postedTo,
      sort_by: sortBy as 'match_score' | 'recommendation' | 'confidence' | 'job_posted_at' | 'ranking_position',
      order: order as 'asc' | 'desc',
      limit: PAGE_SIZE,
      offset
    })
      .then(response => {
        if (!active) return
        setOpportunities(response.items)
        setReturned(response.returned)
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [query, recommendation, confidence, occupationType, compatibility, company, workMode, minMatchScore, postedFrom, postedTo, sort, offset, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setQuery(draftQuery.trim())
  }

  function resetFilters() {
    setDraftQuery('')
    setQuery('')
    setRecommendation('')
    setConfidence('')
    setOccupationType('')
    setCompatibility('')
    setCompany('')
    setWorkMode('')
    setMinMatchScore('')
    setPostedFrom('')
    setPostedTo('')
    setSort('match_score:desc')
    setOffset(0)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opportunity Inbox</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">Official recommendation queue</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Every card is a traceable Recommended Set decision. Recommendation is the verdict; match score is supporting evidence, not a pass/fail percentage.</p>
          </div>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">Recommended Set · one card per opportunity</div>
        </div>

        <form className="mt-5 space-y-3 border-t border-slate-100 pt-4" onSubmit={submitSearch}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              aria-label="Search opportunities"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 lg:col-span-2"
              onChange={event => setDraftQuery(event.target.value)}
              placeholder="Search title, company, description"
              value={draftQuery}
            />
            <select
              aria-label="Filter by recommendation"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              onChange={event => { setOffset(0); setRecommendation(event.target.value) }}
              value={recommendation}
            >
              <option value="">All recommendations</option>
              <option value="APPLY">Apply</option>
              <option value="CONSIDER">Consider</option>
              <option value="DO_NOT_APPLY">Do not apply</option>
            </select>
            <select aria-label="Filter by confidence" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setConfidence(event.target.value) }} value={confidence}>
              <option value="">All confidence levels</option><option value="HIGH">High confidence</option><option value="MEDIUM">Medium confidence</option><option value="LOW">Low confidence</option>
            </select>
            <input aria-label="Filter by occupation type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => { setOffset(0); setOccupationType(event.target.value) }} placeholder="Occupation type" value={occupationType} />
            <select aria-label="Filter by compatibility" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setCompatibility(event.target.value) }} value={compatibility}>
              <option value="">All compatibility</option><option value="EXACT">Exact</option><option value="COMPATIBLE">Compatible</option><option value="ADJACENT">Adjacent</option><option value="AMBIGUOUS">Ambiguous</option>
            </select>
            <input aria-label="Filter by company" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => { setOffset(0); setCompany(event.target.value) }} placeholder="Company" value={company} />
            <select aria-label="Filter by work mode" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setWorkMode(event.target.value) }} value={workMode}>
              <option value="">All work modes</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">Onsite</option>
            </select>
            <input aria-label="Minimum match score" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" max="100" min="0" onChange={event => { setOffset(0); setMinMatchScore(event.target.value) }} placeholder="Minimum match score" step="0.1" type="number" value={minMatchScore} />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">Posted from<input aria-label="Posted from" className="min-w-0 flex-1 text-sm text-slate-700 outline-none" onChange={event => { setOffset(0); setPostedFrom(event.target.value) }} type="date" value={postedFrom} /></label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">Posted to<input aria-label="Posted to" className="min-w-0 flex-1 text-sm text-slate-700 outline-none" onChange={event => { setOffset(0); setPostedTo(event.target.value) }} type="date" value={postedTo} /></label>
            <select aria-label="Sort opportunities" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setSort(event.target.value) }} value={sort}>
              <option value="match_score:desc">Match score · highest</option><option value="recommendation:desc">Recommendation · priority</option><option value="confidence:desc">Confidence · highest</option><option value="job_posted_at:desc">Job date · newest</option><option value="ranking_position:asc">Ranking position · first</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={resetFilters} type="button">Clear filters</button>
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">Search</button>
          </div>
        </form>
      </section>

      {loading && <PageState title="Loading opportunities" message="Fetching the latest Career Scout opportunities." />}

      {!loading && error && (
        <PageState
          title="Career Scout API is unavailable"
          message={error}
          action={(
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>
              Try again
            </button>
          )}
        />
      )}

      {!loading && !error && opportunities.length === 0 && (
        <PageState title="No opportunities found" message="Try a different search or recommendation filter." />
      )}

      {!loading && !error && opportunities.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing {offset + 1}–{offset + returned}</span>
            <span>Official Recommended Set queue</span>
          </div>

          <div className="space-y-3">
            {opportunities.map(opportunity => {
              const details = recommendationDetails(opportunity)
              return (
                <article key={opportunity.opportunity_id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <OpportunityStatusBadge status={opportunity.lifecycle_status} decision={details.decision} />
                        {details.confidence && (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${confidenceClass(details.confidence)}`}>
                            {readable(details.confidence)} confidence
                          </span>
                        )}
                        {details.matchScore !== null && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            Match evidence · {formatScore(details.matchScore)}
                          </span>
                        )}
                        {details.rankingPosition !== null && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Rank #{details.rankingPosition}</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-950">{opportunity.title}</h3>
                      <div className="mt-1 text-sm font-medium text-slate-700">{opportunity.company || 'Company not provided'}</div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {opportunity.location && <span>{opportunity.location}</span>}
                        {opportunity.work_mode && <span>{opportunity.work_mode}</span>}
                        {opportunity.employment_type && <span>{opportunity.employment_type}</span>}
                        {opportunity.job_posted_at && <span>Posted {formatDate(opportunity.job_posted_at)}</span>}
                        <span>Updated {formatDate(opportunity.last_discovered_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {opportunity.occupation_type && <span className="rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-700">{readable(opportunity.occupation_type)}</span>}
                        {opportunity.occupation_compatibility && <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">{readable(opportunity.occupation_compatibility)}</span>}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {details.reason ?? opportunity.description ?? 'No description was provided.'}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Link
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        to={`/opportunities/${opportunity.opportunity_id}`}
                      >
                        View details
                      </Link>
                      {opportunity.job_url && (
                        <a
                          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                          href={opportunity.job_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={offset === 0}
              onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}
            >
              Previous
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={returned < PAGE_SIZE}
              onClick={() => setOffset(value => value + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
