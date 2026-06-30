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
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value))
}

export default function OpportunityInbox() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listOpportunities({
      q: query,
      lifecycle_status: status,
      sort_by: 'match_score',
      order: 'desc',
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
  }, [query, status, offset, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setQuery(draftQuery.trim())
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opportunity Inbox</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">Opportunities found by Career Scout</h2>
            <p className="mt-2 text-sm text-slate-600">Review recommendations, inspect the evidence, and open the original LinkedIn posting.</p>
          </div>

          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitSearch}>
            <input
              aria-label="Search opportunities"
              className="min-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              onChange={event => setDraftQuery(event.target.value)}
              placeholder="Search title, company, description"
              value={draftQuery}
            />
            <select
              aria-label="Filter by recommendation"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              onChange={event => {
                setOffset(0)
                setStatus(event.target.value)
              }}
              value={status}
            >
              <option value="">All opportunities</option>
              <option value="APPLY_RECOMMENDED">Apply recommended</option>
              <option value="SELECTED">Selected</option>
              <option value="DISCOVERED">Not evaluated</option>
            </select>
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
              Search
            </button>
          </form>
        </div>
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
            <span>Highest match scores first</span>
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
                        {details.matchScore !== null && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {Math.round(details.matchScore)}% match
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-950">{opportunity.title}</h3>
                      <div className="mt-1 text-sm font-medium text-slate-700">{opportunity.company || 'Company not provided'}</div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {opportunity.location && <span>{opportunity.location}</span>}
                        {opportunity.work_mode && <span>{opportunity.work_mode}</span>}
                        {opportunity.employment_type && <span>{opportunity.employment_type}</span>}
                        <span>Updated {formatDate(opportunity.last_discovered_at)}</span>
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
