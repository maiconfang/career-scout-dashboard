import { useEffect, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import { Campaign, listCampaigns } from '../lib/api'

const PAGE_SIZE = 25

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(seconds: number, secondLabel: string, minuteLabel: string) {
  if (seconds < 60) return `${Math.round(seconds)} ${secondLabel}`
  return `${Math.floor(seconds / 60)} ${minuteLabel} ${Math.round(seconds % 60)} ${secondLabel}`
}

function campaignStatus(campaign: Campaign) {
  return campaign.metrics.execution_status ?? 'UNKNOWN'
}

function statusTone(status: string): 'emerald' | 'red' | 'slate' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED') return 'red'
  return 'slate'
}

export default function CampaignHistory() {
  const { t } = useLanguage()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [offset, setOffset] = useState(0)
  const [returned, setReturned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listCampaigns(PAGE_SIZE, offset)
      .then(response => {
        if (!active) return
        setCampaigns(response.items)
        setReturned(response.returned)
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [offset, reloadKey])

  return (
    <PageContainer className="space-y-5" size="lg">
      <PageHeader
        eyebrow={t('campaignHistory.eyebrow')}
        title={t('campaignHistory.title')}
        description={t('campaignHistory.description')}
      />

      {loading && <LoadingState title={t('campaignHistory.loading')} message={t('campaignHistory.loadingDescription')} />}
      {!loading && error && (
        <ErrorState
          title={t('campaignHistory.errorTitle')}
          message={error}
          action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('home.tryAgain')}</button>}
        />
      )}
      {!loading && !error && campaigns.length === 0 && <EmptyState title={t('campaignHistory.emptyTitle')} message={t('campaignHistory.emptyDescription')} />}

      {!loading && !error && campaigns.length > 0 && (
        <>
          <SectionCard className="overflow-hidden" padded={false}>
            <div className="hidden grid-cols-[1.4fr_0.7fr_repeat(4,0.6fr)_0.8fr] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
              <div>{t('agentExecutions.campaign')}</div><div>{t('agentExecutions.status')}</div><div>{t('campaignHistory.found')}</div><div>{t('campaignHistory.ranked')}</div><div>{t('campaignHistory.topFive')}</div><div>{t('campaignHistory.apply')}</div><div>{t('agentExecutions.duration')}</div>
            </div>
            <div className="divide-y divide-slate-100">
              {campaigns.map(campaign => {
                const status = campaignStatus(campaign)
                return (
                  <article className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.4fr_0.7fr_repeat(4,0.6fr)_0.8fr] lg:items-center" key={campaign.campaign_id}>
                    <div>
                      <div className="font-semibold text-slate-900">{formatDate(campaign.campaign_date)}</div>
                      <div className="mt-1 font-mono text-[11px] text-slate-400">{campaign.campaign_id.slice(0, 8)}</div>
                    </div>
                    <div>
                      <StatusBadge tone={statusTone(status)} className="font-semibold">
                        {status.toLowerCase().replace(/^./, value => value.toUpperCase())}
                      </StatusBadge>
                    </div>
                    <div><span className="text-xs text-slate-500 lg:hidden">{t('campaignHistory.found')}: </span><span className="font-semibold text-slate-700">{campaign.jobs_collected}</span></div>
                    <div><span className="text-xs text-slate-500 lg:hidden">{t('campaignHistory.ranked')}: </span><span className="font-semibold text-slate-700">{campaign.jobs_accepted}</span></div>
                    <div><span className="text-xs text-slate-500 lg:hidden">{t('campaignHistory.topFive')}: </span><span className="font-semibold text-slate-700">{campaign.top_5}</span></div>
                    <div><span className="text-xs text-slate-500 lg:hidden">{t('campaignHistory.apply')}: </span><span className="font-semibold text-emerald-700">{campaign.apply_count}</span></div>
                    <div className="text-slate-600">{formatDuration(campaign.duration_seconds, t('campaignHistory.seconds'), t('campaignHistory.minutes'))}</div>
                  </article>
                )
              })}
            </div>
          </SectionCard>

          <div className="flex items-center justify-between">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>{t('agentExecutions.previous')}</button>
            <span className="text-xs text-slate-500">{t('campaignHistory.showing').replace('{from}', String(offset + 1)).replace('{to}', String(offset + returned))}</span>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={returned < PAGE_SIZE} onClick={() => setOffset(value => value + PAGE_SIZE)}>{t('agentExecutions.next')}</button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
