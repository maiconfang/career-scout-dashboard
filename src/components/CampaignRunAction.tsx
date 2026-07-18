import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog, ProgressBar, StatusBadge } from './design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import { getCampaignExecutionProgress, runCampaign, type CampaignExecutionProgress } from '../lib/campaignRunApi'
import { getAgentExecutionResults } from '../lib/api'

type CampaignRunActionProps = {
  campaignProfileId: string
  campaignProfileName: string
  disabled?: boolean
  className?: string
}

export function CampaignRunAction({
  campaignProfileId,
  campaignProfileName,
  disabled = false,
  className
}: CampaignRunActionProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [progress, setProgress] = useState<CampaignExecutionProgress | null>(null)
  const [jobsCollected, setJobsCollected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const terminal = progress ? isTerminalStatus(progress.status) : false
  const failed = progress ? progress.status === 'FAILED' || progress.status === 'CANCELLED' : false
  const success = progress ? progress.status === 'COMPLETED' : false
  const running = submitting || Boolean(executionId && !terminal)

  useEffect(() => {
    if (!executionId || terminal) {
      return
    }

    let cancelled = false
    const loadProgress = async () => {
      try {
        const nextProgress = await getCampaignExecutionProgress(executionId)
        if (!cancelled) {
          setProgress(nextProgress)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : t('campaignRun.progressFailed'))
        }
      }
    }

    void loadProgress()
    const intervalId = window.setInterval(() => void loadProgress(), 2000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [executionId, terminal, t])

  useEffect(() => {
    if (!executionId || !success) {
      return
    }

    let cancelled = false
    getAgentExecutionResults(executionId, { limit: 1, offset: 0 })
      .then(results => {
        if (!cancelled) {
          setJobsCollected(results.discovery.unique_jobs_found)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJobsCollected(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [executionId, success])

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    setProgress(null)
    setJobsCollected(null)

    try {
      const response = await runCampaign(campaignProfileId)
      setExecutionId(response.execution_id)
      setProgress({
        execution_id: response.execution_id,
        status: response.status,
        current_stage: response.status,
        completed_stages: [],
        next_stage: 'RUNNING',
        progress: 0
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('campaignRun.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        className={className ?? 'rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60'}
        disabled={disabled || running}
        onClick={() => {
          setConfirmOpen(true)
          setExecutionId(null)
          setProgress(null)
          setJobsCollected(null)
          setError(null)
        }}
        type="button"
      >
        {running ? t('campaignRun.running') : t('campaignRun.button')}
      </button>
      <ConfirmationDialog
        cancelLabel={t('campaignRun.cancel')}
        confirmLabel={executionId ? t('campaignRun.viewExecution') : submitting ? t('campaignRun.starting') : t('campaignRun.confirm')}
        description={(
          <div className="space-y-2">
            {!executionId && <p>{t('campaignRun.confirmDescription')}</p>}
            <p className="font-semibold text-slate-900">{campaignProfileName}</p>
            {progress && (
              <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('campaignRun.currentStage')}</div>
                    <div className="font-bold text-slate-900">{readableStage(progress.current_stage ?? progress.status)}</div>
                  </div>
                  <StatusBadge tone={statusTone(progress.status)}>{readableStage(progress.status)}</StatusBadge>
                </div>
                <ProgressBar value={progress.progress ?? progressValue(progress.status)} label={t('campaignRun.progress')} />
                <div className="text-xs text-slate-500">{stageMessage(progress.current_stage ?? progress.status, t)}</div>
              </div>
            )}
            {success && (
              <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                {jobsCollected === null
                  ? t('campaignRun.completed')
                  : t('campaignRun.completedWithJobs').replace('{count}', String(jobsCollected))}
              </p>
            )}
            {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">{error}</p>}
          </div>
        )}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => {
          if (executionId) {
            navigate(`/agent/executions/${executionId}`)
            return
          }
          if (!submitting) void handleConfirm()
        }}
        open={confirmOpen}
        title={t('campaignRun.confirmTitle')}
        confirmDisabled={submitting}
      />
    </>
  )
}

const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])

function isTerminalStatus(status: string) {
  return terminalStatuses.has(status)
}

function readableStage(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function progressValue(status: string) {
  if (status === 'QUEUED') return 3
  if (status === 'RUNNING') return 8
  if (status === 'COMPLETED') return 100
  if (status === 'FAILED' || status === 'CANCELLED') return 100
  return 15
}

function statusTone(status: string): 'slate' | 'brand' | 'emerald' | 'amber' | 'red' | 'blue' {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'FAILED' || status === 'CANCELLED') return 'red'
  if (status === 'QUEUED') return 'amber'
  return 'brand'
}

function stageMessage(stage: string, t: (key: string) => string) {
  if (stage === 'QUEUED') return t('campaignRun.progressQueued')
  if (stage === 'RUNNING' || stage === 'PREPARING') return t('campaignRun.progressConnecting')
  if (stage === 'VALIDATING') return t('campaignRun.progressValidating')
  if (stage === 'PLANNER') return t('campaignRun.progressPlanning')
  if (stage === 'DISCOVERY') return t('campaignRun.progressSearching')
  if (stage === 'MATCH_ENGINE' || stage === 'RANKING' || stage === 'DECISION' || stage === 'RECOMMENDATION') return t('campaignRun.progressAnalyzing')
  if (stage === 'COMPLETED') return t('campaignRun.progressSaving')
  return t('campaignRun.progressRunning')
}
