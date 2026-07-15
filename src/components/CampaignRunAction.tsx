import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from './design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import { runCampaign } from '../lib/campaignRunApi'

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
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)

    try {
      const response = await runCampaign(campaignProfileId)
      setConfirmOpen(false)
      navigate(`/agent/executions/${response.execution_id}`)
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
        disabled={disabled || submitting}
        onClick={() => setConfirmOpen(true)}
        type="button"
      >
        {submitting ? t('campaignRun.starting') : t('campaignRun.button')}
      </button>
      <ConfirmationDialog
        cancelLabel={t('campaignRun.cancel')}
        confirmLabel={submitting ? t('campaignRun.starting') : t('campaignRun.confirm')}
        description={(
          <div className="space-y-2">
            <p>{t('campaignRun.confirmDescription')}</p>
            <p className="font-semibold text-slate-900">{campaignProfileName}</p>
            {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">{error}</p>}
          </div>
        )}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => {
          if (!submitting) void handleConfirm()
        }}
        open={confirmOpen}
        title={t('campaignRun.confirmTitle')}
        confirmDisabled={submitting}
      />
    </>
  )
}
