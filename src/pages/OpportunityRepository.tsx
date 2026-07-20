import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  FormSection,
  LoadingState,
  PageContainer,
  PageHeader,
  SearchToolbar,
  SectionCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
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

function readable(value: string | null, notAvailable: string) {
  if (!value) return notAvailable
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function recommendationTone(status: string): 'emerald' | 'red' | 'blue' | 'slate' {
  if (status === 'RECOMMENDED') return 'emerald'
  if (status === 'REJECTED' || status === 'NOT_RECOMMENDED') return 'red'
  if (status === 'ALIGNED') return 'blue'
  return 'slate'
}

export default function OpportunityRepository() {
  const { t } = useLanguage()
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
    <PageContainer className="space-y-5" size="lg">
      <PageHeader
        eyebrow={t('opportunityRepository.eyebrow')}
        title={t('opportunityRepository.title')}
        description={t('opportunityRepository.description')}
      />

      <SearchToolbar>
        <form className="w-full space-y-3" onSubmit={applyFilters}>
          <FormSection className="lg:grid-cols-4">
            <input aria-label={t('opportunityRepository.searchAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:col-span-2" onChange={event => updateFilter('q', event.target.value)} placeholder={t('opportunityInbox.searchPlaceholder')} value={draftFilters.q} />
            <input aria-label={t('opportunityInbox.filterCompanyAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('company', event.target.value)} placeholder={t('opportunityInbox.company')} value={draftFilters.company} />
            <select aria-label={t('opportunityInbox.filterRecommendationAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('recommendation', event.target.value)} value={draftFilters.recommendation}>
              <option value="">{t('opportunityRepository.allRecommendationStates')}</option><option value="RECOMMENDED">{t('opportunityRepository.recommended')}</option><option value="ALIGNED">{t('opportunityRepository.aligned')}</option><option value="REJECTED">{t('opportunityRepository.rejected')}</option><option value="NOT_RECOMMENDED">{t('opportunityRepository.notRecommended')}</option><option value="NOT_EVALUATED">{t('opportunityRepository.notEvaluated')}</option>
            </select>
            <select aria-label={t('opportunityRepository.filterDecisionAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('decision', event.target.value)} value={draftFilters.decision}>
              <option value="">{t('opportunityRepository.allDecisions')}</option><option value="APPLY">{t('opportunityStatus.apply')}</option><option value="CONSIDER">{t('opportunityStatus.consider')}</option><option value="DO_NOT_APPLY">{t('opportunityStatus.doNotApply')}</option>
            </select>
            <select aria-label={t('opportunityRepository.filterRoleTypeAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('role_type', event.target.value)} value={draftFilters.role_type}>
              <option value="">{t('opportunityRepository.allRoleTypes')}</option><option value="QA_AUTOMATION">QA Automation</option><option value="SOFTWARE_ENGINEERING">Software Engineering</option><option value="AI_ENGINEER">AI Engineer</option><option value="DATA_ENGINEER">Data Engineer</option><option value="DEVOPS_ENGINEER">DevOps Engineer</option><option value="UNKNOWN">{t('opportunityRepository.unknown')}</option>
            </select>
            <select aria-label={t('opportunityInbox.filterWorkModeAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('work_mode', event.target.value)} value={draftFilters.work_mode}>
              <option value="">{t('opportunityInbox.allWorkModes')}</option><option value="REMOTE">{t('opportunityInbox.remote')}</option><option value="HYBRID">{t('opportunityInbox.hybrid')}</option><option value="ONSITE">{t('opportunityInbox.onsite')}</option><option value="UNKNOWN">{t('opportunityRepository.unknown')}</option>
            </select>
            <select aria-label={t('opportunityRepository.filterEmploymentTypeAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('employment_type', event.target.value)} value={draftFilters.employment_type}>
              <option value="">{t('opportunityRepository.allEmploymentTypes')}</option><option value="FULL_TIME">{t('opportunityRepository.fullTime')}</option><option value="CONTRACT">{t('opportunityRepository.contract')}</option><option value="PART_TIME">{t('opportunityRepository.partTime')}</option><option value="TEMPORARY">{t('opportunityRepository.temporary')}</option><option value="UNKNOWN">{t('opportunityRepository.unknown')}</option>
            </select>
            <select aria-label={t('opportunityRepository.filterSearchFamilyAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('search_family', event.target.value)} value={draftFilters.search_family}>
              <option value="">{t('opportunityRepository.allSearchFamilies')}</option><option value="SDET">SDET</option><option value="QA_AUTOMATION">QA Automation</option><option value="QUALITY_ENGINEERING">Quality Engineering</option><option value="TEST_ENGINEERING">Test Engineering</option>
            </select>
            <select aria-label={t('opportunityRepository.filterCampaignAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => updateFilter('campaign_id', event.target.value)} value={draftFilters.campaign_id}>
              <option value="">{t('opportunityRepository.allCampaigns')}</option>
              {campaigns.map(campaign => <option key={campaign.campaign_id} value={campaign.campaign_id}>{formatDate(campaign.campaign_date)} - {campaign.campaign_id.slice(0, 8)}</option>)}
            </select>
            <select aria-label={t('opportunityRepository.sortAria')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onChange={event => {
              const [sort_by, order] = event.target.value.split(':')
              setDraftFilters(current => ({ ...current, sort_by: sort_by as OpportunityRepositoryQuery['sort_by'], order: order as OpportunityRepositoryQuery['order'] }))
            }} value={`${draftFilters.sort_by}:${draftFilters.order}`}>
              <option value="last_discovered_at:desc">{t('opportunityRepository.sortLastDiscoveredNewest')}</option><option value="first_discovered_at:desc">{t('opportunityRepository.sortFirstDiscoveredNewest')}</option><option value="match_score:desc">{t('opportunityInbox.sortMatchHighest')}</option><option value="company:asc">{t('opportunityRepository.sortCompanyAsc')}</option><option value="title:asc">{t('opportunityRepository.sortTitleAsc')}</option>
            </select>
          </FormSection>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">{t('opportunityRepository.applyFilters')}</button>
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={clearFilters} type="button">{t('opportunityRepository.clear')}</button>
          </div>
        </form>
      </SearchToolbar>

      {loading && <LoadingState title={t('opportunityRepository.loading')} message={t('opportunityRepository.loadingDescription')} />}
      {!loading && error && <ErrorState title={t('opportunityRepository.errorTitle')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('home.tryAgain')}</button>} />}
      {!loading && !error && opportunities.length === 0 && <EmptyState title={t('opportunityRepository.emptyTitle')} message={t('opportunityRepository.emptyDescription')} />}

      {!loading && !error && opportunities.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500"><span>{t('opportunityInbox.showing').replace('{from}', String(offset + 1)).replace('{to}', String(offset + returned))}</span><span>{t('opportunityRepository.completeRepository')}</span></div>
          <div className="space-y-3">
            {opportunities.map(opportunity => (
              <SectionCard key={opportunity.opportunity_id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={recommendationTone(opportunity.recommendation_status)} className="font-semibold">{readable(opportunity.recommendation_status, t('common.notAvailable'))}</StatusBadge>
                      {opportunity.decision && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{readable(opportunity.decision, t('common.notAvailable'))}</span>}
                      {opportunity.match_score !== null && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t('opportunityRepository.matchPercent').replace('{score}', String(Math.round(opportunity.match_score)))}</span>}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-950">{opportunity.title}</h3>
                    <div className="mt-1 text-sm font-medium text-slate-700">{opportunity.company || t('opportunityInbox.companyNotProvided')}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {opportunity.location && <span>{opportunity.location}</span>}{opportunity.salary && <span>{opportunity.salary}</span>}{opportunity.work_mode && <span>{readable(opportunity.work_mode, t('common.notAvailable'))}</span>}{opportunity.employment_type && <span>{readable(opportunity.employment_type, t('common.notAvailable'))}</span>}<span>{readable(opportunity.role_type, t('common.notAvailable'))}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <div><span className="font-semibold text-slate-800">{t('opportunityRepository.confidence')}:</span> {readable(opportunity.decision_confidence, t('common.notAvailable'))}</div><div><span className="font-semibold text-slate-800">{t('opportunityRepository.searchFamily')}:</span> {readable(opportunity.search_family, t('common.notAvailable'))}</div><div><span className="font-semibold text-slate-800">{t('opportunityRepository.firstDiscovered')}:</span> {formatDate(opportunity.first_discovered_at)}</div><div><span className="font-semibold text-slate-800">{t('opportunityRepository.lastDiscovered')}:</span> {formatDate(opportunity.last_discovered_at)}</div><div><span className="font-semibold text-slate-800">{t('campaigns.title')}:</span> {opportunity.campaign_count}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/opportunities/${opportunity.opportunity_id}`}>{t('campaigns.viewDetails')}</Link>
                    {opportunity.job_url && <a className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" href={opportunity.job_url} rel="noreferrer" target="_blank">{t('opportunityInbox.openLinkedin')}</a>}
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>{t('agentExecutions.previous')}</button><button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>{t('agentExecutions.next')}</button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
