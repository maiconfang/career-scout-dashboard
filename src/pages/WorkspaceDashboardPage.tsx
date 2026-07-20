import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listCampaignProfiles, type CampaignProfile } from '../lib/campaignProfileApi'
import { getCandidateProfile, type CandidateProfile } from '../lib/candidateProfileApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import {
  getCandidateIntelligence,
  getResumeOptimization,
  listAgentExecutions,
  listNotifications,
  type AgentExecutionSummary,
  type CandidateIntelligence,
  type PlatformNotification,
  type ResumeOptimization
} from '../lib/api'
import { replayCampaignExecution } from '../lib/campaignRunApi'
import { CampaignRunAction } from '../components/CampaignRunAction'
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  InfoCard,
  LoadingState,
  PageActions,
  PageContainer,
  PageHeader,
  ProgressBar,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'

const NOT_AVAILABLE = 'Not Available'

type WorkspaceData = {
  candidateProfile: CandidateProfile | null
  resumes: CandidateResume[]
  linkedInAccounts: LinkedInAccount[]
  campaignProfiles: CampaignProfile[]
  notifications: PlatformNotification[]
  executions: AgentExecutionSummary[]
  candidateIntelligence: CandidateIntelligence | null
  resumeOptimization: ResumeOptimization | null
}

type InsightValue = string | number | null | undefined

function formatDate(value?: string | null) {
  if (!value) return NOT_AVAILABLE
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readable(value: InsightValue) {
  if (value === null || value === undefined || value === '') return NOT_AVAILABLE
  if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(value % 1 === 0 ? 0 : 1) : NOT_AVAILABLE
  return String(value)
}

function firstStringFromKeys(source: unknown, keys: string[]): string | null {
  if (!isRecord(source)) return null

  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      if (typeof first === 'string') return first
      if (isRecord(first)) {
        const label = first.skill ?? first.name ?? first.company ?? first.source ?? first.title
        if (typeof label === 'string') return label
      }
    }
    if (isRecord(value)) {
      const label = value.skill ?? value.name ?? value.company ?? value.source ?? value.title
      if (typeof label === 'string') return label
    }
  }

  return null
}

function firstNumberFromKeys(source: unknown, keys: string[]): number | null {
  if (!isRecord(source)) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function activeDefaultCampaign(campaignProfiles: CampaignProfile[]) {
  return campaignProfiles.find(profile => profile.active && profile.default_profile)
    ?? campaignProfiles.find(profile => profile.active)
    ?? null
}

export default function WorkspaceDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replayOpen, setReplayOpen] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const [replayError, setReplayError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadWorkspace() {
      setLoading(true)
      setError(null)

      const [
        candidateProfileResult,
        resumesResult,
        linkedInAccountsResult,
        campaignProfilesResult,
        notificationsResult,
        executionsResult,
        candidateIntelligenceResult,
        resumeOptimizationResult
      ] = await Promise.allSettled([
        getCandidateProfile(),
        listResumes(true),
        listLinkedInAccounts(true),
        listCampaignProfiles(true),
        listNotifications({ limit: 100, offset: 0 }),
        listAgentExecutions({ limit: 20, offset: 0, sort_by: 'started_at', order: 'desc' }),
        getCandidateIntelligence(),
        getResumeOptimization()
      ])

      if (!active) return

      const nextData: WorkspaceData = {
        candidateProfile: candidateProfileResult.status === 'fulfilled' ? candidateProfileResult.value : null,
        resumes: resumesResult.status === 'fulfilled' ? resumesResult.value : [],
        linkedInAccounts: linkedInAccountsResult.status === 'fulfilled' ? linkedInAccountsResult.value : [],
        campaignProfiles: campaignProfilesResult.status === 'fulfilled' ? campaignProfilesResult.value : [],
        notifications: notificationsResult.status === 'fulfilled' ? notificationsResult.value : [],
        executions: executionsResult.status === 'fulfilled' ? executionsResult.value.items : [],
        candidateIntelligence: candidateIntelligenceResult.status === 'fulfilled' ? candidateIntelligenceResult.value : null,
        resumeOptimization: resumeOptimizationResult.status === 'fulfilled' ? resumeOptimizationResult.value : null
      }

      setData(nextData)
      setLoading(false)

      const failures = [
        candidateProfileResult,
        resumesResult,
        linkedInAccountsResult,
        campaignProfilesResult,
        notificationsResult,
        executionsResult,
        candidateIntelligenceResult,
        resumeOptimizationResult
      ].filter(result => result.status === 'rejected')

      if (failures.length === 8) {
        setError('Workspace data is unavailable right now.')
      }
    }

    void loadWorkspace()
    return () => {
      active = false
    }
  }, [])

  const readiness = useMemo(() => {
    const candidateProfileReady = Boolean(data?.candidateProfile?.profile_id)
    const resumeReady = Boolean(data?.resumes.some(resume => resume.active && resume.is_default) ?? data?.resumes.some(resume => resume.active))
    const linkedInReady = Boolean(data?.linkedInAccounts.some(account => account.active && account.default_account) ?? data?.linkedInAccounts.some(account => account.active))
    const campaignProfileReady = Boolean(data?.campaignProfiles.some(profile => profile.active))

    return [
      { label: 'Candidate Profile', ready: candidateProfileReady, path: '/career/candidate-profile' },
      { label: 'Resume', ready: resumeReady, path: '/career/resumes' },
      { label: 'LinkedIn', ready: linkedInReady, path: '/career/linkedin-accounts' },
      { label: 'Campaign', ready: campaignProfileReady, path: '/career/campaigns' },
      { label: 'Ready to Run Campaign', ready: candidateProfileReady && resumeReady && linkedInReady && campaignProfileReady, path: '/career/campaigns' }
    ]
  }, [data])

  const defaultCampaign = useMemo(() => activeDefaultCampaign(data?.campaignProfiles ?? []), [data])
  const latestExecution = data?.executions[0] ?? null
  const latestNotification = data?.notifications[0] ?? null
  const latestCampaign = data?.campaignProfiles
    .filter(profile => profile.active)
    .sort((first, second) => String(second.updated_at ?? second.created_at ?? '').localeCompare(String(first.updated_at ?? first.created_at ?? '')))[0] ?? null
  const resumeCoverage = data?.resumeOptimization?.current_resume_coverage ?? null
  const averageMatch = firstNumberFromKeys(data?.candidateIntelligence, ['average_match', 'average_match_score', 'match_medio', 'match_average'])
  const topSkill = firstStringFromKeys(data?.candidateIntelligence, ['top_skills', 'top_skills_found', 'top_skill', 'strongest_skills'])
    ?? data?.resumeOptimization?.top_skills_already_present?.[0]?.skill
  const mainSkillGap = firstStringFromKeys(data?.candidateIntelligence, ['missing_skills', 'most_missing_skills', 'main_skill_gap', 'skill_gaps'])
    ?? data?.resumeOptimization?.most_frequent_missing_skills?.[0]?.skill
  const bestCompany = firstStringFromKeys(data?.candidateIntelligence, ['best_company', 'top_company', 'companies_with_highest_apply_rate', 'companies_with_highest_offer_rate'])
  const bestSource = firstStringFromKeys(data?.candidateIntelligence, ['best_source', 'top_source', 'sources_with_best_result'])

  async function handleReplay() {
    if (!latestExecution) return
    setReplaying(true)
    setReplayError(null)
    try {
      const response = await replayCampaignExecution(latestExecution.execution_id)
      setReplayOpen(false)
      navigate(`/agent/executions/${response.execution_id}`)
    } catch (requestError) {
      setReplayError(requestError instanceof Error ? requestError.message : 'Unable to replay the last campaign.')
    } finally {
      setReplaying(false)
    }
  }

  if (loading) {
    return <LoadingState title="Loading Workspace" message="Collecting your account readiness, recent activity, and insights." />
  }

  if (error || !data) {
    return <ErrorState title="Workspace unavailable" message={error ?? 'Workspace data could not be loaded.'} />
  }

  return (
    <PageContainer className="space-y-6" size="xl">
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome${user?.display_name ? `, ${user.display_name}` : ''}`}
        description="A fast account-level view of campaign readiness, recent activity, and personal intelligence."
        actions={(
          <PageActions>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/notifications">
              Open Notifications
            </Link>
            <Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/career/campaigns">
              Campaigns
            </Link>
          </PageActions>
        )}
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Workspace Readiness">
          <div className="space-y-3">
            {readiness.map(item => (
              <Link key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 transition hover:bg-slate-50" to={item.path}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${item.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.ready ? '✓' : '!'}
                  </span>
                  <span className="font-semibold text-slate-800">{item.label}</span>
                </span>
                <StatusBadge tone={item.ready ? 'emerald' : 'amber'}>{item.ready ? 'Ready' : 'Needs setup'}</StatusBadge>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions">
          <div className="grid gap-2 sm:grid-cols-2">
            {defaultCampaign ? (
              <CampaignRunAction
                campaignProfileId={defaultCampaign.campaign_profile_id}
                campaignProfileName={defaultCampaign.name}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              />
            ) : (
              <Link className="rounded-lg bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700" to="/career/campaigns">
                Run Campaign
              </Link>
            )}
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!latestExecution}
              onClick={() => setReplayOpen(true)}
            >
              Replay Last Campaign
            </button>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/notifications">Open Notifications</Link>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/resume-optimization">Resume Optimization</Link>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/analytics/intelligence">Career Intelligence</Link>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/analytics/career">Analytics</Link>
          </div>
          {replayError && <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{replayError}</div>}
        </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Campaigns" value={data.campaignProfiles.length} subtitle="Loaded Campaigns" tone="blue" />
        <StatCard label="Total Executions" value={data.executions.length} subtitle="Recent execution records" tone="violet" />
        <StatCard label="Total Notifications" value={data.notifications.length} subtitle="Recent notifications" tone="amber" />
        <StatCard label="Average Match" value={averageMatch === null ? NOT_AVAILABLE : `${readable(averageMatch)}%`} subtitle="Candidate intelligence" tone="emerald" />
        <StatCard label="Resume Coverage" value={resumeCoverage === null ? NOT_AVAILABLE : `${readable(resumeCoverage)}%`} subtitle="Resume optimization" tone="slate" />
      </section>

      {resumeCoverage !== null && (
        <SectionCard title="Coverage Snapshot">
          <ProgressBar value={resumeCoverage} label={`${readable(resumeCoverage)}%`} tone="emerald" />
        </SectionCard>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard label="Recent Activity" title="Last Campaign">
          {latestCampaign ? (
            <div className="space-y-2 text-sm text-slate-600">
              <div className="font-bold text-slate-900">{latestCampaign.name}</div>
              <div>{latestCampaign.primary_search_intent || NOT_AVAILABLE}</div>
              <div>Updated {formatDate(latestCampaign.updated_at ?? latestCampaign.created_at)}</div>
            </div>
          ) : (
            <EmptyState title="No Campaign" message="No Campaign was returned by the API." />
          )}
        </InfoCard>

        <InfoCard label="Recent Activity" title="Last Execution">
          {latestExecution ? (
            <Link className="block space-y-2 text-sm text-slate-600" to={`/agent/executions/${latestExecution.execution_id}`}>
              <div className="font-bold text-slate-900">{latestExecution.campaign || latestExecution.execution_id}</div>
              <StatusBadge>{latestExecution.status}</StatusBadge>
              <div>Started {formatDate(latestExecution.started_at)}</div>
            </Link>
          ) : (
            <EmptyState title="No execution" message="No Agent Execution was returned by the API." />
          )}
        </InfoCard>

        <InfoCard label="Recent Activity" title="Last Notification">
          {latestNotification ? (
            <Link className="block space-y-2 text-sm text-slate-600" to={latestNotification.related_execution_id ? `/agent/executions/${latestNotification.related_execution_id}` : '/notifications'}>
              <div className="font-bold text-slate-900">{latestNotification.title}</div>
              <div>{latestNotification.message}</div>
              <div>{formatDate(latestNotification.created_at)}</div>
            </Link>
          ) : (
            <EmptyState title="No notification" message="No notification was returned by the API." />
          )}
        </InfoCard>
      </section>

      <SectionCard title="Personal Insights">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Top Skill" title={readable(topSkill)}>
            <p className="text-sm text-slate-600">Most visible skill from candidate intelligence or resume optimization.</p>
          </InfoCard>
          <InfoCard label="Main Skill Gap" title={readable(mainSkillGap)}>
            <p className="text-sm text-slate-600">Highest-priority gap detected from historical opportunities.</p>
          </InfoCard>
          <InfoCard label="Best Company" title={readable(bestCompany)}>
            <p className="text-sm text-slate-600">Company signal available from candidate intelligence.</p>
          </InfoCard>
          <InfoCard label="Best Source" title={readable(bestSource)}>
            <p className="text-sm text-slate-600">Source signal available from candidate intelligence.</p>
          </InfoCard>
        </div>
      </SectionCard>

      <ConfirmationDialog
        open={replayOpen}
        title="Replay Last Campaign"
        description={latestExecution ? `Create a new replay execution from "${latestExecution.campaign || latestExecution.execution_id}"?` : undefined}
        confirmLabel={replaying ? 'Replaying...' : 'Replay Campaign'}
        cancelLabel="Cancel"
        confirmDisabled={replaying}
        onCancel={() => {
          if (!replaying) setReplayOpen(false)
        }}
        onConfirm={() => void handleReplay()}
      />
    </PageContainer>
  )
}
