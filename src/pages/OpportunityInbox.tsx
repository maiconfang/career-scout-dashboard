import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OpportunityStatusBadge from '../components/OpportunityStatusBadge'
import {
  EmptyState,
  ErrorState,
  FormSection,
  InfoAlert,
  LoadingState,
  PageContainer,
  SearchToolbar,
  SectionCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
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

function readable(value: string | null | undefined, notAvailable: string) {
  if (!value) return notAvailable
  return value.replace(/_/g, ' ').replace(/\//g, ' / ').toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())
}

function confidenceTone(confidence?: string | null): 'emerald' | 'amber' | 'slate' {
  if (confidence === 'HIGH') return 'emerald'
  if (confidence === 'MEDIUM') return 'amber'
  return 'slate'
}

export default function OpportunityInbox() {
  const { t } = useLanguage()
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
    <PageContainer className="space-y-5" size="lg">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('opportunityInbox.eyebrow')}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('opportunityInbox.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('opportunityInbox.description')}</p>
          </div>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">{t('opportunityInbox.recommendedSet')}</div>
        </div>

        <SearchToolbar className="mt-5 border-t border-slate-100 pt-4 shadow-none">
          <form className="w-full space-y-3" onSubmit={submitSearch}>
          <FormSection className="sm:grid-cols-2 lg:grid-cols-4">
            <input
              aria-label={t('opportunityInbox.searchAria')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 lg:col-span-2"
              onChange={event => setDraftQuery(event.target.value)}
              placeholder={t('opportunityInbox.searchPlaceholder')}
              value={draftQuery}
            />
            <select
              aria-label={t('opportunityInbox.filterRecommendationAria')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              onChange={event => { setOffset(0); setRecommendation(event.target.value) }}
              value={recommendation}
            >
              <option value="">{t('opportunityInbox.allRecommendations')}</option>
              <option value="APPLY">{t('opportunityStatus.apply')}</option>
              <option value="CONSIDER">{t('opportunityStatus.consider')}</option>
              <option value="DO_NOT_APPLY">{t('opportunityStatus.doNotApply')}</option>
            </select>
            <select aria-label={t('opportunityInbox.filterConfidenceAria')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setConfidence(event.target.value) }} value={confidence}>
              <option value="">{t('opportunityInbox.allConfidenceLevels')}</option><option value="HIGH">{t('opportunityInbox.highConfidence')}</option><option value="MEDIUM">{t('opportunityInbox.mediumConfidence')}</option><option value="LOW">{t('opportunityInbox.lowConfidence')}</option>
            </select>
            <input aria-label={t('opportunityInbox.filterOccupationTypeAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => { setOffset(0); setOccupationType(event.target.value) }} placeholder={t('opportunityInbox.occupationType')} value={occupationType} />
            <select aria-label={t('opportunityInbox.filterCompatibilityAria')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setCompatibility(event.target.value) }} value={compatibility}>
              <option value="">{t('opportunityInbox.allCompatibility')}</option><option value="EXACT">{t('opportunityInbox.exact')}</option><option value="COMPATIBLE">{t('opportunityInbox.compatible')}</option><option value="ADJACENT">{t('opportunityInbox.adjacent')}</option><option value="AMBIGUOUS">{t('opportunityInbox.ambiguous')}</option>
            </select>
            <input aria-label={t('opportunityInbox.filterCompanyAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => { setOffset(0); setCompany(event.target.value) }} placeholder={t('opportunityInbox.company')} value={company} />
            <select aria-label={t('opportunityInbox.filterWorkModeAria')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setWorkMode(event.target.value) }} value={workMode}>
              <option value="">{t('opportunityInbox.allWorkModes')}</option><option value="REMOTE">{t('opportunityInbox.remote')}</option><option value="HYBRID">{t('opportunityInbox.hybrid')}</option><option value="ONSITE">{t('opportunityInbox.onsite')}</option>
            </select>
            <input aria-label={t('opportunityInbox.minimumMatchScore')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" max="100" min="0" onChange={event => { setOffset(0); setMinMatchScore(event.target.value) }} placeholder={t('opportunityInbox.minimumMatchScore')} step="0.1" type="number" value={minMatchScore} />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">{t('opportunityInbox.postedFrom')}<input aria-label={t('opportunityInbox.postedFrom')} className="min-w-0 flex-1 text-sm text-slate-700 outline-none" onChange={event => { setOffset(0); setPostedFrom(event.target.value) }} type="date" value={postedFrom} /></label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">{t('opportunityInbox.postedTo')}<input aria-label={t('opportunityInbox.postedTo')} className="min-w-0 flex-1 text-sm text-slate-700 outline-none" onChange={event => { setOffset(0); setPostedTo(event.target.value) }} type="date" value={postedTo} /></label>
            <select aria-label={t('opportunityInbox.sortAria')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" onChange={event => { setOffset(0); setSort(event.target.value) }} value={sort}>
              <option value="match_score:desc">{t('opportunityInbox.sortMatchHighest')}</option><option value="recommendation:desc">{t('opportunityInbox.sortRecommendationPriority')}</option><option value="confidence:desc">{t('opportunityInbox.sortConfidenceHighest')}</option><option value="job_posted_at:desc">{t('opportunityInbox.sortJobDateNewest')}</option><option value="ranking_position:asc">{t('opportunityInbox.sortRankingFirst')}</option>
            </select>
          </FormSection>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={resetFilters} type="button">{t('opportunityInbox.clearFilters')}</button>
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">{t('commandPalette.searchButton')}</button>
          </div>
          </form>
        </SearchToolbar>
      </section>

      {loading && <LoadingState title={t('opportunityInbox.loading')} message={t('opportunityInbox.loadingDescription')} />}

      {!loading && error && (
        <ErrorState
          title={t('opportunityInbox.errorTitle')}
          message={error}
          action={(
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>
              {t('home.tryAgain')}
            </button>
          )}
        />
      )}

      {!loading && !error && opportunities.length === 0 && (
        <EmptyState title={t('opportunityInbox.emptyTitle')} message={t('opportunityInbox.emptyDescription')} />
      )}

      {!loading && !error && opportunities.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t('opportunityInbox.showing').replace('{from}', String(offset + 1)).replace('{to}', String(offset + returned))}</span>
            <span>{t('opportunityInbox.officialQueue')}</span>
          </div>

          <div className="space-y-3">
            {opportunities.map(opportunity => {
              const details = recommendationDetails(opportunity)
              return (
                <SectionCard key={opportunity.opportunity_id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <OpportunityStatusBadge status={opportunity.lifecycle_status} decision={details.decision} />
                        {details.confidence && (
                          <StatusBadge tone={confidenceTone(details.confidence)} className="font-semibold">
                            {readable(details.confidence, t('common.notAvailable'))} {t('opportunityInbox.confidence')}
                          </StatusBadge>
                        )}
                        {details.matchScore !== null && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {t('opportunityInbox.matchEvidence').replace('{score}', formatScore(details.matchScore))}
                          </span>
                        )}
                        {details.rankingPosition !== null && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{t('opportunityInbox.rank').replace('{position}', String(details.rankingPosition))}</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-950">{opportunity.title}</h3>
                      <div className="mt-1 text-sm font-medium text-slate-700">{opportunity.company || t('opportunityInbox.companyNotProvided')}</div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {opportunity.location && <span>{opportunity.location}</span>}
                        {opportunity.work_mode && <span>{opportunity.work_mode}</span>}
                        {opportunity.employment_type && <span>{opportunity.employment_type}</span>}
                        {opportunity.job_posted_at && <span>{t('opportunityInbox.posted').replace('{date}', formatDate(opportunity.job_posted_at))}</span>}
                        <span>{t('opportunityInbox.updated').replace('{date}', formatDate(opportunity.last_discovered_at))}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {opportunity.occupation_type && <span className="rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-700">{readable(opportunity.occupation_type, t('common.notAvailable'))}</span>}
                        {opportunity.occupation_compatibility && <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">{readable(opportunity.occupation_compatibility, t('common.notAvailable'))}</span>}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {details.reason ?? opportunity.description ?? t('opportunityInbox.noDescription')}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Link
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        to={`/opportunities/${opportunity.opportunity_id}`}
                      >
                        {t('campaigns.viewDetails')}
                      </Link>
                      {opportunity.job_url && (
                        <a
                          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                          href={opportunity.job_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t('opportunityInbox.openLinkedin')}
                        </a>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={offset === 0}
              onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}
            >
              {t('agentExecutions.previous')}
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={returned < PAGE_SIZE}
              onClick={() => setOffset(value => value + PAGE_SIZE)}
            >
              {t('agentExecutions.next')}
            </button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
