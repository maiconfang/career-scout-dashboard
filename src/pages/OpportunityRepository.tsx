import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageState from '../components/PageState'
import {
  Campaign,
  listCampaigns,
  listOpportunityRepository,
  OpportunityRepositoryQuery,
  RepositoryOpportunity
} from '../lib/api'

const PAGE_SIZE = 25
const initialFilters: OpportunityRepositoryQuery = {
  q: '', recommendation: '', decision: '', company: '', role_type: '',
  work_mode: '', employment_type: '', search_family: '', campaign_id: '',
  sort_by: 'last_discovered_at', order: 'desc'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value))
}

function readable(value: string | null) {
  if (!value) return 'Not available'
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function recommendationClass(status: string) {
  if (status === 'RECOMMENDED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'REJECTED' || status === 'NOT_RECOMMENDED') return 'bg-red-50 text-red-700'
  if (status === 'ALIGNED') return 'bg-blue-50 text-blue-700'
  return 'bg-slate-100 text-slate-600'
}

export default function OpportunityRepository() {
  const [opportunities, setOpportunities] = useState<RepositoryOpportunity[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [draftFilters, setDraftFilters] = useState<OpportunityRepositoryQuery>(initialFilters)
  const [filters, setFilters] = useState<OpportunityRepositoryQuery>(initialFilters)
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    listCampaigns(100, 0).then(response => setCampaigns(response.items)).catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listOpportunityRepository({ ...filters, limit: PAGE_SIZE, offset })
      .then(response => {
        if (!active) return
        setOpportunities(response.items)
        setReturned(response.returned)
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, offset, reloadKey])

  function updateFilter(name: keyof OpportunityRepositoryQuery, value: string) {
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
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opportunity Repository</div>
        <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">All persisted opportunities</h2>
        <p className="mt-2 text-sm text-slate-600">Audit collected, rejected, aligned, recommended, and recurring opportunities without changing the Opportunity Inbox.</p>

        <form className="mt-5 space-y-3" onSubmit={applyFilters}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input aria-label="Search repository" className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:col-span-2" onChange={event => updateFilter('q', event.target.value)} placeholder="Search title, company, description" value={draftFilters.q} />
            <input aria-label="Filter company" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('company', event.target.value)} placeholder="Company" value={draftFilters.company} />
            <select aria-label="Filter recommendation" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('recommendation', event.target.value)} value={draftFilters.recommendation}>
              <option value="">All recommendation states</option><option value="RECOMMENDED">Recommended</option><option value="ALIGNED">Aligned</option><option value="REJECTED">Rejected</option><option value="NOT_RECOMMENDED">Not recommended</option><option value="NOT_EVALUATED">Not evaluated</option>
            </select>
            <select aria-label="Filter decision" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('decision', event.target.value)} value={draftFilters.decision}>
              <option value="">All decisions</option><option value="APPLY">Apply</option><option value="CONSIDER">Consider</option><option value="DO_NOT_APPLY">Do not apply</option>
            </select>
            <select aria-label="Filter role type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('role_type', event.target.value)} value={draftFilters.role_type}>
              <option value="">All role types</option><option value="QA_AUTOMATION">QA Automation</option><option value="SOFTWARE_ENGINEERING">Software Engineering</option><option value="AI_ENGINEER">AI Engineer</option><option value="DATA_ENGINEER">Data Engineer</option><option value="DEVOPS_ENGINEER">DevOps Engineer</option><option value="UNKNOWN">Unknown</option>
            </select>
            <select aria-label="Filter work mode" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('work_mode', event.target.value)} value={draftFilters.work_mode}>
              <option value="">All work modes</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">Onsite</option><option value="UNKNOWN">Unknown</option>
            </select>
            <select aria-label="Filter employment type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('employment_type', event.target.value)} value={draftFilters.employment_type}>
              <option value="">All employment types</option><option value="FULL_TIME">Full time</option><option value="CONTRACT">Contract</option><option value="PART_TIME">Part time</option><option value="TEMPORARY">Temporary</option><option value="UNKNOWN">Unknown</option>
            </select>
            <select aria-label="Filter search family" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('search_family', event.target.value)} value={draftFilters.search_family}>
              <option value="">All search families</option><option value="SDET">SDET</option><option value="QA_AUTOMATION">QA Automation</option><option value="QUALITY_ENGINEERING">Quality Engineering</option><option value="TEST_ENGINEERING">Test Engineering</option>
            </select>
            <select aria-label="Filter campaign" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('campaign_id', event.target.value)} value={draftFilters.campaign_id}>
              <option value="">All campaigns</option>
              {campaigns.map(campaign => <option key={campaign.campaign_id} value={campaign.campaign_id}>{formatDate(campaign.campaign_date)} · {campaign.campaign_id.slice(0, 8)}</option>)}
            </select>
            <select aria-label="Sort repository" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => {
              const [sort_by, order] = event.target.value.split(':')
              setDraftFilters(current => ({ ...current, sort_by: sort_by as OpportunityRepositoryQuery['sort_by'], order: order as OpportunityRepositoryQuery['order'] }))
            }} value={`${draftFilters.sort_by}:${draftFilters.order}`}>
              <option value="last_discovered_at:desc">Last discovered · newest</option><option value="first_discovered_at:desc">First discovered · newest</option><option value="match_score:desc">Match score · highest</option><option value="company:asc">Company · A–Z</option><option value="title:asc">Title · A–Z</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">Apply filters</button>
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={clearFilters} type="button">Clear</button>
          </div>
        </form>
      </section>

      {loading && <PageState title="Loading repository" message="Fetching persisted opportunities from the Career Scout API." />}
      {!loading && error && <PageState title="Opportunity Repository is unavailable" message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>Try again</button>} />}
      {!loading && !error && opportunities.length === 0 && <PageState title="No opportunities found" message="No persisted opportunities match the selected filters." />}

      {!loading && !error && opportunities.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {offset + 1}–{offset + returned}</span><span>Complete persisted repository</span></div>
          <div className="space-y-3">
            {opportunities.map(opportunity => (
              <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-card" key={opportunity.opportunity_id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${recommendationClass(opportunity.recommendation_status)}`}>{readable(opportunity.recommendation_status)}</span>
                      {opportunity.decision && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{readable(opportunity.decision)}</span>}
                      {opportunity.match_score !== null && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{Math.round(opportunity.match_score)}% match</span>}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-950">{opportunity.title}</h3>
                    <div className="mt-1 text-sm font-medium text-slate-700">{opportunity.company || 'Company not provided'}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {opportunity.location && <span>{opportunity.location}</span>}{opportunity.salary && <span>{opportunity.salary}</span>}{opportunity.work_mode && <span>{readable(opportunity.work_mode)}</span>}{opportunity.employment_type && <span>{readable(opportunity.employment_type)}</span>}<span>{readable(opportunity.role_type)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <div><span className="font-semibold text-slate-800">Confidence:</span> {readable(opportunity.decision_confidence)}</div><div><span className="font-semibold text-slate-800">Search family:</span> {readable(opportunity.search_family)}</div><div><span className="font-semibold text-slate-800">First discovered:</span> {formatDate(opportunity.first_discovered_at)}</div><div><span className="font-semibold text-slate-800">Last discovered:</span> {formatDate(opportunity.last_discovered_at)}</div><div><span className="font-semibold text-slate-800">Campaigns:</span> {opportunity.campaign_count}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/opportunities/${opportunity.opportunity_id}`}>View details</Link>
                    {opportunity.job_url && <a className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" href={opportunity.job_url} rel="noreferrer" target="_blank">Open LinkedIn</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>Previous</button><button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}
