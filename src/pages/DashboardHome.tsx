import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ErrorState,
  InfoAlert,
  InfoCard,
  LoadingState,
  PageContainer,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  AgentExecutionSummary,
  Campaign,
  listAgentExecutions,
  listCampaigns,
  listOpportunities,
  Opportunity,
  platformHealth
} from '../lib/api'
import { CandidateProfile, getCandidateProfile } from '../lib/candidateProfileApi'
import { CandidateResume, listResumes } from '../lib/resumeApi'
import { LinkedInAccount, listLinkedInAccounts } from '../lib/linkedinAccountApi'
import { CampaignProfile, listCampaignProfiles } from '../lib/campaignProfileApi'

type HomeState = {
  executions: AgentExecutionSummary[]
  campaigns: Campaign[]
  recommendations: Opportunity[]
  candidateProfile: CandidateProfile | null
  resumes: CandidateResume[]
  linkedInAccounts: LinkedInAccount[]
  campaignProfiles: CampaignProfile[]
  databaseHealthy: boolean
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA').format(value)
}

function formatMatch(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}`
}

function readable(value: string | null | undefined) {
  if (!value) return 'Not available'
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function statusTone(status: string): 'emerald' | 'red' | 'blue' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED') return 'red'
  return 'blue'
}

function decisionTone(decision: string | null | undefined): 'emerald' | 'amber' | 'red' | 'slate' {
  if (decision === 'APPLY') return 'emerald'
  if (decision === 'CONSIDER') return 'amber'
  if (decision === 'DO_NOT_APPLY') return 'red'
  return 'slate'
}

function HealthItem({ label, healthy, detail }: { label: string, healthy: boolean, detail?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div>
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {detail && <div className="mt-0.5 text-xs text-slate-500">{detail}</div>}
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {healthy ? 'OK' : 'Needs attention'}
      </span>
    </div>
  )
}

export default function DashboardHome() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [data, setData] = useState<HomeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      listAgentExecutions({ limit: 5, offset: 0, sort_by: 'started_at', order: 'desc' }),
      listCampaigns(25, 0),
      listOpportunities({ limit: 5, offset: 0, sort_by: 'last_discovered_at', order: 'desc' }),
      getCandidateProfile(),
      listResumes(false),
      listLinkedInAccounts(false),
      listCampaignProfiles(false),
      platformHealth()
    ]).then(results => {
      if (!active) return
      const [
        executionsResult,
        campaignsResult,
        recommendationsResult,
        profileResult,
        resumesResult,
        accountsResult,
        campaignProfilesResult,
        healthResult
      ] = results

      const failed = results.find(result => result.status === 'rejected')
      if (failed) {
        setError((failed as PromiseRejectedResult).reason?.message ?? 'Unable to load Dashboard Home.')
      }

      setData({
        executions: executionsResult.status === 'fulfilled' ? executionsResult.value.items : [],
        campaigns: campaignsResult.status === 'fulfilled' ? campaignsResult.value.items : [],
        recommendations: recommendationsResult.status === 'fulfilled' ? recommendationsResult.value.items : [],
        candidateProfile: profileResult.status === 'fulfilled' ? profileResult.value : null,
        resumes: resumesResult.status === 'fulfilled' ? resumesResult.value : [],
        linkedInAccounts: accountsResult.status === 'fulfilled' ? accountsResult.value : [],
        campaignProfiles: campaignProfilesResult.status === 'fulfilled' ? campaignProfilesResult.value : [],
        databaseHealthy: healthResult.status === 'fulfilled' && healthResult.value.status === 'ok'
      })
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [reloadKey])

  const metrics = useMemo(() => {
    const executions = data?.executions ?? []
    const campaigns = data?.campaigns ?? []
    const recommendations = data?.recommendations ?? []
    const applyCount = recommendations.filter(item => item.recommendation_decision === 'APPLY').length
    const averageMatch = recommendations.length
      ? recommendations.reduce((sum, item) => sum + (item.match_score ?? 0), 0) / recommendations.length
      : null

    return {
      campaigns: campaigns.length,
      executions: executions.length,
      recommendations: recommendations.length,
      applyCount,
      averageMatch
    }
  }, [data])

  if (loading) {
    return <LoadingState title={t('home.loading')} message={t('home.loadingDescription')} />
  }

  if (!data) {
    return <ErrorState title={t('home.errorTitle')} message={error ?? t('home.errorDescription')} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setReloadKey(value => value + 1)}>{t('home.tryAgain')}</button>} />
  }

  const latestExecution = data.executions[0]
  const defaultResume = data.resumes.find(resume => resume.is_default) ?? data.resumes[0]
  const defaultLinkedIn = data.linkedInAccounts.find(account => account.default_account) ?? data.linkedInAccounts[0]
  const activeCampaignProfile = data.campaignProfiles.find(profile => profile.default_profile) ?? data.campaignProfiles[0]
  const profile = data.candidateProfile

  const agentHealth = {
    database: data.databaseHealthy,
    schema: data.databaseHealthy,
    linkedin: data.linkedInAccounts.some(account => account.active),
    resume: data.resumes.some(resume => resume.active),
    candidateProfile: Boolean(profile?.profile_id),
    planner: data.executions.length > 0,
    discovery: data.executions.some(execution => execution.jobs_collected > 0)
  }

  return (
    <PageContainer>
      {error && (
        <InfoAlert className="border-amber-200 bg-amber-50 px-5 py-4 font-medium text-amber-800">
          {error}
        </InfoAlert>
      )}

      <SectionCard className="overflow-hidden rounded-3xl border-slate-200" padded={false}>
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-brand-700 px-6 py-7 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-100">{t('home.welcomeSection')}</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {t('home.welcome')}, {user?.display_name || user?.email || 'Career Scout user'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">{t('home.welcomeDescription')}</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[420px]">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-300">{t('home.lastExecution')}</div>
                <div className="mt-1 font-semibold">{latestExecution ? formatDateTime(latestExecution.started_at) : t('home.noExecutions')}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-300">{t('home.platformStatus')}</div>
                <div className="mt-1 font-semibold">{data.databaseHealthy ? t('home.platformHealthy') : t('home.platformAttention')}</div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={formatNumber(metrics.campaigns)} />
        <StatCard label="Executions" value={formatNumber(metrics.executions)} tone="blue" />
        <StatCard label="Recommendations" value={formatNumber(metrics.recommendations)} tone="violet" />
        <StatCard label="APPLY" value={formatNumber(metrics.applyCount)} tone="emerald" />
        <StatCard label="Average Match" value={formatMatch(metrics.averageMatch)} subtitle="Recent recommendations" />
        <StatCard label="Active Resume" value={defaultResume ? '1' : '0'} subtitle={defaultResume?.display_name ?? 'No active resume'} tone={defaultResume ? 'emerald' : 'amber'} />
        <StatCard label="LinkedIn Accounts" value={formatNumber(data.linkedInAccounts.filter(account => account.active).length)} subtitle={defaultLinkedIn?.display_name ?? 'No account connected'} />
        <StatCard label="Candidate Profiles" value={profile?.profile_id ? '1' : '0'} subtitle={profile?.desired_occupation || profile?.current_occupation || 'Profile not configured'} tone={profile?.profile_id ? 'emerald' : 'amber'} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <InfoCard
          label={t('home.currentProfile')}
          title={profile?.desired_occupation || profile?.current_occupation || t('home.profileNotConfigured')}
          actions={<Link className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50" to="/career/candidate-profile">{t('home.manage')}</Link>}
        >
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <ProfileField label={t('home.occupation')} value={profile?.desired_occupation || profile?.current_occupation} />
            <ProfileField label={t('home.careerLevel')} value={profile?.career_level} />
            <ProfileField label={t('home.preferredCountry')} value={profile?.preferred_countries?.[0]} />
            <ProfileField label={t('home.remotePreference')} value={profile?.remote_preference} />
            <ProfileField label={t('home.defaultResume')} value={defaultResume?.display_name} />
            <ProfileField label={t('home.defaultLinkedInAccount')} value={defaultLinkedIn?.display_name} />
          </div>
          {activeCampaignProfile && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="font-bold text-slate-800">{t('home.defaultCampaignProfile')}:</span> {activeCampaignProfile.name}
            </div>
          )}
        </InfoCard>

        <InfoCard label={t('home.agentHealth')} title={t('home.operationalReadiness')}>
          <div className="grid gap-3 md:grid-cols-2">
            <HealthItem label="Database" healthy={agentHealth.database} />
            <HealthItem label="Schema" healthy={agentHealth.schema} />
            <HealthItem label="LinkedIn" healthy={agentHealth.linkedin} detail={defaultLinkedIn?.linkedin_email} />
            <HealthItem label="Resume" healthy={agentHealth.resume} detail={defaultResume?.filename} />
            <HealthItem label="Candidate Profile" healthy={agentHealth.candidateProfile} />
            <HealthItem label="Planner" healthy={agentHealth.planner} />
            <HealthItem label="Discovery" healthy={agentHealth.discovery} />
          </div>
        </InfoCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SectionCard className="rounded-2xl border-slate-200" padded={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">{t('home.recentExecutions')}</div>
              <h3 className="mt-1 text-lg font-extrabold text-slate-950">{t('home.latestAgentRuns')}</h3>
            </div>
            <Link className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500" to="/agent/executions">{t('home.viewAll')}</Link>
          </div>
          {data.executions.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">{t('home.noRecentExecutions')}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.executions.map(execution => (
                <Link className="block p-5 transition hover:bg-slate-50" key={execution.execution_id} to={`/agent/executions/${execution.execution_id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-950">{execution.campaign}</div>
                      <div className="mt-1 font-mono text-xs text-slate-500">{execution.execution_id.slice(0, 8)} · {formatDateTime(execution.started_at)}</div>
                    </div>
                    <StatusBadge tone={statusTone(execution.status)}>{readable(execution.status)}</StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <MiniMetric label="Collected" value={execution.jobs_collected} />
                    <MiniMetric label="Ranked" value={execution.jobs_ranked} />
                    <MiniMetric label="APPLY" value={execution.apply_count} />
                    <MiniMetric label="CONSIDER" value={execution.consider_count} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard className="rounded-2xl border-slate-200" padded={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">{t('home.recentRecommendations')}</div>
              <h3 className="mt-1 text-lg font-extrabold text-slate-950">{t('home.latestRecommendations')}</h3>
            </div>
            <Link className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500" to="/inbox">{t('home.openInbox')}</Link>
          </div>
          {data.recommendations.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">{t('home.noRecentRecommendations')}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recommendations.map(opportunity => (
                <Link className="block p-5 transition hover:bg-slate-50" key={opportunity.opportunity_id} to={`/opportunities/${opportunity.opportunity_id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-950">{opportunity.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{opportunity.company || 'Company not provided'}</div>
                    </div>
                    <StatusBadge tone={decisionTone(opportunity.recommendation_decision)}>{readable(opportunity.recommendation_decision)}</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-1">{formatMatch(opportunity.match_score)} match</span>
                    {opportunity.decision_confidence && <span className="rounded-md bg-slate-100 px-2 py-1">{opportunity.decision_confidence}</span>}
                    {opportunity.occupation_compatibility && <span className="rounded-md bg-slate-100 px-2 py-1">{readable(opportunity.occupation_compatibility)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </PageContainer>
  )
}

function ProfileField({ label, value }: { label: string, value?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-800">{readable(value)}</div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string, value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className="font-black text-slate-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}
