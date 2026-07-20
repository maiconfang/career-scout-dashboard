import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  InfoAlert,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'
import {
  getPublicAccessRequestStatus,
  readRememberedPublicAccessRequest,
  type AccessRequest,
  type AccessRequestStatus,
  type PublicAccessRequestStatus
} from '../lib/accessRequestApi'

const NOT_AVAILABLE = 'Not Available'

type TimelineStep = {
  label: string
  description: string
  state: 'completed' | 'running' | 'waiting' | 'rejected'
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

function statusTone(status: AccessRequestStatus): 'amber' | 'emerald' | 'red' | 'blue' {
  if (status === 'REJECTED') return 'red'
  if (status === 'USER_CREATED') return 'emerald'
  if (status === 'APPROVED') return 'blue'
  return 'amber'
}

function stepClasses(state: TimelineStep['state']) {
  if (state === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (state === 'running') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (state === 'rejected') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-slate-200 bg-white text-slate-500'
}

function buildTimeline(status: AccessRequestStatus): TimelineStep[] {
  const rejected = status === 'REJECTED'
  const approved = status === 'APPROVED' || status === 'USER_CREATED'
  const provisioned = status === 'USER_CREATED'

  return [
    {
      label: 'Request Submitted',
      description: 'Your access request was received by the platform.',
      state: 'completed'
    },
    {
      label: 'Under Review',
      description: rejected ? 'The review has finished.' : 'An administrator reviews the request.',
      state: status === 'PENDING' ? 'running' : 'completed'
    },
    {
      label: 'Approved',
      description: rejected ? 'The request was not approved.' : 'The request is approved by an administrator.',
      state: rejected ? 'rejected' : approved ? 'completed' : 'waiting'
    },
    {
      label: 'User Provisioned',
      description: 'A platform user account is created from the approved request.',
      state: rejected ? 'waiting' : provisioned ? 'completed' : approved ? 'running' : 'waiting'
    },
    {
      label: 'Waiting Activation',
      description: 'Activate the account using the activation link or token.',
      state: provisioned ? 'running' : 'waiting'
    }
  ]
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold text-slate-950">{value || NOT_AVAILABLE}</div>
    </div>
  )
}

function RequestTimeline({ status }: { status: AccessRequestStatus }) {
  const steps = buildTimeline(status)

  return (
    <SectionCard title="Timeline" description="Current progress for this access request.">
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li className="grid grid-cols-[32px_1fr] gap-3" key={step.label}>
            <div className="flex flex-col items-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black ${stepClasses(step.state)}`}>
                {step.state === 'completed' ? '✓' : '●'}
              </span>
              {index < steps.length - 1 && <span className="mt-2 h-8 w-px bg-slate-200" />}
            </div>
            <div className="pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-slate-950">{step.label}</h3>
                <StatusBadge tone={step.state === 'completed' ? 'emerald' : step.state === 'running' ? 'blue' : step.state === 'rejected' ? 'red' : 'slate'}>
                  {readable(step.state)}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}

export default function AccessRequestStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestId = searchParams.get('id')?.trim() ?? ''
  const [draftId, setDraftId] = useState(requestId)
  const [accessRequest, setAccessRequest] = useState<AccessRequest | null>(null)
  const [publicStatus, setPublicStatus] = useState<PublicAccessRequestStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastUpdated = useMemo(() => {
    const source = publicStatus ?? accessRequest
    if (!source) return NOT_AVAILABLE
    return formatDateTime(source.rejected_at ?? source.approved_at ?? source.created_at)
  }, [accessRequest, publicStatus])

  const currentStatus = publicStatus?.status ?? accessRequest?.status ?? null

  function load(id: string) {
    if (!id) {
      setAccessRequest(null)
      setPublicStatus(null)
      setError(null)
      return
    }

    const remembered = readRememberedPublicAccessRequest(id)
    setAccessRequest(remembered)
    setPublicStatus(null)
    setLoading(true)
    setError(null)
    getPublicAccessRequestStatus(id)
      .then(status => {
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
      .catch(error => {
        setAccessRequest(null)
        setPublicStatus(null)
        setError(error instanceof Error ? error.message : 'Unable to load this access request.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setDraftId(requestId)
    load(requestId)
  }, [requestId])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanId = draftId.trim()
    if (cleanId) {
      setSearchParams({ id: cleanId })
    } else {
      setSearchParams({})
    }
  }

  return (
    <main className="min-h-screen bg-page-bg px-4 py-8">
      <PageContainer className="space-y-5" size="lg">
        <PageHeader
          eyebrow="Access Request"
          title="Request Status"
          description="Track the review and provisioning status of your Career Scout access request."
          actions={<Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" to="/login">Login</Link>}
        />

        <SectionCard title="Find your request" description="Enter the request id provided by the platform.">
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
            <label className="flex-1 text-sm font-semibold text-slate-700">
              Access Request ID
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={event => setDraftId(event.target.value)}
                placeholder="Paste your access request id"
                value={draftId}
              />
            </label>
            <div className="flex items-end">
              <button className="w-full rounded-lg bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 md:w-auto" type="submit">
                Check Status
              </button>
            </div>
          </form>
        </SectionCard>

        {loading && <LoadingState title="Loading request status" message="Fetching the latest access request information." />}
        {error && (
          <ErrorState
            title="Request status is unavailable"
            message={error}
            action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => load(requestId)} type="button">Try again</button>}
          />
        )}

        {!loading && !error && !currentStatus && (
          <EmptyState title="No request selected" message="Paste your access request id to view the current status." />
        )}

        {currentStatus && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <SectionCard
                title="Status"
                description="Latest available state for this request."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge tone={statusTone(currentStatus)}>{readable(currentStatus)}</StatusBadge>
                  <span className="text-sm font-semibold text-slate-600">Last updated: {lastUpdated}</span>
                </div>
                {currentStatus === 'REJECTED' && (
                  <InfoAlert className="mt-4">
                    This request was not approved. Please review your information and contact the platform administrator if you believe this needs another look.
                  </InfoAlert>
                )}
                {currentStatus === 'USER_CREATED' && (
                  <SuccessAlert className="mt-4">
                    Your account has been created. Please use your activation link or activation token to activate it.
                  </SuccessAlert>
                )}
              </SectionCard>

              <SectionCard title="Request Information" description="Information submitted with the access request.">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Name" value={accessRequest?.full_name} />
                  <Field label="Email" value={accessRequest?.email} />
                  <Field label="Desired Position" value={accessRequest?.desired_position} />
                  <Field label="Country" value={accessRequest?.country} />
                  <Field label="Requested At" value={formatDateTime(accessRequest?.created_at ?? publicStatus?.created_at)} />
                  <Field label="Last Update" value={lastUpdated} />
                </div>
                {!accessRequest && (
                  <p className="mt-4 text-sm text-slate-500">
                    Personal request details are only shown in the browser used to submit the request.
                  </p>
                )}
              </SectionCard>
            </div>

            <RequestTimeline status={currentStatus} />
          </div>
        )}
      </PageContainer>
    </main>
  )
}
