import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { listAgentSettings } from '../lib/agentSettingsApi'
import { listAccessRequests } from '../lib/accessRequestApi'
import { listAdminUsers } from '../lib/authApi'
import { listCampaignProfiles } from '../lib/campaignProfileApi'
import {
  AgentExecutionSummary,
  AuditLogRecord,
  CampaignSchedule,
  listAgentExecutions,
  listAuditLog,
  listCampaigns,
  listCampaignSchedules,
  listNotifications,
  platformHealth
} from '../lib/api'

const NOT_AVAILABLE = 'Not Available'
const runningStatuses = new Set(['QUEUED', 'RUNNING', 'PREPARING', 'VALIDATING', 'PLANNER', 'DISCOVERY', 'MATCH_ENGINE', 'RANKING', 'DECISION', 'RECOMMENDATION', 'STARTED'])

type CountValue = number | null

type AdminCard = {
  title: string
  description: string
  count: CountValue
  href: string
}

type StatusValue = 'OK' | 'ATTENTION' | 'NOT_AVAILABLE'

function formatCount(value: CountValue) {
  return value === null ? NOT_AVAILABLE : new Intl.NumberFormat('en-CA').format(value)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return NOT_AVAILABLE
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function readable(value: string | null | undefined) {
  if (!value) return NOT_AVAILABLE
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function statusTone(status: StatusValue): 'emerald' | 'amber' | 'slate' {
  if (status === 'OK') return 'emerald'
  if (status === 'ATTENTION') return 'amber'
  return 'slate'
}

function QuickAccessCard({ card }: { card: AdminCard }) {
  return (
    <article className="flex min-h-[180px] flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold text-slate-950">{card.title}</h3>
          <StatusBadge tone={card.count === null ? 'slate' : 'brand'}>{formatCount(card.count)}</StatusBadge>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
      </div>
      <div className="mt-5">
        <Link className="inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700" to={card.href}>
          Open
        </Link>
      </div>
    </article>
  )
}

function RecentActivity({ records }: { records: AuditLogRecord[] }) {
  return (
    <div id="recent-activity">
      <SectionCard className="overflow-hidden" padded={false}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-extrabold text-agent-primary">Recent Activity</h3>
          <p className="text-sm text-slate-500">Latest 10 audited platform actions available to this admin user.</p>
        </div>
        {records.length === 0 ? (
          <EmptyState title="No recent activity" message="No audit log entries are available from the current API response." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.slice(0, 10).map(record => (
                  <tr className="transition hover:bg-slate-50/70" key={record.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{record.actor_user_id ?? record.owner_user_id ?? NOT_AVAILABLE}</td>
                    <td className="px-4 py-3"><StatusBadge tone="blue">{readable(record.action)}</StatusBadge></td>
                    <td className="px-4 py-3 text-slate-600">{readable(record.resource_type)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(record.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function PlatformStatus({ statusItems }: { statusItems: Array<{ label: string; status: StatusValue; value: string }> }) {
  return (
    <div id="platform-status">
      <SectionCard>
        <div className="mb-4">
          <h3 className="text-lg font-extrabold text-agent-primary">Platform Status</h3>
          <p className="text-sm text-slate-500">Status composed only from already available platform APIs.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {statusItems.map(item => (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={item.label}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-bold text-slate-950">{item.label}</h4>
                <StatusBadge tone={statusTone(item.status)}>{item.status === 'NOT_AVAILABLE' ? NOT_AVAILABLE : item.status}</StatusBadge>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export default function AdministrationCenterPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usersCount, setUsersCount] = useState<CountValue>(null)
  const [accessRequestsCount, setAccessRequestsCount] = useState<CountValue>(null)
  const [agentSettingsCount, setAgentSettingsCount] = useState<CountValue>(null)
  const [notificationsCount, setNotificationsCount] = useState<CountValue>(null)
  const [schedules, setSchedules] = useState<CampaignSchedule[] | null>(null)
  const [campaignProfilesCount, setCampaignProfilesCount] = useState<CountValue>(null)
  const [campaignsCount, setCampaignsCount] = useState<CountValue>(null)
  const [executions, setExecutions] = useState<AgentExecutionSummary[] | null>(null)
  const [auditRecords, setAuditRecords] = useState<AuditLogRecord[]>([])
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  function load() {
    setLoading(true)
    setError(null)

    Promise.allSettled([
      listAdminUsers(),
      listAccessRequests({ status: 'PENDING' }),
      listAgentSettings(),
      listNotifications({ limit: 100, offset: 0 }),
      listCampaignSchedules(),
      listCampaignProfiles(true),
      listCampaigns(100, 0),
      listAgentExecutions({ sort_by: 'started_at', order: 'desc', limit: 20, offset: 0 }),
      listAuditLog({ limit: 10, offset: 0 }),
      platformHealth()
    ]).then(results => {
      const [usersResult, accessRequestsResult, settingsResult, notificationsResult, schedulesResult, profilesResult, campaignsResult, executionsResult, auditResult, healthResult] = results
      setUsersCount(usersResult.status === 'fulfilled' ? usersResult.value.length : null)
      setAccessRequestsCount(accessRequestsResult.status === 'fulfilled' ? accessRequestsResult.value.length : null)
      setAgentSettingsCount(settingsResult.status === 'fulfilled' ? settingsResult.value.length : null)
      setNotificationsCount(notificationsResult.status === 'fulfilled' ? notificationsResult.value.length : null)
      setSchedules(schedulesResult.status === 'fulfilled' ? schedulesResult.value : null)
      setCampaignProfilesCount(profilesResult.status === 'fulfilled' ? profilesResult.value.length : null)
      setCampaignsCount(campaignsResult.status === 'fulfilled' ? campaignsResult.value.returned : null)
      setExecutions(executionsResult.status === 'fulfilled' ? executionsResult.value.items : null)
      setAuditRecords(auditResult.status === 'fulfilled' ? auditResult.value : [])
      setHealthOk(healthResult.status === 'fulfilled' && healthResult.value.status === 'ok')

      const failed = results.some(result => result.status === 'rejected')
      setError(failed ? 'Some administration signals are unavailable. Missing values are shown as Not Available.' : null)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const cards = useMemo<AdminCard[]>(() => [
    {
      title: 'Users',
      description: 'Create, activate, block, and reset platform users.',
      count: usersCount,
      href: '/admin/users'
    },
    {
      title: 'Platform Health',
      description: 'Review API, execution, and campaign health signals.',
      count: healthOk === null ? null : healthOk ? 1 : 0,
      href: '/admin/platform-health'
    },
    {
      title: 'Access Requests',
      description: 'Review pending requests from people asking to join the platform.',
      count: accessRequestsCount,
      href: '/admin/access-requests'
    },
    {
      title: 'Audit Log',
      description: 'Inspect the most recent audited platform actions.',
      count: auditRecords.length,
      href: '/admin#recent-activity'
    },
    {
      title: 'Agent Settings',
      description: 'Manage platform-owned agent configuration values.',
      count: agentSettingsCount,
      href: '/admin/agent-settings'
    },
    {
      title: 'Notifications',
      description: 'Review campaign, replay, and scheduler notifications.',
      count: notificationsCount,
      href: '/notifications'
    },
    {
      title: 'Scheduler',
      description: 'Monitor campaign schedules available from the scheduler API.',
      count: schedules === null ? null : schedules.length,
      href: '/admin/platform-health'
    },
      {
        title: 'Campaigns',
        description: 'Open campaign setup, management, and execution entry points.',
        count: Math.max(campaignProfilesCount ?? 0, campaignsCount ?? 0) || (campaignProfilesCount === null && campaignsCount === null ? null : 0),
        href: '/career/campaigns'
      },
    {
      title: 'Executions',
      description: 'Track recent agent execution runs and details.',
      count: executions === null ? null : executions.length,
      href: '/agent/executions'
    }
  ], [accessRequestsCount, agentSettingsCount, auditRecords.length, campaignProfilesCount, campaignsCount, executions, healthOk, notificationsCount, schedules, usersCount])

  const runningExecutions = useMemo(
    () => executions?.filter(execution => runningStatuses.has(execution.status)).length ?? null,
    [executions]
  )

  const statusItems = useMemo(() => [
    {
      label: 'API',
      status: healthOk ? 'OK' as const : healthOk === false ? 'ATTENTION' as const : 'NOT_AVAILABLE' as const,
      value: healthOk === null ? NOT_AVAILABLE : healthOk ? 'Health endpoint responded ok.' : 'Health endpoint did not report ok.'
    },
    {
      label: 'Database',
      status: healthOk ? 'OK' as const : 'NOT_AVAILABLE' as const,
      value: healthOk ? 'Inferred from successful health check.' : NOT_AVAILABLE
    },
    {
      label: 'Scheduler',
      status: schedules === null ? 'NOT_AVAILABLE' as const : 'OK' as const,
      value: schedules === null ? NOT_AVAILABLE : `${schedules.length} schedules available`
    },
    {
      label: 'Queue',
      status: 'NOT_AVAILABLE' as const,
      value: NOT_AVAILABLE
    },
    {
      label: 'Executions Running',
      status: runningExecutions === null ? 'NOT_AVAILABLE' as const : runningExecutions > 0 ? 'ATTENTION' as const : 'OK' as const,
      value: runningExecutions === null ? NOT_AVAILABLE : String(runningExecutions)
    }
  ], [healthOk, runningExecutions, schedules])

  if (loading) {
    return <LoadingState title="Loading Administration Center" message="Fetching available administration signals from existing APIs." />
  }

  return (
    <PageContainer size="xl">
      <PageHeader
        eyebrow="Administration"
        title="Administration Center"
        description="Centralized access to platform administration, activity, and operational status."
        actions={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={load} type="button">Refresh</button>}
      />

      {error && (
        <ErrorState
          title="Some signals are unavailable"
          message={error}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => <QuickAccessCard card={card} key={card.title} />)}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={formatCount(usersCount)} tone="blue" />
        <StatCard label="Schedules" value={formatCount(schedules === null ? null : schedules.length)} tone="emerald" />
        <StatCard label="Executions Running" value={formatCount(runningExecutions)} tone={runningExecutions && runningExecutions > 0 ? 'amber' : 'slate'} />
        <StatCard label="Audit Events" value={formatCount(auditRecords.length)} tone="violet" />
      </div>

      <PlatformStatus statusItems={statusItems} />
      <RecentActivity records={auditRecords} />
    </PageContainer>
  )
}
