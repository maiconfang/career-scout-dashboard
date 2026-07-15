import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, StatusBadge, ConfirmationDialog } from './design-system'
import { getCandidateProfile } from '../lib/candidateProfileApi'
import { listCampaignProfiles, type CampaignProfile } from '../lib/campaignProfileApi'
import { listLinkedInAccounts } from '../lib/linkedinAccountApi'
import { listResumes } from '../lib/resumeApi'
import { listAgentExecutions, listNotifications, listOpportunities } from '../lib/api'
import { runCampaign } from '../lib/campaignRunApi'

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
}

type ResultGroup = 'Campaigns' | 'Executions' | 'Opportunities' | 'Navigation' | 'Actions'

type CommandResult = {
  id: string
  group: ResultGroup
  title: string
  subtitle?: string
  badge?: string
  action: () => void | Promise<void>
}

const navigationCommands = [
  {
    id: 'open-workspace',
    title: 'Open Workspace',
    subtitle: 'View account readiness, quick stats, and personal insights',
    path: '/workspace'
  },
  {
    id: 'open-run-campaign-wizard',
    title: 'Open Run Campaign Wizard',
    subtitle: 'Start a guided campaign run with setup validation',
    path: '/agent/run-campaign'
  },
  {
    id: 'open-notifications',
    title: 'Open Notifications',
    subtitle: 'View campaign, replay, and scheduler notifications',
    path: '/notifications'
  },
  {
    id: 'open-analytics',
    title: 'Open Analytics',
    subtitle: 'Review feedback and campaign analytics',
    path: '/analytics/career'
  },
  {
    id: 'open-resume-optimization',
    title: 'Open Resume Optimization',
    subtitle: 'Review resume coverage and skill priorities',
    path: '/career/resume-optimization'
  },
  {
    id: 'open-career-intelligence',
    title: 'Open Career Intelligence',
    subtitle: 'Review candidate intelligence insights',
    path: '/analytics/intelligence'
  },
  {
    id: 'open-platform-health',
    title: 'Open Platform Health',
    subtitle: 'Monitor operational platform health',
    path: '/admin/platform-health'
  },
  {
    id: 'open-admin-center',
    title: 'Open Administration Center',
    subtitle: 'Open the administration hub',
    path: '/admin'
  },
  {
    id: 'open-scheduler',
    title: 'Open Scheduler',
    subtitle: 'Open scheduler visibility in Platform Health',
    path: '/admin/platform-health'
  },
  {
    id: 'open-audit-log',
    title: 'Open Audit Log',
    subtitle: 'Open recent activity in Administration Center',
    path: '/admin'
  }
]

const actionCommands = [
  {
    id: 'create-campaign',
    title: 'Create Campaign',
    subtitle: 'Open Campaign Profiles to create a new campaign profile',
    path: '/career/campaign-profiles'
  }
]

function matchesQuery(query: string, ...values: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some(value => value?.toLowerCase().includes(normalized))
}

function resultIcon(group: ResultGroup) {
  const iconClass = 'h-4 w-4'
  if (group === 'Campaigns') {
    return (
      <svg aria-hidden="true" className={iconClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 7h16" />
        <path d="M4 12h10" />
        <path d="M4 17h7" />
      </svg>
    )
  }
  if (group === 'Executions') {
    return (
      <svg aria-hidden="true" className={iconClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    )
  }
  if (group === 'Opportunities') {
    return (
      <svg aria-hidden="true" className={iconClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="14" rx="2" width="18" x="3" y="7" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    )
  }
  if (group === 'Actions') {
    return (
      <svg aria-hidden="true" className={iconClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" className={iconClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [campaignToRun, setCampaignToRun] = useState<CampaignProfile | null>(null)
  const [runningCampaign, setRunningCampaign] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    if (!open) return

    let active = true
    const debounce = window.setTimeout(() => {
      async function loadResults() {
        setLoading(true)
        setError('')

        const [
          campaignProfilesResult,
          executionsResult,
          opportunitiesResult,
          notificationsResult,
          candidateProfileResult,
          resumesResult,
          linkedinAccountsResult
        ] = await Promise.allSettled([
          listCampaignProfiles(true),
          listAgentExecutions({ q: query || undefined, limit: 8, offset: 0 }),
          listOpportunities({ q: query || undefined, limit: 8, offset: 0 }),
          listNotifications({ limit: 8, offset: 0 }),
          getCandidateProfile(),
          listResumes(true),
          listLinkedInAccounts(true)
        ])

        if (!active) return

        const nextResults: CommandResult[] = []
        const campaignProfiles = campaignProfilesResult.status === 'fulfilled' ? campaignProfilesResult.value : []
        campaignProfiles
          .filter(profile => matchesQuery(query, profile.name, profile.primary_search_intent, profile.status))
          .slice(0, 8)
          .forEach(profile => {
            nextResults.push({
              id: `campaign-${profile.campaign_profile_id}`,
              group: 'Campaigns',
              title: profile.name,
              subtitle: profile.primary_search_intent,
              badge: profile.default_profile ? 'Default' : profile.status,
              action: () => {
                onClose()
                navigate('/career/campaign-profiles')
              }
            })
          })

        const firstCampaign = campaignProfiles.find(profile => profile.active) ?? campaignProfiles[0]
        if (firstCampaign && matchesQuery(query, 'run campaign', firstCampaign.name, firstCampaign.primary_search_intent)) {
          nextResults.push({
            id: `run-campaign-${firstCampaign.campaign_profile_id}`,
            group: 'Actions',
            title: `Run Campaign: ${firstCampaign.name}`,
            subtitle: 'Create a new campaign execution from this Campaign Profile',
            badge: 'Run',
            action: () => setCampaignToRun(firstCampaign)
          })
        }

        if (executionsResult.status === 'fulfilled') {
          executionsResult.value.items.slice(0, 8).forEach(execution => {
            nextResults.push({
              id: `execution-${execution.execution_id}`,
              group: 'Executions',
              title: execution.campaign || execution.execution_id,
              subtitle: execution.execution_id,
              badge: execution.status,
              action: () => {
                onClose()
                navigate(`/agent/executions/${execution.execution_id}`)
              }
            })
          })
        }

        if (opportunitiesResult.status === 'fulfilled') {
          opportunitiesResult.value.items.slice(0, 8).forEach(opportunity => {
            nextResults.push({
              id: `opportunity-${opportunity.opportunity_id}`,
              group: 'Opportunities',
              title: opportunity.title,
              subtitle: [opportunity.company, opportunity.location].filter(Boolean).join(' · '),
              badge: opportunity.recommendation_decision ?? undefined,
              action: () => {
                onClose()
                navigate(`/opportunities/${opportunity.opportunity_id}`)
              }
            })
          })
        }

        if (notificationsResult.status === 'fulfilled') {
          notificationsResult.value
            .filter(notification => matchesQuery(query, notification.title, notification.message, notification.type))
            .slice(0, 5)
            .forEach(notification => {
              nextResults.push({
                id: `notification-${notification.id}`,
                group: 'Navigation',
                title: notification.title,
                subtitle: notification.message,
                badge: notification.is_read ? 'Read' : 'Unread',
                action: () => {
                  onClose()
                  navigate(notification.related_execution_id ? `/agent/executions/${notification.related_execution_id}` : '/notifications')
                }
              })
            })
        }

        if (candidateProfileResult.status === 'fulfilled' && matchesQuery(query, 'candidate profile', candidateProfileResult.value.current_occupation, candidateProfileResult.value.desired_occupation)) {
          nextResults.push({
            id: 'candidate-profile',
            group: 'Navigation',
            title: 'Candidate Profile',
            subtitle: [candidateProfileResult.value.current_occupation, candidateProfileResult.value.desired_occupation].filter(Boolean).join(' → '),
            badge: candidateProfileResult.value.profile_id ? 'Profile' : undefined,
            action: () => {
              onClose()
              navigate('/career/candidate-profile')
            }
          })
        }

        if (resumesResult.status === 'fulfilled') {
          resumesResult.value
            .filter(resume => matchesQuery(query, resume.display_name, resume.filename, resume.status))
            .slice(0, 5)
            .forEach(resume => {
              nextResults.push({
                id: `resume-${resume.resume_id}`,
                group: 'Navigation',
                title: resume.display_name || resume.filename,
                subtitle: resume.filename,
                badge: resume.is_default ? 'Default Resume' : resume.status,
                action: () => {
                  onClose()
                  navigate('/career/resumes')
                }
              })
            })
        }

        if (linkedinAccountsResult.status === 'fulfilled') {
          linkedinAccountsResult.value
            .filter(account => matchesQuery(query, account.display_name, account.linkedin_email, account.status))
            .slice(0, 5)
            .forEach(account => {
              nextResults.push({
                id: `linkedin-${account.account_id}`,
                group: 'Navigation',
                title: account.display_name,
                subtitle: account.linkedin_email,
                badge: account.default_account ? 'Default LinkedIn' : account.status,
                action: () => {
                  onClose()
                  navigate('/career/linkedin-accounts')
                }
              })
            })
        }

        navigationCommands
          .filter(command => matchesQuery(query, command.title, command.subtitle))
          .forEach(command => {
            nextResults.push({
              id: command.id,
              group: command.id === 'open-admin-center' || command.id === 'open-scheduler' || command.id === 'open-audit-log' ? 'Actions' : 'Navigation',
              title: command.title,
              subtitle: command.subtitle,
              action: () => {
                onClose()
                navigate(command.path)
              }
            })
          })

        actionCommands
          .filter(command => matchesQuery(query, command.title, command.subtitle))
          .forEach(command => {
            nextResults.push({
              id: command.id,
              group: 'Actions',
              title: command.title,
              subtitle: command.subtitle,
              action: () => {
                onClose()
                navigate(command.path)
              }
            })
          })

        if (!firstCampaign && matchesQuery(query, 'run campaign')) {
          nextResults.push({
            id: 'run-campaign-open-profiles',
            group: 'Actions',
            title: 'Run Campaign',
            subtitle: 'Open Campaign Profiles to choose a campaign to run',
            action: () => {
              onClose()
              navigate('/career/campaign-profiles')
            }
          })
        }

        setResults(nextResults)
        setActiveIndex(current => Math.min(current, Math.max(nextResults.length - 1, 0)))
        setLoading(false)

        const requiredFailures = [
          campaignProfilesResult,
          executionsResult,
          opportunitiesResult,
          notificationsResult,
          candidateProfileResult,
          resumesResult,
          linkedinAccountsResult
        ].filter(result => result.status === 'rejected')
        if (requiredFailures.length === 7) {
          setError('Search is temporarily unavailable.')
        }
      }

      void loadResults()
    }, 180)

    return () => {
      active = false
      window.clearTimeout(debounce)
    }
  }, [navigate, onClose, open, query])

  const groupedResults = useMemo(() => {
    return results.reduce<Record<ResultGroup, CommandResult[]>>((groups, result) => {
      groups[result.group].push(result)
      return groups
    }, {
      Campaigns: [],
      Executions: [],
      Opportunities: [],
      Navigation: [],
      Actions: []
    })
  }, [results])

  const activeResult = results[activeIndex]

  async function runSelectedCampaign() {
    if (!campaignToRun) return
    setRunningCampaign(true)
    try {
      const response = await runCampaign(campaignToRun.campaign_profile_id)
      setCampaignToRun(null)
      onClose()
      navigate(`/agent/executions/${response.execution_id}`)
    } catch {
      setError('Campaign could not be started from the command palette.')
    } finally {
      setRunningCampaign(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/45 p-4 pt-20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onMouseDown={event => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <h2 id="command-palette-title" className="sr-only">Command Palette</h2>
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <svg aria-hidden="true" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                className="min-w-0 flex-1 border-0 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Search or run a command..."
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    onClose()
                    return
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setActiveIndex(index => Math.min(index + 1, Math.max(results.length - 1, 0)))
                    return
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setActiveIndex(index => Math.max(index - 1, 0))
                    return
                  }
                  if (event.key === 'Enter' && activeResult) {
                    event.preventDefault()
                    void activeResult.action()
                  }
                }}
                aria-controls="command-palette-results"
                aria-activedescendant={activeResult ? `command-result-${activeResult.id}` : undefined}
              />
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">Esc</kbd>
            </div>
          </div>

          <div id="command-palette-results" className="max-h-[65vh] overflow-y-auto p-3" role="listbox" aria-label="Command palette results">
            {loading && (
              <div className="px-3 py-8 text-center text-sm font-medium text-slate-500">Searching...</div>
            )}
            {!loading && error && (
              <div className="px-3 py-8 text-center text-sm font-medium text-red-600">{error}</div>
            )}
            {!loading && !error && results.length === 0 && (
              <EmptyState title="No results" message="Try a campaign, opportunity, execution, or command name." />
            )}
            {!loading && !error && (Object.keys(groupedResults) as ResultGroup[]).map(group => groupedResults[group].length > 0 && (
              <section key={group} className="mb-4 last:mb-0">
                <h3 className="px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {group}
                </h3>
                <div className="space-y-1">
                  {groupedResults[group].map(result => {
                    const index = results.findIndex(item => item.id === result.id)
                    const active = index === activeIndex
                    return (
                      <button
                        key={result.id}
                        id={`command-result-${result.id}`}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => void result.action()}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${active ? 'border-brand-200 bg-white text-brand-600' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          {resultIcon(result.group)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold">{result.title}</span>
                          {result.subtitle && <span className="block truncate text-xs font-medium text-slate-500">{result.subtitle}</span>}
                        </span>
                        {result.badge && <StatusBadge tone={active ? 'brand' : 'slate'}>{result.badge}</StatusBadge>}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">
            <span>Use arrow keys to navigate</span>
            <span>Enter to open</span>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={campaignToRun !== null}
        title="Run Campaign"
        description={campaignToRun ? `Start a new execution for "${campaignToRun.name}"?` : undefined}
        confirmLabel={runningCampaign ? 'Starting...' : 'Run Campaign'}
        cancelLabel="Cancel"
        onCancel={() => {
          if (!runningCampaign) setCampaignToRun(null)
        }}
        onConfirm={() => void runSelectedCampaign()}
        confirmDisabled={runningCampaign}
      />
    </>
  )
}
