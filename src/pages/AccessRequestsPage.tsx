import { useEffect, useMemo, useState } from 'react'
import {
  ConfirmationDialog,
  EmptyState,
  ErrorAlert,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'
import {
  AccessRequest,
  AccessRequestStatus,
  approveAccessRequest,
  getAccessRequest,
  listAccessRequests,
  rejectAccessRequest
} from '../lib/accessRequestApi'
import {
  AuthApiError,
  listAdminUserInvitations,
  listAdminUsers,
  regenerateActivationToken,
  type InvitationRecoveryResponse,
  type PlatformUser,
  type UserInvitation
} from '../lib/authApi'

const NOT_AVAILABLE = 'Not Available'
const statusOptions: Array<AccessRequestStatus | ''> = ['', 'PENDING', 'APPROVED', 'USER_CREATED', 'REJECTED']

type PendingAction = {
  type: 'approve' | 'reject'
  request: AccessRequest
}

type ProvisioningSnapshot = {
  users: PlatformUser[]
  invitations: UserInvitation[]
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

function statusTone(status: AccessRequestStatus): 'amber' | 'emerald' | 'red' | 'slate' {
  if (status === 'PENDING') return 'amber'
  if (status === 'APPROVED' || status === 'USER_CREATED') return 'emerald'
  if (status === 'REJECTED') return 'red'
  return 'slate'
}

function lifecycleTone(status: string | null | undefined): 'amber' | 'emerald' | 'red' | 'slate' {
  if (!status) return 'slate'
  if (['ACTIVE', 'COMPLETED', 'USER_CREATED', 'PROVISIONED'].includes(status)) return 'emerald'
  if (['WAITING_FIRST_ACCESS', 'PENDING_ACTIVATION', 'PENDING', 'INVITED', 'ACTIVE_INVITATION'].includes(status)) return 'amber'
  if (['BLOCKED', 'DISABLED', 'ARCHIVED', 'EXPIRED', 'REVOKED'].includes(status)) return 'red'
  return 'slate'
}

function Field({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  const content = value?.trim() || NOT_AVAILABLE

  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      {link && value ? (
        <a className="block break-words text-sm font-semibold text-brand-700 hover:text-brand-900" href={value} rel="noreferrer" target="_blank">
          {content}
        </a>
      ) : (
        <div className="break-words text-sm font-semibold text-slate-900">{content}</div>
      )}
    </div>
  )
}

function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-agent-primary">{value}</div>
    </div>
  )
}

function DetailSection({
  title,
  children,
  compact = false
}: {
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className={compact ? 'mt-2' : 'mt-3'}>{children}</div>
    </div>
  )
}

function historyItems(request: AccessRequest) {
  return [
    { label: 'Request Submitted', value: request.created_at },
    { label: 'Approved', value: request.approved_at },
    { label: 'Rejected', value: request.rejected_at },
    { label: 'User Created', value: request.created_user_id ? request.approved_at : null }
  ].filter(item => item.value)
}

function latestInvitation(invitations: UserInvitation[]) {
  return [...invitations].sort((left, right) => {
    const leftTime = new Date(left.updated_at ?? left.created_at).getTime()
    const rightTime = new Date(right.updated_at ?? right.created_at).getTime()
    return rightTime - leftTime
  })[0] ?? null
}

function invitationForRequest(request: AccessRequest | null, invitations: UserInvitation[]) {
  if (!request) return null
  return latestInvitation(invitations.filter(invitation => {
    return invitation.source_reference_id === request.id
      || Boolean(request.created_user_id && invitation.user_id === request.created_user_id)
  }))
}

function mergeRecoveredInvitation(result: InvitationRecoveryResponse): UserInvitation {
  return {
    ...result.invitation,
    activation_token: result.activation_token ?? result.invitation.activation_token ?? null,
    activation_link: result.activation_link ?? result.invitation.activation_link ?? null,
    activation_token_id: result.activation_token_id ?? result.invitation.activation_token_id ?? null,
    expires_at: result.activation_expires_at ?? result.invitation.expires_at ?? null
  }
}

function userStatus(user?: PlatformUser | null) {
  if (!user) return null
  if (user.identity_lifecycle_status) return user.identity_lifecycle_status
  if (user.status) return user.status
  return user.is_active ? 'ACTIVE' : 'WAITING_FIRST_ACCESS'
}

function activationRegenerationErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    const message = error.message.toLowerCase()
    if (error.status === 404 || message.includes('not found')) {
      return 'User not found or no activation invitation is available for this request.'
    }
    if (message.includes('active') || message.includes('completed')) {
      return 'This user is already active. Activation links can only be regenerated before First Access is completed.'
    }
    if (message.includes('blocked') || message.includes('locked')) {
      return 'This user is blocked. Unblock the account before regenerating an activation link.'
    }
    if (error.status >= 500) {
      return 'We could not regenerate the activation link because of an internal server error. Please try again.'
    }
    return error.message
  }
  return 'We could not regenerate the activation link. Please try again.'
}

async function copyText(value?: string | null) {
  if (!value) return
  await navigator.clipboard.writeText(value)
}

function activationTokenFromLink(activationLink?: string | null) {
  if (!activationLink) return null
  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const url = new URL(activationLink, baseUrl)
    return url.searchParams.get('token') || null
  } catch {
    return null
  }
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<AccessRequestStatus | ''>('')
  const [countryFilter, setCountryFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [regeneratingLink, setRegeneratingLink] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [technicalOpen, setTechnicalOpen] = useState(false)

  async function loadProvisioningSnapshot(): Promise<ProvisioningSnapshot> {
    const [usersResult, invitationsResult] = await Promise.allSettled([
      listAdminUsers(),
      listAdminUserInvitations()
    ])
    const nextUsers = usersResult.status === 'fulfilled' ? usersResult.value : []
    const nextInvitations = invitationsResult.status === 'fulfilled' ? invitationsResult.value : []
    setUsers(nextUsers)
    setInvitations(nextInvitations)
    return {
      users: nextUsers,
      invitations: nextInvitations
    }
  }

  function load() {
    setLoading(true)
    setError(null)
    setActionError(null)

    Promise.all([
      listAccessRequests({ status: statusFilter }),
      loadProvisioningSnapshot()
    ])
      .then(([result]) => {
        setRequests(result)
        if (selectedRequest && !result.some(request => request.id === selectedRequest.id)) {
          setSelectedRequest(null)
        } else if (selectedRequest) {
          const refreshed = result.find(request => request.id === selectedRequest.id)
          if (refreshed) setSelectedRequest(refreshed)
        }
      })
      .catch(error => setError(error instanceof Error ? error.message : 'Unable to load access requests.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  const filteredRequests = useMemo(() => {
    const normalizedCountry = countryFilter.trim().toLowerCase()
    const normalizedPosition = positionFilter.trim().toLowerCase()
    const normalizedSearch = search.trim().toLowerCase()

    return requests.filter(request => {
      const matchesCountry = !normalizedCountry || request.country.toLowerCase().includes(normalizedCountry)
      const matchesPosition = !normalizedPosition || request.desired_position.toLowerCase().includes(normalizedPosition)
      const matchesSearch = !normalizedSearch
        || request.full_name.toLowerCase().includes(normalizedSearch)
        || request.email.toLowerCase().includes(normalizedSearch)

      return matchesCountry && matchesPosition && matchesSearch
    })
  }, [countryFilter, positionFilter, requests, search])

  function openDetail(accessRequestId: string) {
    setDetailLoading(true)
    setActionError(null)
    setMessage(null)

    getAccessRequest(accessRequestId)
      .then(setSelectedRequest)
      .catch(error => setActionError(error instanceof Error ? error.message : 'Unable to load access request details.'))
      .finally(() => setDetailLoading(false))
  }

  useEffect(() => {
    if (loading || detailLoading || filteredRequests.length === 0) return
    if (selectedRequest && filteredRequests.some(request => request.id === selectedRequest.id)) return
    openDetail(filteredRequests[0].id)
  }, [detailLoading, filteredRequests, loading, selectedRequest])

  async function runPendingAction() {
    if (!pendingAction) return

    setActionLoading(true)
    setActionError(null)
    setMessage(null)

    try {
      const updated = pendingAction.type === 'approve'
        ? await approveAccessRequest(pendingAction.request.id)
        : await rejectAccessRequest(pendingAction.request.id)

      setSelectedRequest(updated)
      setMessage(pendingAction.type === 'approve' ? 'Access request approved.' : 'Access request rejected.')
      setPendingAction(null)
      const [latestRequests] = await Promise.all([
        listAccessRequests({ status: statusFilter }),
        loadProvisioningSnapshot()
      ])
      setRequests(latestRequests)
      const refreshed = latestRequests.find(request => request.id === updated.id)
      if (refreshed) setSelectedRequest(refreshed)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update access request.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRegenerateActivationLink() {
    if (!selectedRequest?.created_user_id || regeneratingLink) return
    setRegeneratingLink(true)
    setActionError(null)
    setMessage(null)
    try {
      const result = await regenerateActivationToken(selectedRequest.created_user_id)
      const recoveredInvitation = mergeRecoveredInvitation(result)
      setInvitations(current => {
        const exists = current.some(invitation => invitation.id === recoveredInvitation.id)
        if (!exists) return [recoveredInvitation, ...current]
        return current.map(invitation => invitation.id === recoveredInvitation.id ? recoveredInvitation : invitation)
      })
      setMessage('Activation link regenerated successfully.')
    } catch (error) {
      setActionError(activationRegenerationErrorMessage(error))
    } finally {
      setRegeneratingLink(false)
    }
  }

  const selectedInvitation = useMemo(
    () => invitationForRequest(selectedRequest, invitations),
    [invitations, selectedRequest]
  )
  const selectedUser = useMemo(
    () => users.find(user => user.user_id === selectedRequest?.created_user_id) ?? null,
    [selectedRequest?.created_user_id, users]
  )
  const selectedUserStatus = userStatus(selectedUser)
  const selectedLifecycleStatus = selectedInvitation?.identity_lifecycle_status
    ?? selectedUser?.identity_lifecycle_status
    ?? (selectedRequest?.created_user_id ? 'WAITING_FIRST_ACCESS' : null)
  const selectedActivationLink = selectedInvitation?.activation_link ?? null
  const selectedActivationToken = activationTokenFromLink(selectedActivationLink)
  const selectedActivationExpiration = selectedInvitation?.expires_at ?? null
  const canRegenerateLink = Boolean(
    selectedRequest?.created_user_id &&
    selectedLifecycleStatus !== 'ACTIVE' &&
    selectedInvitation?.first_access_status !== 'COMPLETED'
  )

  if (loading && requests.length === 0) {
    return <LoadingState title="Loading access requests" message="Fetching pending platform access requests." />
  }

  return (
    <PageContainer className="max-w-none space-y-5" size="xl">
      <PageHeader
        eyebrow="Administration"
        title="Access Requests"
        description="Review public access requests, inspect candidate details, and manage approval decisions."
        actions={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={load} type="button">Refresh</button>}
      />

      {error && <ErrorState title="Access Requests are unavailable" message={error} action={<button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" onClick={load} type="button">Try again</button>} />}
      {message && <SuccessAlert>{message}</SuccessAlert>}
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}

      <SectionCard title="Filters" description="Filter the current access request list using existing API data.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">
            Status
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={statusFilter} onChange={event => setStatusFilter(event.target.value as AccessRequestStatus | '')}>
              {statusOptions.map(status => (
                <option key={status || 'ALL'} value={status}>{status ? readable(status) : 'All statuses'}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Country
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Filter by country" value={countryFilter} onChange={event => setCountryFilter(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Desired position
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Filter by role" value={positionFilter} onChange={event => setPositionFilter(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Name or email
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Search by name or email" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
        </div>
      </SectionCard>

      <div className="grid min-h-[680px] gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)] 2xl:grid-cols-[minmax(0,1.7fr)_minmax(500px,0.9fr)]">
        <SectionCard className="overflow-hidden" padded={false}>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-agent-primary">Requests</h3>
              <p className="text-sm text-slate-500">Showing {filteredRequests.length} of {requests.length} requests.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CompactMetric label="Pending" value={requests.filter(request => request.status === 'PENDING').length} />
              <CompactMetric label="Approved" value={requests.filter(request => request.status === 'APPROVED' || request.status === 'USER_CREATED').length} />
              <CompactMetric label="Rejected" value={requests.filter(request => request.status === 'REJECTED').length} />
              <CompactMetric label="Visible" value={filteredRequests.length} />
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <EmptyState title="No access requests found" message="No access requests match the current filters." />
          ) : (
            <div className="max-h-[720px] overflow-y-auto">
              <table className="w-full table-fixed divide-y divide-slate-100 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-sm shadow-slate-100">
                  <tr>
                    <th className="w-[14%] px-4 py-3">Status</th>
                    <th className="w-[19%] px-4 py-3">Name</th>
                    <th className="w-[24%] px-4 py-3">Email</th>
                    <th className="w-[21%] px-4 py-3">Desired Position</th>
                    <th className="w-[10%] px-4 py-3">Country</th>
                    <th className="w-[12%] px-4 py-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map(request => {
                    const selected = selectedRequest?.id === request.id
                    return (
                    <tr
                      aria-selected={selected}
                      className={`cursor-pointer transition ${selected ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50/80'}`}
                      key={request.id}
                      onClick={() => openDetail(request.id)}
                    >
                      <td className="px-4 py-3"><StatusBadge tone={statusTone(request.status)}>{readable(request.status)}</StatusBadge></td>
                      <td className="px-4 py-3">
                        <div className="truncate font-extrabold text-slate-950" title={request.full_name}>{request.full_name}</div>
                      </td>
                      <td className="truncate px-4 py-3 text-slate-600" title={request.email}>{request.email}</td>
                      <td className="px-4 py-3">
                        <div className="truncate font-semibold text-slate-800" title={request.desired_position}>{request.desired_position}</div>
                      </td>
                      <td className="truncate px-4 py-3 text-slate-600" title={request.country}>{request.country}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{formatDateTime(request.created_at)}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto"
          title="Request Detail"
          description="Full review workspace for the selected access request."
        >
          {detailLoading ? (
            <LoadingState title="Loading request" message="Fetching the selected access request." />
          ) : !selectedRequest ? (
            <EmptyState title="Select an access request" message="Open a request from the list to review details and actions." />
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-extrabold text-slate-950" title={selectedRequest.full_name}>{selectedRequest.full_name}</h3>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-600" title={selectedRequest.email}>{selectedRequest.email}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500" title={`${selectedRequest.desired_position} • ${selectedRequest.country}`}>
                      {selectedRequest.desired_position} • {selectedRequest.country}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(selectedRequest.status)}>{readable(selectedRequest.status)}</StatusBadge>
                </div>
              </div>

              <DetailSection title="Candidate" compact>
                <Field label="Name" value={selectedRequest.full_name} />
                <Field label="Email" value={selectedRequest.email} />
                <Field label="Position" value={selectedRequest.desired_position} />
                <Field label="Country" value={selectedRequest.country} />
              </DetailSection>

              <DetailSection title="Request" compact>
                <Field label="Status" value={readable(selectedRequest.status)} />
                <Field label="Created" value={formatDateTime(selectedRequest.created_at)} />
                <Field label="Reviewed" value={formatDateTime(selectedRequest.approved_at ?? selectedRequest.rejected_at)} />
                <Field label="LinkedIn" value={selectedRequest.linkedin_url} link />
                <Field label="Resume" value={selectedRequest.resume_filename} />
                <Field label="Notes" value={selectedRequest.notes} />
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">History</div>
                  {historyItems(selectedRequest).length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No history entries are available from the current API response.</p>
                  ) : (
                    <ol className="mt-2 grid gap-2">
                      {historyItems(selectedRequest).map(item => (
                        <li className="flex gap-2 text-sm" key={item.label}>
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                          <span className="min-w-0">
                            <span className="font-bold text-slate-900">{item.label}</span>
                            <span className="ml-2 text-xs text-slate-500">{formatDateTime(item.value)}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </DetailSection>

              <DetailSection title="Activation" compact>
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">User Status</div>
                    <div className="mt-2"><StatusBadge tone={lifecycleTone(selectedUserStatus)}>{selectedUserStatus ?? (selectedRequest.created_user_id ? 'Provisioned' : NOT_AVAILABLE)}</StatusBadge></div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Identity Lifecycle</div>
                    <div className="mt-2"><StatusBadge tone={lifecycleTone(selectedLifecycleStatus)}>{selectedLifecycleStatus ?? NOT_AVAILABLE}</StatusBadge></div>
                  </div>
                </div>
                <Field label="User" value={selectedRequest.created_user_id ? 'Created' : 'Not created'} />
                <Field label="Activation" value={selectedRequest.activation_token_id || selectedInvitation?.activation_token_id ? 'Generated' : null} />
                <Field label="Link" value={selectedActivationLink} link />
                <Field label="Expiration" value={formatDateTime(selectedActivationExpiration)} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
                    disabled={!selectedActivationToken}
                    onClick={() => {
                      void copyText(selectedActivationToken)
                      setMessage('Activation token copied to clipboard.')
                    }}
                    type="button"
                  >
                    Copy Activation Token
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
                    disabled={!selectedActivationLink}
                    onClick={() => void copyText(selectedActivationLink)}
                    type="button"
                  >
                    Copy Activation Link
                  </button>
                  <button
                    className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
                    disabled={!selectedActivationLink}
                    onClick={() => selectedActivationLink && window.open(selectedActivationLink, '_blank', 'noopener,noreferrer')}
                    type="button"
                  >
                    Open Activation Page
                  </button>
                  <button
                    className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
                    disabled={!canRegenerateLink || regeneratingLink}
                    onClick={() => void handleRegenerateActivationLink()}
                    type="button"
                  >
                    {regeneratingLink ? 'Regenerating...' : 'Regenerate Link'}
                  </button>
                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-400" disabled type="button">
                    Resend Invitation
                  </button>
                </div>
              </DetailSection>

              <DetailSection title="Technical" compact>
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                  onClick={() => setTechnicalOpen(value => !value)}
                  type="button"
                >
                  <span>{technicalOpen ? 'Hide technical fields' : 'Show technical fields'}</span>
                  <span>{technicalOpen ? '−' : '+'}</span>
                </button>
                {technicalOpen && (
                  <div className="mt-2">
                    <Field label="Request ID" value={selectedRequest.id} />
                    <Field label="User ID" value={selectedRequest.created_user_id} />
                    <Field label="Token ID" value={selectedRequest.activation_token_id} />
                    <Field label="Approved By" value={selectedRequest.approved_by_user_id} />
                    <Field label="Rejected By" value={selectedRequest.rejected_by_user_id} />
                    <Field label="Duration" value={selectedRequest.provisioning_duration_ms !== null ? `${selectedRequest.provisioning_duration_ms} ms` : null} />
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Actions">
                {selectedRequest.status === 'PENDING' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={actionLoading}
                      onClick={() => setPendingAction({ type: 'approve', request: selectedRequest })}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={actionLoading}
                      onClick={() => setPendingAction({ type: 'reject', request: selectedRequest })}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Review completed</div>
                      <div className="text-sm text-slate-500">Actions are disabled because this request is no longer pending.</div>
                    </div>
                    <StatusBadge tone={statusTone(selectedRequest.status)}>{readable(selectedRequest.status)}</StatusBadge>
                  </div>
                )}
              </DetailSection>
            </div>
          )}
        </SectionCard>
      </div>

      <ConfirmationDialog
        cancelLabel="Cancel"
        confirmDisabled={actionLoading}
        confirmLabel={pendingAction?.type === 'approve' ? 'Approve' : 'Reject'}
        destructive={pendingAction?.type === 'reject'}
        description={pendingAction ? `This will mark ${pendingAction.request.full_name}'s access request as ${pendingAction.type === 'approve' ? 'approved' : 'rejected'}.` : undefined}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void runPendingAction()}
        open={Boolean(pendingAction)}
        title={pendingAction?.type === 'approve' ? 'Approve access request' : 'Reject access request'}
      />
    </PageContainer>
  )
}
