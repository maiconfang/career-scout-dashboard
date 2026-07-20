import { useEffect, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  Campaign,
  listCampaigns,
  listSearchAudits,
  SearchAudit as SearchAuditRecord,
  SearchAuditQuery
} from '../lib/api'

const PAGE_SIZE = 25

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(value))
}

function formatDuration(seconds: number | null, notAvailable: string, secondLabel: string, minuteLabel: string) {
  if (seconds === null) return notAvailable
  return seconds < 60 ? `${seconds.toFixed(1)} ${secondLabel}` : `${Math.floor(seconds / 60)} ${minuteLabel} ${Math.round(seconds % 60)} ${secondLabel}`
}

function conversionClass(rate: number) {
  if (rate >= 20) return 'text-emerald-700'
  if (rate > 0) return 'text-amber-700'
  return 'text-red-700'
}

function conversionSurface(rate: number) {
  if (rate >= 20) return 'border-emerald-200 bg-emerald-50'
  if (rate > 0) return 'border-amber-200 bg-amber-50'
  return 'border-red-200 bg-red-50'
}

function executionTone(status: string): 'emerald' | 'red' | 'slate' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED') return 'red'
  return 'slate'
}

function readableFamily(value: string | null, unclassified: string) {
  return (value ?? unclassified).replaceAll('_', ' ')
}

export default function SearchAudit() {
  const { t } = useLanguage()
  const [audits, setAudits] = useState<SearchAuditRecord[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filters, setFilters] = useState<SearchAuditQuery>({
    search_family: '', campaign_id: '', sort_by: 'campaign_date', order: 'desc'
  })
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    listCampaigns(100, 0).then(response => setCampaigns(response.items)).catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listSearchAudits({ ...filters, limit: PAGE_SIZE, offset })
      .then(response => {
        if (!active) return
        setAudits(response.items)
        setReturned(response.returned)
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, offset, reloadKey])

  function updateFilter(name: keyof SearchAuditQuery, value: string) {
    setOffset(0)
    setFilters(current => ({ ...current, [name]: value }))
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    window.setTimeout(() => setCopiedUrl(current => current === url ? null : current), 1500)
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        eyebrow={t('searchAudit.eyebrow')}
        title={t('searchAudit.title')}
        description={t('searchAudit.description')}
        actions={<StatusBadge>{t('searchAudit.attemptsOnPage').replace('{count}', String(returned))}</StatusBadge>}
      />
      <FilterBar className="grid gap-3 bg-slate-50/70 px-5 py-4 sm:px-6 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('opportunityRepository.searchFamily')}</span>
            <select aria-label={t('opportunityRepository.filterSearchFamilyAria')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-50" onChange={event => updateFilter('search_family', event.target.value)} value={filters.search_family}>
              <option value="">{t('opportunityRepository.allSearchFamilies')}</option><option value="SDET">SDET</option><option value="QA_AUTOMATION">QA Automation</option><option value="QUALITY_ENGINEERING">Quality Engineering</option><option value="TEST_ENGINEERING">Test Engineering</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('agentExecutions.campaign')}</span>
            <select aria-label={t('opportunityRepository.filterCampaignAria')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-50" onChange={event => updateFilter('campaign_id', event.target.value)} value={filters.campaign_id}>
              <option value="">{t('opportunityRepository.allCampaigns')}</option>
              {campaigns.map(campaign => <option key={campaign.campaign_id} value={campaign.campaign_id}>{formatDate(campaign.campaign_date)} - {campaign.campaign_id.slice(0, 8)}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('searchAudit.sortBy')}</span>
            <select aria-label={t('searchAudit.sortAria')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-50" onChange={event => {
              const [sort_by, order] = event.target.value.split(':')
              setOffset(0)
              setFilters(current => ({ ...current, sort_by: sort_by as SearchAuditQuery['sort_by'], order: order as SearchAuditQuery['order'] }))
            }} value={`${filters.sort_by}:${filters.order}`}>
              <option value="campaign_date:desc">{t('searchAudit.sortExecutionNewest')}</option><option value="campaign_date:asc">{t('searchAudit.sortExecutionOldest')}</option><option value="conversion_rate:desc">{t('searchAudit.sortConversionHighest')}</option><option value="conversion_rate:asc">{t('searchAudit.sortConversionLowest')}</option><option value="jobs_collected:desc">{t('searchAudit.sortJobsHighest')}</option><option value="jobs_collected:asc">{t('searchAudit.sortJobsLowest')}</option>
            </select>
          </label>
      </FilterBar>

      {loading && <LoadingState title={t('searchAudit.loading')} message={t('searchAudit.loadingDescription')} />}
      {!loading && error && <ErrorState title={t('searchAudit.errorTitle')} message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('home.tryAgain')}</button>} />}
      {!loading && !error && audits.length === 0 && <EmptyState title={t('searchAudit.emptyTitle')} message={t('searchAudit.emptyDescription')} />}

      {!loading && !error && audits.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-500"><span>{t('opportunityInbox.showing').replace('{from}', String(offset + 1)).replace('{to}', String(offset + returned))}</span><span>{t('searchAudit.oneCardPerAttempt')}</span></div>
          <div className="grid gap-4 lg:grid-cols-2">
            {audits.map(audit => (
              <SectionCard className="group overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" key={`${audit.campaign_id}:${audit.search_family}:${audit.search_keyword}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">{readableFamily(audit.search_family, t('searchAudit.unclassified'))}</span>
                        <StatusBadge tone={executionTone(audit.execution_status)} className="px-2 py-1 text-[10px]">{audit.execution_status}</StatusBadge>
                      </div>
                      <h3 className="mt-3 truncate text-base font-bold tracking-tight text-slate-950" title={audit.search_keyword}>{audit.search_keyword}</h3>
                    </div>
                    <div className={`shrink-0 rounded-xl border px-3 py-2 text-right ${conversionSurface(audit.conversion_rate)}`}>
                      <div className={`text-2xl font-black leading-none tabular-nums ${conversionClass(audit.conversion_rate)}`}>{audit.conversion_rate.toFixed(1)}%</div>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">{t('searchAudit.conversion')}</div>
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={t('searchAudit.conversionPercentAria').replace('{value}', audit.conversion_rate.toFixed(2))}>
                    <div className={`h-full rounded-full ${audit.conversion_rate >= 20 ? 'bg-emerald-500' : audit.conversion_rate > 0 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, audit.conversion_rate)}%` }} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatCard label={t('campaignHistory.found')} value={audit.jobs_collected} className="rounded-xl px-3 py-3" />
                    <StatCard label={t('opportunityRepository.aligned')} value={audit.jobs_aligned} tone="emerald" className="rounded-xl px-3 py-3" />
                    <StatCard label={t('opportunityRepository.rejected')} value={audit.jobs_rejected} tone="red" className="rounded-xl px-3 py-3" />
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{formatDate(audit.campaign_date)}</span><span className="text-slate-300">•</span><span className="font-mono text-[11px]">{t('searchAudit.campaignShort').replace('{id}', audit.campaign_id.slice(0, 8))}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-600">
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1">{audit.location || t('searchAudit.anyLocation')}</span><span className="rounded-md border border-slate-200 bg-white px-2 py-1">{audit.work_mode}</span><span className="rounded-md border border-slate-200 bg-white px-2 py-1">{formatDuration(audit.duration_seconds, t('common.notAvailable'), t('campaignHistory.seconds'), t('campaignHistory.minutes'))}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900" onClick={() => copyUrl(audit.linkedin_search_url)} type="button">{copiedUrl === audit.linkedin_search_url ? t('searchAudit.copied') : t('searchAudit.copyUrl')}</button>
                      <a className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-500" href={audit.linkedin_search_url} rel="noreferrer" target="_blank">{t('searchAudit.openSearch')}</a>
                    </div>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>{t('agentExecutions.previous')}</button><button className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>{t('agentExecutions.next')}</button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
