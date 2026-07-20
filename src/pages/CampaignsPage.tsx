import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CampaignRunAction } from '../components/CampaignRunAction'
import {
  ConfirmationDialog,
  EmptyState,
  ErrorAlert,
  LoadingState,
  PageActions,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import type { TranslationKey } from '../i18n/translationService'
import { getCandidateProfile, type CandidateProfile } from '../lib/candidateProfileApi'
import { archiveCampaignProfile, listCampaignProfiles, setDefaultCampaignProfile, type CampaignProfile } from '../lib/campaignProfileApi'
import { listDiscoverySources, type DiscoverySource } from '../lib/discoverySourceApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import { listAgentExecutions, type AgentExecutionSummary } from '../lib/api'

type CampaignsData = {
  campaignProfiles: CampaignProfile[]
  candidateProfile: CandidateProfile | null
  resumes: CandidateResume[]
  linkedInAccounts: LinkedInAccount[]
  discoverySources: DiscoverySource[]
  discoverySourcesLoaded: boolean
  executions: AgentExecutionSummary[]
  executionsLoaded: boolean
}

type SetupStatus = 'completed' | 'missing' | 'needsAttention' | 'blocked'

type SetupItem = {
  id: string
  label: string
  description: string
  status: SetupStatus
  actionLabel: string
  actionTo: string
}

function formatDate(value: string | null | undefined, notAvailable: string) {
  if (!value) {
    return notAvailable
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function candidateLabel(candidateProfile: CandidateProfile | null, campaign: CampaignProfile, notAvailable: string, candidateProfileLabel: string) {
  if (!candidateProfile?.profile_id || candidateProfile.profile_id !== campaign.candidate_profile_id) {
    return notAvailable
  }
  return candidateProfile.desired_occupation || candidateProfile.current_occupation || candidateProfileLabel
}

function latestExecutionForCampaign(executions: AgentExecutionSummary[], campaign: CampaignProfile) {
  return executions
    .filter(execution => execution.campaign === campaign.name)
    .sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime())[0] ?? null
}

function executionStatusTone(status: string): 'slate' | 'brand' | 'emerald' | 'amber' | 'red' | 'blue' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED' || status === 'CANCELLED') return 'red'
  if (status === 'QUEUED' || status === 'RUNNING') return 'amber'
  return 'slate'
}

export default function CampaignsPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [campaignToArchive, setCampaignToArchive] = useState<CampaignProfile | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    setWarnings([])
    Promise.allSettled([
      listCampaignProfiles(includeArchived),
      getCandidateProfile(),
      listResumes(false),
      listLinkedInAccounts(false),
      listDiscoverySources(false),
      listAgentExecutions({ limit: 100, offset: 0, sort_by: 'started_at', order: 'desc' })
    ]).then(results => {
      const [
        campaignProfilesResult,
        candidateProfileResult,
        resumesResult,
        linkedInAccountsResult,
        discoverySourcesResult,
        executionsResult
      ] = results

      if (campaignProfilesResult.status === 'rejected') {
        throw campaignProfilesResult.reason instanceof Error
          ? campaignProfilesResult.reason
          : new Error(t('campaigns.loadFailed'))
      }

      const nextWarnings: string[] = []
      if (candidateProfileResult.status === 'rejected') {
        nextWarnings.push(t('campaigns.candidateWarning'))
      }
      if (resumesResult.status === 'rejected') {
        nextWarnings.push(t('campaigns.resumeWarning'))
      }
      if (linkedInAccountsResult.status === 'rejected') {
        nextWarnings.push(t('campaigns.linkedinWarning'))
      }
      if (discoverySourcesResult.status === 'rejected') {
        nextWarnings.push(t('campaigns.discoverySourcesWarning'))
      }
      if (executionsResult.status === 'rejected') {
        nextWarnings.push(t('campaigns.executionsWarning'))
      }

      setWarnings(nextWarnings)
      setData({
        campaignProfiles: campaignProfilesResult.value,
        candidateProfile: candidateProfileResult.status === 'fulfilled' ? candidateProfileResult.value : null,
        resumes: resumesResult.status === 'fulfilled' ? resumesResult.value : [],
        linkedInAccounts: linkedInAccountsResult.status === 'fulfilled' ? linkedInAccountsResult.value : [],
        discoverySources: discoverySourcesResult.status === 'fulfilled' ? discoverySourcesResult.value : [],
        discoverySourcesLoaded: discoverySourcesResult.status === 'fulfilled',
        executions: executionsResult.status === 'fulfilled' ? executionsResult.value.items : [],
        executionsLoaded: executionsResult.status === 'fulfilled'
      })
    })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [includeArchived])

  const activeCampaigns = data?.campaignProfiles.filter(campaign => campaign.active) ?? []
  const visibleCampaigns = includeArchived ? data?.campaignProfiles ?? [] : activeCampaigns
  const defaultCampaign = activeCampaigns.find(campaign => campaign.default_profile) ?? null
  const activeResumes = data?.resumes.filter(resume => resume.active) ?? []
  const activeLinkedInAccounts = data?.linkedInAccounts.filter(account => account.active) ?? []
  const activeDiscoverySources = data?.discoverySources.filter(source => source.active) ?? []
  const campaignsWithSources = useMemo(() => (
    activeCampaigns.filter(campaign => data?.discoverySources.some(source => (
      source.active && source.linkedin_account_id === campaign.linkedin_account_id
    )))
  ), [activeCampaigns, data?.discoverySources])
  const selectedCampaign = visibleCampaigns.find(campaign => campaign.campaign_profile_id === selectedCampaignId) ?? null
  const runnableCampaign = defaultCampaign && campaignsWithSources.some(campaign => campaign.campaign_profile_id === defaultCampaign.campaign_profile_id)
    ? defaultCampaign
    : campaignsWithSources[0] ?? defaultCampaign ?? activeCampaigns[0] ?? null
  const setupItems = useMemo(() => {
    if (!data) return []

    const candidateReady = Boolean(data.candidateProfile?.profile_id)
    const resumeReady = activeResumes.length > 0
    const linkedInReady = activeLinkedInAccounts.length > 0
    const discoverySourcesReady = data.discoverySourcesLoaded && activeDiscoverySources.length > 0
    const campaignReady = activeCampaigns.length > 0
    const campaignNeedsSources = campaignReady && data.discoverySourcesLoaded && campaignsWithSources.length === 0

    return [
      {
        id: 'candidate',
        label: t('campaigns.setupCandidate'),
        description: candidateReady ? t('campaigns.setupCandidateCompleted') : t('campaigns.setupCandidateMissing'),
        status: candidateReady ? 'completed' : 'missing',
        actionLabel: t('campaigns.openProfile'),
        actionTo: '/career/candidate-profile'
      },
      {
        id: 'resume',
        label: t('campaigns.setupResume'),
        description: resumeReady ? t('campaigns.setupResumeCompleted') : t('campaigns.setupResumeMissing'),
        status: resumeReady ? 'completed' : 'missing',
        actionLabel: t('campaigns.uploadResume'),
        actionTo: '/career/resumes'
      },
      {
        id: 'linkedin',
        label: t('campaigns.setupLinkedin'),
        description: linkedInReady ? t('campaigns.setupLinkedinCompleted') : t('campaigns.setupLinkedinMissing'),
        status: linkedInReady ? 'completed' : 'missing',
        actionLabel: t('campaigns.connectLinkedin'),
        actionTo: '/career/linkedin-accounts'
      },
      {
        id: 'discovery',
        label: t('campaigns.setupDiscoverySources'),
        description: discoverySourcesReady
          ? t('campaigns.setupDiscoverySourcesCompleted').replace('{count}', String(activeDiscoverySources.length))
          : linkedInReady
            ? t('campaigns.setupDiscoverySourcesMissing')
            : t('campaigns.setupDiscoverySourcesBlocked'),
        status: discoverySourcesReady ? 'completed' : linkedInReady ? data.discoverySourcesLoaded ? 'missing' : 'needsAttention' : 'blocked',
        actionLabel: t('campaigns.createDiscoverySource'),
        actionTo: '/career/discovery-sources'
      },
      {
        id: 'campaign',
        label: t('campaigns.setupCampaign'),
        description: campaignNeedsSources
          ? t('campaigns.setupCampaignNeedsSources')
          : campaignReady
            ? t('campaigns.setupCampaignCompleted')
            : candidateReady && resumeReady && linkedInReady
              ? t('campaigns.setupCampaignMissing')
              : t('campaigns.setupCampaignBlocked'),
        status: campaignNeedsSources ? 'needsAttention' : campaignReady ? 'completed' : candidateReady && resumeReady && linkedInReady ? 'missing' : 'blocked',
        actionLabel: campaignReady ? t('campaigns.editCampaign') : t('campaigns.createCampaign'),
        actionTo: campaignReady ? `/career/campaigns/setup?mode=edit&campaign_profile_id=${encodeURIComponent(activeCampaigns[0].campaign_profile_id)}` : '/career/campaigns/setup?mode=create'
      }
    ] satisfies SetupItem[]
  }, [activeCampaigns, activeDiscoverySources.length, activeLinkedInAccounts.length, activeResumes.length, campaignsWithSources.length, data, t])
  const completedSetupItems = setupItems.filter(item => item.status === 'completed').length
  const readyToRun = setupItems.length > 0 && completedSetupItems === setupItems.length && Boolean(runnableCampaign)

  async function handleSetDefault(campaignProfileId: string) {
    setActionMessage(null)
    setActionError(null)
    try {
      await setDefaultCampaignProfile(campaignProfileId)
      setActionMessage(t('campaigns.defaultUpdated'))
      load()
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : t('campaigns.defaultFailed'))
    }
  }

  async function handleArchive(campaignProfileId: string) {
    setActionMessage(null)
    setActionError(null)
    try {
      await archiveCampaignProfile(campaignProfileId)
      setActionMessage(t('campaigns.archived'))
      setSelectedCampaignId(current => current === campaignProfileId ? null : current)
      load()
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : t('campaigns.archiveFailed'))
    }
  }

  if (loading) {
    return <LoadingState title={t('campaigns.loading')} message={t('campaigns.loadingDescription')} />
  }

  if (!data) {
    return (
      <PageContainer size="xl">
        <ErrorAlert>{error ?? t('campaigns.loadFailed')}</ErrorAlert>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow={t('career.section')}
        title={t('campaigns.title')}
        description={t('campaigns.description')}
        actions={(
          <PageActions>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/agent/executions">
              {t('campaigns.executions')}
            </Link>
            <Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/career/campaigns/setup?mode=create">
              {t('campaigns.newCampaign')}
            </Link>
          </PageActions>
        )}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {actionMessage && <SuccessAlert>{actionMessage}</SuccessAlert>}
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map(warning => (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800" key={warning}>
              {warning}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('campaigns.activeCampaigns')} value={activeCampaigns.length} subtitle={t('campaigns.activeCampaignsSubtitle')} tone="blue" />
        <StatCard label={t('campaigns.withDiscoverySources')} value={campaignsWithSources.length} subtitle={t('campaigns.withDiscoverySourcesSubtitle')} tone="emerald" />
        <StatCard label={t('campaigns.defaultCampaign')} value={defaultCampaign?.name ?? t('common.notAvailable')} subtitle={t('campaigns.defaultCampaignSubtitle')} tone="slate" />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <input checked={includeArchived} type="checkbox" onChange={event => setIncludeArchived(event.target.checked)} />
        {t('campaigns.includeArchived')}
      </label>

      <FirstCampaignSetupCard
        completed={completedSetupItems}
        items={setupItems}
        readyCampaign={readyToRun ? runnableCampaign : null}
        t={t}
      />

      {visibleCampaigns.length === 0 ? (
        <SectionCard>
          <EmptyState
            title={t('campaigns.emptyTitle')}
            message={t('campaigns.emptyDescription')}
            action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/campaigns/setup?mode=create">{t('campaigns.newCampaign')}</Link>}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleCampaigns.map(campaign => {
            const resume = data.resumes.find(item => item.resume_id === campaign.resume_id) ?? null
            const linkedInAccount = data.linkedInAccounts.find(account => account.account_id === campaign.linkedin_account_id) ?? null
            const sources = data.discoverySources.filter(source => source.active && source.linkedin_account_id === campaign.linkedin_account_id)
            const latestExecution = latestExecutionForCampaign(data.executions, campaign)
            const noConfirmedSources = data.discoverySourcesLoaded && sources.length === 0

            return (
              <SectionCard className="h-full" key={campaign.campaign_profile_id}>
                <article className="flex h-full flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-extrabold text-agent-primary">{campaign.name}</h3>
                        <StatusBadge tone={campaign.active ? 'emerald' : 'slate'}>{campaign.status}</StatusBadge>
                        {campaign.default_profile && <StatusBadge tone="brand">{t('campaigns.default')}</StatusBadge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{campaign.primary_search_intent || t('campaigns.noSearchIntent')}</p>
                    </div>
                    {latestExecution && (
                      <StatusBadge tone={executionStatusTone(latestExecution.status)}>{latestExecution.status}</StatusBadge>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label={t('campaigns.candidate')} value={candidateLabel(data.candidateProfile, campaign, t('common.notAvailable'), t('campaigns.candidateProfile'))} />
                    <InfoRow label={t('campaigns.resume')} value={resume?.display_name ?? t('common.notAvailable')} />
                    <InfoRow label={t('campaigns.linkedinAccount')} value={linkedInAccount?.display_name ?? t('common.notAvailable')} />
                    <InfoRow label={t('campaigns.discoverySources')} value={data.discoverySourcesLoaded ? t('campaigns.activeSourcesCount').replace('{count}', String(sources.length)) : t('common.notAvailable')} tone={!data.discoverySourcesLoaded ? 'slate' : sources.length > 0 ? 'emerald' : 'amber'} />
                    <InfoRow label={t('campaigns.lastExecution')} value={data.executionsLoaded && latestExecution ? formatDate(latestExecution.started_at, t('common.notAvailable')) : t('common.notAvailable')} />
                    <InfoRow label={t('campaigns.lastUpdated')} value={formatDate(campaign.updated_at ?? campaign.created_at, t('common.notAvailable'))} />
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {campaign.active && (
                      <CampaignRunAction
                        campaignProfileId={campaign.campaign_profile_id}
                        campaignProfileName={campaign.name}
                        disabled={noConfirmedSources}
                        className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    )}
                    <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" type="button" onClick={() => setSelectedCampaignId(campaign.campaign_profile_id)}>
                      {t('campaigns.viewDetails')}
                    </button>
                    {campaign.active && (
                      <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/career/campaigns/setup?mode=edit&campaign_profile_id=${encodeURIComponent(campaign.campaign_profile_id)}`}>
                        {t('campaigns.edit')}
                      </Link>
                    )}
                    <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/agent/executions?q=${encodeURIComponent(campaign.name)}`}>
                      {t('campaigns.executions')}
                    </Link>
                    {campaign.active && !campaign.default_profile && (
                      <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" type="button" onClick={() => void handleSetDefault(campaign.campaign_profile_id)}>
                        {t('campaigns.setDefault')}
                      </button>
                    )}
                    {campaign.active && (
                      <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => setCampaignToArchive(campaign)}>
                        {t('campaigns.archive')}
                      </button>
                    )}
                  </div>
                  {campaign.active && noConfirmedSources && (
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      {t('campaigns.addDiscoverySourceBeforeRun')}
                    </p>
                  )}
                </article>
              </SectionCard>
            )
          })}
        </div>
      )}
      {selectedCampaign && (
        <CampaignDetailsDrawer
          campaign={selectedCampaign}
          candidateProfile={data.candidateProfile}
          resume={data.resumes.find(item => item.resume_id === selectedCampaign.resume_id) ?? null}
          linkedInAccount={data.linkedInAccounts.find(account => account.account_id === selectedCampaign.linkedin_account_id) ?? null}
          discoverySources={data.discoverySources.filter(source => source.active && source.linkedin_account_id === selectedCampaign.linkedin_account_id)}
          discoverySourcesLoaded={data.discoverySourcesLoaded}
          latestExecution={latestExecutionForCampaign(data.executions, selectedCampaign)}
          executionsLoaded={data.executionsLoaded}
          t={t}
          onClose={() => setSelectedCampaignId(null)}
        />
      )}
      <ConfirmationDialog
        cancelLabel={t('campaigns.cancel')}
        confirmLabel={t('campaigns.archive')}
        destructive
        description={campaignToArchive ? t('campaigns.archiveDescription').replace('{name}', campaignToArchive.name) : undefined}
        onCancel={() => setCampaignToArchive(null)}
        onConfirm={() => {
          if (!campaignToArchive) return
          const campaignProfileId = campaignToArchive.campaign_profile_id
          setCampaignToArchive(null)
          void handleArchive(campaignProfileId)
        }}
        open={campaignToArchive !== null}
        title={t('campaigns.archiveTitle')}
      />
    </PageContainer>
  )
}

function FirstCampaignSetupCard({
  items,
  completed,
  readyCampaign,
  t
}: {
  items: SetupItem[]
  completed: number
  readyCampaign: CampaignProfile | null
  t: (key: TranslationKey) => string
}) {
  const nextItem = items.find(item => item.status === 'missing' || item.status === 'needsAttention')
    ?? items.find(item => item.status === 'blocked')
    ?? null
  const total = items.length
  const progressValue = total > 0 ? Math.round((completed / total) * 100) : 0

  if (readyCampaign) {
    return (
      <SectionCard className="border-emerald-200 bg-emerald-50/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              {t('campaigns.readyToRunLabel')}
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-agent-primary">{t('campaigns.readyToRunTitle')}</h2>
            <p className="mt-1 max-w-2xl text-sm text-emerald-800">{t('campaigns.readyToRunDescription')}</p>
            <p className="mt-2 text-sm font-bold text-emerald-900">{readyCampaign.name}</p>
          </div>
          <CampaignRunAction
            campaignProfileId={readyCampaign.campaign_profile_id}
            campaignProfileName={readyCampaign.name}
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard className="border-brand-100 bg-white">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-brand-700">
              {t('campaigns.firstSetupLabel')}
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-agent-primary">{t('campaigns.firstSetupTitle')}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{t('campaigns.firstSetupDescription')}</p>
          </div>
          {nextItem && (
            <Link className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-700" to={nextItem.actionTo}>
              {t('campaigns.continueSetup')}
            </Link>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-700">{t('campaigns.overallProgress')}</span>
            <span className="text-sm font-extrabold text-agent-primary">{t('campaigns.progressCount').replace('{completed}', String(completed)).replace('{total}', String(total))}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progressValue}%` }} />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {items.map(item => (
            <SetupStepCard item={item} key={item.id} t={t} />
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

function SetupStepCard({
  item,
  t
}: {
  item: SetupItem
  t: (key: TranslationKey) => string
}) {
  const tone = setupStatusTone(item.status)

  return (
    <div className={`flex h-full flex-col rounded-xl border p-4 ${tone.container}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${tone.icon}`}>
          {setupStatusIcon(item.status)}
        </div>
        <StatusBadge tone={tone.badge}>{setupStatusLabel(item.status, t)}</StatusBadge>
      </div>
      <div className="mt-3 text-sm font-extrabold text-agent-primary">{item.label}</div>
      <p className="mt-1 flex-1 text-xs font-medium leading-5 text-slate-600">{item.description}</p>
      <Link
        className={`mt-4 inline-flex justify-center rounded-lg px-3 py-2 text-xs font-extrabold ${item.status === 'blocked' ? 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50' : 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-50'}`}
        to={item.actionTo}
      >
        {item.actionLabel}
      </Link>
    </div>
  )
}

function setupStatusTone(status: SetupStatus): {
  container: string
  icon: string
  badge: 'slate' | 'brand' | 'emerald' | 'amber' | 'red' | 'blue'
} {
  if (status === 'completed') {
    return {
      container: 'border-emerald-100 bg-emerald-50/70',
      icon: 'bg-emerald-600 text-white',
      badge: 'emerald'
    }
  }
  if (status === 'needsAttention') {
    return {
      container: 'border-amber-100 bg-amber-50/70',
      icon: 'bg-amber-500 text-white',
      badge: 'amber'
    }
  }
  if (status === 'blocked') {
    return {
      container: 'border-slate-200 bg-slate-50',
      icon: 'bg-slate-300 text-white',
      badge: 'slate'
    }
  }
  return {
    container: 'border-red-100 bg-red-50/60',
    icon: 'bg-red-500 text-white',
    badge: 'red'
  }
}

function setupStatusIcon(status: SetupStatus) {
  if (status === 'completed') return '✓'
  if (status === 'needsAttention') return '!'
  if (status === 'blocked') return '-'
  return 'x'
}

function setupStatusLabel(status: SetupStatus, t: (key: TranslationKey) => string) {
  if (status === 'completed') return t('campaigns.statusCompleted')
  if (status === 'needsAttention') return t('campaigns.statusNeedsAttention')
  if (status === 'blocked') return t('campaigns.statusBlocked')
  return t('campaigns.statusMissing')
}

function InfoRow({
  label,
  value,
  tone = 'slate'
}: {
  label: string
  value: string
  tone?: 'slate' | 'emerald' | 'amber'
}) {
  const toneClass = tone === 'emerald'
    ? 'text-emerald-700'
    : tone === 'amber'
      ? 'text-amber-700'
      : 'text-slate-900'

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-sm font-extrabold ${toneClass}`}>{value}</div>
    </div>
  )
}

function CampaignDetailsDrawer({
  campaign,
  candidateProfile,
  resume,
  linkedInAccount,
  discoverySources,
  discoverySourcesLoaded,
  latestExecution,
  executionsLoaded,
  t,
  onClose
}: {
  campaign: CampaignProfile
  candidateProfile: CandidateProfile | null
  resume: CandidateResume | null
  linkedInAccount: LinkedInAccount | null
  discoverySources: DiscoverySource[]
  discoverySourcesLoaded: boolean
  latestExecution: AgentExecutionSummary | null
  executionsLoaded: boolean
  t: (key: TranslationKey) => string
  onClose: () => void
}) {
  const candidateMatches = Boolean(candidateProfile?.profile_id && candidateProfile.profile_id === campaign.candidate_profile_id)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="campaign-details-title">
      <button className="hidden flex-1 cursor-default lg:block" type="button" aria-label={t('campaigns.closeDetails')} onClick={onClose} />
      <aside className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{t('campaigns.details')}</div>
              <h2 id="campaign-details-title" className="mt-1 truncate text-2xl font-extrabold text-agent-primary">{campaign.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge tone={campaign.active ? 'emerald' : 'slate'}>{campaign.status}</StatusBadge>
                {campaign.default_profile && <StatusBadge tone="brand">{t('campaigns.default')}</StatusBadge>}
                {latestExecution && <StatusBadge tone={executionStatusTone(latestExecution.status)}>{latestExecution.status}</StatusBadge>}
              </div>
            </div>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" type="button" onClick={onClose}>
              {t('campaigns.close')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <DetailSection title={t('campaigns.generalInformation')}>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label={t('campaigns.name')} value={campaign.name} />
                <DetailItem label={t('campaigns.status')} value={campaign.status} />
                <DetailItem label={t('campaigns.createdAt')} value={formatDate(campaign.created_at, t('common.notAvailable'))} />
                <DetailItem label={t('campaigns.lastUpdated')} value={formatDate(campaign.updated_at ?? campaign.created_at, t('common.notAvailable'))} />
                <DetailItem label={t('campaigns.lastExecution')} value={executionsLoaded && latestExecution ? formatDate(latestExecution.started_at, t('common.notAvailable')) : t('common.notAvailable')} />
                <DetailItem label={t('campaigns.executionResult')} value={executionsLoaded ? latestExecution?.status ?? t('common.notAvailable') : t('common.notAvailable')} />
              </div>
            </DetailSection>

            <DetailSection title={t('campaigns.candidate')} action={<LinkButton to="/career/candidate-profile">{t('campaigns.openCandidate')}</LinkButton>}>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label={t('campaigns.name')} value={candidateMatches ? candidateLabel(candidateProfile, campaign, t('common.notAvailable'), t('campaigns.candidateProfile')) : t('common.notAvailable')} />
                <DetailItem label={t('campaigns.role')} value={candidateMatches ? candidateProfile?.desired_occupation || candidateProfile?.current_occupation || t('common.notAvailable') : t('common.notAvailable')} />
                <DetailItem label={t('campaigns.country')} value={candidateMatches ? candidateProfile?.preferred_countries.join(', ') || t('common.notAvailable') : t('common.notAvailable')} />
                <DetailItem label={t('campaigns.experience')} value={candidateMatches && candidateProfile?.years_of_experience !== null ? t('campaigns.years').replace('{count}', String(candidateProfile?.years_of_experience)) : t('common.notAvailable')} />
              </div>
            </DetailSection>

            <DetailSection title={t('campaigns.resume')} action={<LinkButton to="/career/resumes">{t('campaigns.openResume')}</LinkButton>}>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label={t('campaigns.name')} value={resume?.display_name ?? t('common.notAvailable')} />
                <DetailItem label={t('campaigns.lastUpdated')} value={formatDate(resume?.updated_at ?? resume?.created_at, t('common.notAvailable'))} />
              </div>
            </DetailSection>

            <DetailSection title={t('campaigns.linkedin')} action={<LinkButton to="/career/linkedin-accounts">{t('campaigns.openLinkedinAccount')}</LinkButton>}>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label={t('campaigns.account')} value={linkedInAccount?.display_name ?? t('common.notAvailable')} />
                <DetailItem label={t('campaigns.email')} value={linkedInAccount?.linkedin_email ?? t('common.notAvailable')} />
                <DetailItem label={t('campaigns.status')} value={linkedInAccount?.status ?? t('common.notAvailable')} />
                <DetailItem label={t('campaigns.lastUsed')} value={formatDate(linkedInAccount?.last_used_at ?? linkedInAccount?.last_sync_at, t('common.notAvailable'))} />
              </div>
            </DetailSection>

            <DetailSection title={t('campaigns.discoverySources')} action={<LinkButton to="/career/discovery-sources">{t('campaigns.openDiscoverySources')}</LinkButton>}>
              {!discoverySourcesLoaded ? (
                <EmptyState title={t('campaigns.discoverySourcesUnavailable')} message={t('campaigns.discoverySourcesUnavailableDescription')} />
              ) : discoverySources.length > 0 ? (
                <div className="grid gap-2">
                  {discoverySources.map(source => (
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between" key={source.source_id}>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900">{source.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{source.search_keywords || source.search_url}</div>
                      </div>
                      <Link className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" to="/career/discovery-sources">
                        {t('campaigns.open')}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title={t('campaigns.noActiveDiscoverySources')} message={t('campaigns.noActiveDiscoverySourcesDescription')} />
              )}
            </DetailSection>

            <DetailSection title={t('campaigns.campaignProfile')}>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label={t('campaigns.name')} value={campaign.name} />
                <DetailItem label={t('campaigns.profileDescription')} value={campaign.primary_search_intent || t('common.notAvailable')} />
                <DetailItem label={t('campaigns.countries')} value={campaign.preferred_countries.join(', ') || t('common.notAvailable')} />
                <DetailItem label={t('campaigns.provinces')} value={campaign.preferred_provinces.join(', ') || t('common.notAvailable')} />
                <DetailItem label={t('campaigns.remotePreference')} value={campaign.remote_preference || t('common.notAvailable')} />
                <DetailItem label={t('campaigns.employmentTypes')} value={campaign.employment_types.join(', ') || t('common.notAvailable')} />
                <DetailItem label={t('campaigns.languages')} value={campaign.languages.join(', ') || t('common.notAvailable')} />
              </div>
            </DetailSection>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <LinkButton to={`/agent/executions?q=${encodeURIComponent(campaign.name)}`}>{t('campaigns.openExecutions')}</LinkButton>
          {campaign.active && (
            <Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={`/career/campaigns/setup?mode=edit&campaign_profile_id=${encodeURIComponent(campaign.campaign_profile_id)}`}>
              {t('campaigns.editCampaign')}
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}

function DetailSection({
  title,
  action,
  children
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  )
}

function LinkButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" to={to}>
      {children}
    </Link>
  )
}
