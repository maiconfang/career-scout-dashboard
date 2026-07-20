import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  SectionCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'
import OnboardingStepper from '../components/OnboardingStepper'
import {
  getPublicAccessRequestStatus,
  readRememberedPublicAccessRequest,
  type AccessRequest,
  type PublicAccessRequestStatus,
  type AccessRequestStatus
} from '../lib/accessRequestApi'

const NOT_AVAILABLE = 'Not Available'

function readable(value?: string | null) {
  if (!value) return NOT_AVAILABLE
  return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
}

function statusTone(status?: AccessRequestStatus): 'amber' | 'blue' | 'emerald' | 'red' | 'slate' {
  if (status === 'REJECTED') return 'red'
  if (status === 'USER_CREATED') return 'emerald'
  if (status === 'APPROVED') return 'blue'
  if (status === 'PENDING') return 'amber'
  return 'slate'
}

function formatDateTime(value?: string | null) {
  if (!value) return NOT_AVAILABLE
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export default function AccessRequestSuccessPage() {
  const [searchParams] = useSearchParams()
  const requestId = searchParams.get('id')?.trim() ?? ''
  const [accessRequest, setAccessRequest] = useState<AccessRequest | null>(null)
  const [publicStatus, setPublicStatus] = useState<PublicAccessRequestStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(requestId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!requestId) {
      setLoading(false)
      setAccessRequest(null)
      return
    }

    let active = true
    const remembered = readRememberedPublicAccessRequest(requestId)
    setAccessRequest(remembered)
    setLoading(true)
    setError(null)
    getPublicAccessRequestStatus(requestId)
      .then(status => {
        if (!active) return
        setPublicStatus(status)
        setAccessRequest(current => current ? {
          ...current,
          status: status.status,
          created_at: status.created_at,
          approved_at: status.approved_at,
          rejected_at: status.rejected_at,
          provisioning_duration_ms: status.provisioning_duration_ms
        } : null)
      })
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load this access request.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestId])

  const currentStatus = publicStatus?.status ?? accessRequest?.status ?? 'PENDING'
  const nextText = useMemo(() => {
    if (currentStatus === 'USER_CREATED') {
      return 'Your account has been created. Use the activation link or token provided by the administrator to activate your account.'
    }
    if (currentStatus === 'APPROVED') {
      return 'Your request has been approved. The platform is waiting for account provisioning.'
    }
    if (currentStatus === 'REJECTED') {
      return 'The request was not approved. Contact the platform administrator if you need more information.'
    }
    return 'An administrator will review your request. If approved, your account will be created and an activation token or activation link will be provided.'
  }, [currentStatus])

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 text-slate-900">
      <PageContainer className="space-y-5" size="lg">
        <SectionCard title="Request Submitted" description="Your access request was received by Career Scout.">
          <OnboardingStepper current="ADMIN_REVIEW" />

          <SuccessAlert className="mt-6">
            Request submitted successfully.
          </SuccessAlert>

          {!requestId && (
            <EmptyState title="Request ID unavailable" message="The request was submitted, but no request ID was found in the page URL." />
          )}

          {loading && <LoadingState title="Loading request" message="Fetching the current request status." />}

          {error && (
            <ErrorState
              title="Current status is unavailable"
              message={error}
              action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/access-request/status">Open Status Page</Link>}
            />
          )}

          {(accessRequest || publicStatus) && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Current Status</div>
                <div className="mt-3">
                  <StatusBadge tone={statusTone(currentStatus)}>{readable(currentStatus)}</StatusBadge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Request ID</div>
                <div className="mt-2 break-all font-mono text-sm font-semibold text-slate-900">{accessRequest?.id ?? requestId}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Submitted At</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(accessRequest?.created_at ?? publicStatus?.created_at)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">What happens now</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{nextText}</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={`/access-request/status${requestId ? `?id=${encodeURIComponent(requestId)}` : ''}`}>
              Track Request
            </Link>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/login">
              Back to Login
            </Link>
          </div>
        </SectionCard>
      </PageContainer>
    </main>
  )
}
