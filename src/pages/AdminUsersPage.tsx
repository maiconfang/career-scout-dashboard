import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AuthApiError,
  blockAdminUser,
  deactivateAdminUser,
  getAdminUserInvitation,
  inviteAdminUser,
  listAdminUserInvitations,
  listAdminUsers,
  regenerateActivationToken,
  type InvitationRecoveryResponse,
  type InviteUserResponse,
  type PlatformUser,
  type UserInvitation
} from '../lib/authApi'
import {
  ConfirmationDialog,
  EmptyState,
  ErrorAlert,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  RoleBadge,
  SectionCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'

type TabKey = 'USERS' | 'INVITATIONS' | 'PENDING_FIRST_ACCESS' | 'BLOCKED' | 'DISABLED' | 'ARCHIVED'

type PendingAction = {
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  run: () => void
}

type InviteForm = {
  full_name: string
  email: string
  role: 'ADMIN' | 'USER'
  notes: string
}

type InvitationPanelData = {
  id?: string | null
  user_id?: string | null
  full_name?: string | null
  email?: string | null
  role?: string | null
  invitation_status?: string | null
  provisioning_status?: string | null
  identity_lifecycle_status?: string | null
  first_access_status?: string | null
  activation_token?: string | null
  activation_link?: string | null
  created_at?: string | null
  provisioned_at?: string | null
  expires_at?: string | null
  provisioning_duration_ms?: number | null
  updated_at?: string | null
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'USERS', label: 'Users' },
  { key: 'INVITATIONS', label: 'Invitations' },
  { key: 'PENDING_FIRST_ACCESS', label: 'Pending Activation' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'DISABLED', label: 'Disabled' },
  { key: 'ARCHIVED', label: 'Archived' }
]

const emptyInviteForm: InviteForm = {
  full_name: '',
  email: '',
  role: 'USER',
  notes: ''
}

function formatDate(value?: string | null) {
  if (!value) return 'Not Available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not Available'
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function statusTone(status?: string | null): 'slate' | 'brand' | 'emerald' | 'amber' | 'red' | 'blue' {
  if (!status) return 'slate'
  if (['ACTIVE', 'COMPLETED', 'USER_CREATED', 'PROVISIONED'].includes(status)) return 'emerald'
  if (['PENDING_ACTIVATION', 'PENDING', 'WAITING_FIRST_ACCESS', 'INVITED'].includes(status)) return 'amber'
  if (['BLOCKED', 'DISABLED', 'INACTIVE', 'ARCHIVED', 'EXPIRED'].includes(status)) return 'red'
  return 'slate'
}

function userLifecycleStatus(user: PlatformUser, invitation?: UserInvitation | null) {
  const invitationLifecycle = invitation?.identity_lifecycle_status
  if (invitationLifecycle) return invitationLifecycle
  if (user.identity_lifecycle_status) return user.identity_lifecycle_status
  if (user.first_access_status === 'COMPLETED') return 'ACTIVE'
  if (user.first_access_status && user.first_access_status !== 'ACTIVE') return user.first_access_status
  if (user.status === 'PENDING_ACTIVATION') return 'WAITING_FIRST_ACCESS'
  if (user.status === 'INACTIVE') return 'DISABLED'
  return user.status || 'Not Available'
}

function invitationStatus(invitation: UserInvitation) {
  return invitation.invitation_status ?? invitation.first_access_status ?? 'Not Available'
}

function invitationStateSet(invitation: UserInvitation) {
  return new Set([
    invitation.invitation_status,
    invitation.provisioning_status,
    invitation.identity_lifecycle_status,
    invitation.first_access_status
  ].filter(Boolean))
}

function latestInvitationByUserId(invitations: UserInvitation[]) {
  const result = new Map<string, UserInvitation>()
  for (const invitation of invitations) {
    if (!invitation.user_id) continue
    const current = result.get(invitation.user_id)
    const invitationDate = new Date(invitation.updated_at ?? invitation.created_at).getTime()
    const currentDate = current ? new Date(current.updated_at ?? current.created_at).getTime() : -1
    if (!current || invitationDate >= currentDate) {
      result.set(invitation.user_id, invitation)
    }
  }
  return result
}

function invitationPanelStatus(invitation: InvitationPanelData) {
  const identityStatus = invitedLifecycleStatus(invitation)
  const activationStatus = invitation.invitation_status ?? invitation.first_access_status
  if (identityStatus === 'ACTIVE' || identityStatus === 'COMPLETED' || activationStatus === 'COMPLETED') {
    return {
      title: 'Activation Completed',
      description: 'The user completed activation and can access the platform.',
      tone: 'emerald' as const
    }
  }
  if (
    invitation.user_id ||
    invitation.provisioning_status === 'PROVISIONED' ||
    identityStatus === 'WAITING_FIRST_ACCESS' ||
    activationStatus === 'ACTIVE'
  ) {
    return {
      title: 'Waiting for Activation',
      description: 'The user has been provisioned and still needs to activate the account.',
      tone: 'amber' as const
    }
  }
  return {
    title: 'User Provisioned Successfully',
    description: 'Provisioning information was returned by the existing invitation API.',
    tone: 'brand' as const
  }
}

function invitedProvisioningStatus(invitation: InvitationPanelData) {
  return invitation.provisioning_status ?? (invitation.user_id ? 'PROVISIONED' : null)
}

function invitedLifecycleStatus(invitation: InvitationPanelData) {
  if (invitation.identity_lifecycle_status) return invitation.identity_lifecycle_status
  if (invitation.first_access_status === 'COMPLETED') return 'ACTIVE'
  return invitation.user_id ? 'WAITING_FIRST_ACCESS' : null
}

function notAvailable(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 'Not Available'
  return String(value)
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

function activationRegenerationErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    const message = error.message.toLowerCase()
    if (error.status === 404 || message.includes('not found')) {
      return 'User not found or no pending First Access invitation is available.'
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

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium text-slate-900">{notAvailable(value)}</dd>
    </div>
  )
}

function InvitationManagementPanel({
  invitation,
  title = 'Invitation Management',
  regenerating = false,
  onRegenerate
}: {
  invitation: InvitationPanelData
  title?: string
  regenerating?: boolean
  onRegenerate?: (invitation: InvitationPanelData) => void
}) {
  const headline = invitationPanelStatus(invitation)
  const provisioningStatus = invitedProvisioningStatus(invitation)
  const identityStatus = invitedLifecycleStatus(invitation)
  const activationStatus = invitation.invitation_status ?? invitation.first_access_status
  const canOpenActivation = Boolean(invitation.activation_link)
  const hasActivationToken = Boolean(invitation.activation_token)
  const canRegenerate = Boolean(
    invitation.user_id &&
    identityStatus !== 'ACTIVE' &&
    activationStatus !== 'COMPLETED'
  )

  return (
    <SectionCard title={title} description="Enterprise provisioning details returned by the existing invitation APIs.">
      <div className={`rounded-xl border p-5 ${
        headline.tone === 'emerald'
          ? 'border-emerald-200 bg-emerald-50'
          : headline.tone === 'amber'
            ? 'border-amber-200 bg-amber-50'
            : 'border-brand-200 bg-brand-50'
      }`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invitation Status</p>
            <h3 className="mt-1 text-2xl font-extrabold text-agent-primary">{headline.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{headline.description}</p>
          </div>
          <StatusBadge tone={headline.tone}>{identityStatus ?? activationStatus ?? headline.title}</StatusBadge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User Information</p>
          <dl className="mt-4 grid gap-4">
            <DetailRow label="Name" value={invitation.full_name} />
            <DetailRow label="Email" value={invitation.email} />
            <DetailRow label="Role" value={invitation.role} />
            <DetailRow label="User ID" value={invitation.user_id} />
          </dl>
          <div className="mt-4">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" type="button" disabled={!invitation.email} onClick={() => void copyText(invitation.email)}>
              Copy User Email
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provisioning Status</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone={statusTone(provisioningStatus)}>{provisioningStatus ?? 'Not Available'}</StatusBadge>
            <StatusBadge tone={statusTone(identityStatus)}>{identityStatus ?? 'Not Available'}</StatusBadge>
          </div>
          <dl className="mt-4 grid gap-4">
            <DetailRow label="Identity Lifecycle Status" value={identityStatus} />
            <DetailRow label="Provisioning Duration" value={invitation.provisioning_duration_ms !== undefined && invitation.provisioning_duration_ms !== null ? `${invitation.provisioning_duration_ms} ms` : null} />
            <DetailRow label="Provisioned At" value={formatDate(invitation.provisioned_at)} />
            <DetailRow label="Expiration" value={formatDate(invitation.expires_at)} />
          </dl>
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
            <dl className="mt-3 grid gap-3">
              <DetailRow label="Created" value={formatDate(invitation.created_at)} />
              <DetailRow label="Last Updated" value={formatDate(invitation.updated_at)} />
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activation</p>
          <dl className="mt-4 grid gap-4">
            {hasActivationToken && <DetailRow label="Activation Token" value={invitation.activation_token} />}
            <DetailRow label="Activation Link" value={invitation.activation_link} />
            <DetailRow label="Created At" value={formatDate(invitation.created_at)} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {hasActivationToken && (
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" type="button" onClick={() => void copyText(invitation.activation_token ?? null)}>
                Copy Activation Token
              </button>
            )}
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" type="button" disabled={!invitation.activation_link} onClick={() => void copyText(invitation.activation_link)}>
              Copy Activation Link
            </button>
            <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50" type="button" disabled={!canOpenActivation} onClick={() => invitation.activation_link && window.open(invitation.activation_link, '_blank', 'noopener,noreferrer')}>
              Open Activation Page
            </button>
            <button
              className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!canRegenerate || regenerating}
              onClick={() => onRegenerate?.(invitation)}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Link'}
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

function InviteUserModal({
  open,
  form,
  submitting,
  onChange,
  onCancel,
  onSubmit
}: {
  open: boolean
  form: InviteForm
  submitting: boolean
  onChange: (form: InviteForm) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-user-title">
      <form className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-card" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-user-title" className="text-lg font-extrabold text-agent-primary">Invite User</h2>
            <p className="mt-1 text-sm text-slate-500">Create the user and generate the activation token through the official provisioning flow.</p>
          </div>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Full Name
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.full_name} onChange={event => onChange({ ...form, full_name: event.target.value })} required />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type="email" value={form.email} onChange={event => onChange({ ...form, email: event.target.value })} required />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Role
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={form.role} onChange={event => onChange({ ...form, role: event.target.value as 'ADMIN' | 'USER' })}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Notes (optional)
            <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.notes} onChange={event => onChange({ ...form, notes: event.target.value })} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminUsersPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedUserId = searchParams.get('userId')?.trim() ?? ''
  const requestedInvitationId = searchParams.get('invitationId')?.trim() ?? ''
  const [activeTab, setActiveTab] = useState<TabKey>('USERS')
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [selectedInvitation, setSelectedInvitation] = useState<UserInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm)
  const [inviteResult, setInviteResult] = useState<InviteUserResponse | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [regeneratingUserId, setRegeneratingUserId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [usersResult, invitationsResult] = await Promise.allSettled([
        listAdminUsers(),
        listAdminUserInvitations()
      ])
      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value)
      } else {
        setUsers([])
      }
      if (invitationsResult.status === 'fulfilled') {
        setInvitations(invitationsResult.value)
      } else {
        setInvitations([])
      }
      if (usersResult.status === 'rejected' || invitationsResult.status === 'rejected') {
        setError('Some user administration data is unavailable. Missing values are shown as Not Available.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (requestedTab === 'INVITATIONS' || requestedInvitationId) {
      setActiveTab('INVITATIONS')
    }
  }, [requestedInvitationId, requestedTab])

  useEffect(() => {
    if (requestedUserId) {
      const user = users.find(item => item.user_id === requestedUserId)
      if (user) {
        setActiveTab('USERS')
        setSelectedUser(user)
      }
    }
  }, [requestedUserId, users])

  useEffect(() => {
    if (requestedInvitationId) {
      const invitation = invitations.find(item => item.id === requestedInvitationId)
      if (invitation) {
        setSelectedInvitation(invitation)
      }
    }
  }, [invitations, requestedInvitationId])

  const userInvitation = useMemo(() => latestInvitationByUserId(invitations), [invitations])

  const displayedUsers = useMemo(() => {
    if (activeTab === 'PENDING_FIRST_ACCESS') return users.filter(user => userLifecycleStatus(user, userInvitation.get(user.user_id)) === 'WAITING_FIRST_ACCESS')
    if (activeTab === 'BLOCKED') return users.filter(user => userLifecycleStatus(user, userInvitation.get(user.user_id)) === 'BLOCKED')
    if (activeTab === 'DISABLED') return users.filter(user => userLifecycleStatus(user, userInvitation.get(user.user_id)) === 'DISABLED')
    if (activeTab === 'ARCHIVED') return []
    return users
  }, [activeTab, userInvitation, users])

  const pendingFirstAccessCount = users.filter(user => userLifecycleStatus(user, userInvitation.get(user.user_id)) === 'WAITING_FIRST_ACCESS').length
  const blockedCount = users.filter(user => userLifecycleStatus(user, userInvitation.get(user.user_id)) === 'BLOCKED').length
  const disabledCount = users.filter(user => userLifecycleStatus(user, userInvitation.get(user.user_id)) === 'DISABLED').length

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteSubmitting(true)
    setError(null)
    setMessage(null)
    setInviteResult(null)
    try {
      const payload = {
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        role: inviteForm.role,
        notes: inviteForm.notes.trim() || null
      }
      const result = await inviteAdminUser(payload)
      setInviteResult({
        ...result,
        full_name: result.full_name ?? payload.full_name,
        email: result.email ?? payload.email,
        role: result.role ?? payload.role
      })
      setMessage('Invitation Created Successfully')
      setInviteForm(emptyInviteForm)
      setInviteOpen(false)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to invite user.')
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function loadInvitationDetail(invitation: UserInvitation) {
    setSelectedInvitation(invitation)
    try {
      const detail = await getAdminUserInvitation(invitation.id)
      setSelectedInvitation(detail)
    } catch {
      setSelectedInvitation(invitation)
    }
  }

  async function handleRegenerateActivationLink(invitation: InvitationPanelData) {
    if (!invitation.user_id || regeneratingUserId) return
    setError(null)
    setMessage(null)
    setRegeneratingUserId(invitation.user_id)
    try {
      const result = await regenerateActivationToken(invitation.user_id)
      const recoveredInvitation = mergeRecoveredInvitation(result)
      setInvitations(current => {
        const exists = current.some(item => item.id === recoveredInvitation.id)
        if (!exists) return [recoveredInvitation, ...current]
        return current.map(item => item.id === recoveredInvitation.id ? recoveredInvitation : item)
      })
      setSelectedInvitation(current => {
        if (!current || current.id === recoveredInvitation.id || current.user_id === recoveredInvitation.user_id) {
          return recoveredInvitation
        }
        return current
      })
      setInviteResult(current => {
        if (!current || current.user_id !== recoveredInvitation.user_id) return current
        return {
          ...current,
          activation_token: recoveredInvitation.activation_token ?? current.activation_token,
          activation_link: recoveredInvitation.activation_link ?? current.activation_link,
          expires_at: recoveredInvitation.expires_at ?? current.expires_at,
          first_access_status: recoveredInvitation.first_access_status ?? current.first_access_status,
          invitation_status: recoveredInvitation.invitation_status ?? current.invitation_status,
          identity_lifecycle_status: recoveredInvitation.identity_lifecycle_status ?? current.identity_lifecycle_status,
          provisioning_status: recoveredInvitation.provisioning_status ?? current.provisioning_status,
          updated_at: recoveredInvitation.updated_at ?? current.updated_at
        }
      })
      setMessage('Activation link regenerated successfully.')
    } catch (requestError) {
      setError(activationRegenerationErrorMessage(requestError))
    } finally {
      setRegeneratingUserId(null)
    }
  }

  async function runUserAction(action: Promise<unknown>, success: string) {
    setError(null)
    setMessage(null)
    try {
      await action
      setMessage(success)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Administrative action failed.')
    }
  }

  const summary = [
    { label: 'Users', value: users.length },
    { label: 'Invitations', value: invitations.length },
    { label: 'Pending Activation', value: pendingFirstAccessCount },
    { label: 'Blocked', value: blockedCount },
    { label: 'Disabled', value: disabledCount },
    { label: 'Archived', value: 'Not Available' }
  ]

  if (loading) {
    return <LoadingState title="Loading Users" message="Fetching users and invitations from existing administration APIs." />
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Provision enterprise users through invitations, review pending activation, and inspect user lifecycle states."
        actions={
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="button" onClick={() => setInviteOpen(true)}>
            Invite User
          </button>
        }
      />

      {message && <SuccessAlert>{message}</SuccessAlert>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {inviteResult && (
        <InvitationManagementPanel
          title="Invitation Created Successfully"
          invitation={{
            ...inviteResult,
            provisioning_status: inviteResult.provisioning_status ?? 'PROVISIONED',
            identity_lifecycle_status: inviteResult.identity_lifecycle_status ?? 'WAITING_FIRST_ACCESS'
          }}
          regenerating={regeneratingUserId === inviteResult.user_id}
          onRegenerate={invitation => void handleRegenerateActivationLink(invitation)}
        />
      )}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summary.map(item => (
          <SectionCard key={item.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-agent-primary">{item.value}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard padded={false}>
        <div className="flex overflow-x-auto border-b border-slate-100 px-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'INVITATIONS' ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Expired</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map(invitation => {
                    const states = invitationStateSet(invitation)
                    const identityStatus = invitedLifecycleStatus(invitation)
                    const isPending = identityStatus === 'WAITING_FIRST_ACCESS' || states.has('PENDING') || states.has('PENDING_ACTIVATION') || states.has('INVITED')
                    const isCompleted = identityStatus === 'ACTIVE' || identityStatus === 'COMPLETED' || states.has('COMPLETED')
                    const isExpired = states.has('EXPIRED')
                    return (
                      <tr key={invitation.id} className="cursor-pointer hover:bg-slate-50" onClick={() => void loadInvitationDetail(invitation)}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{invitation.full_name || 'Not Available'}</div>
                          <div className="text-xs text-slate-500">{invitation.email || 'Not Available'}</div>
                        </td>
                        <td className="px-4 py-3"><RoleBadge>{invitation.role || 'Not Available'}</RoleBadge></td>
                        <td className="px-4 py-3">{isPending ? <StatusBadge tone="amber">Pending</StatusBadge> : 'Not Available'}</td>
                        <td className="px-4 py-3">{isCompleted ? <StatusBadge tone="emerald">Completed</StatusBadge> : 'Not Available'}</td>
                        <td className="px-4 py-3">{isExpired ? <StatusBadge tone="red">Expired</StatusBadge> : 'Not Available'}</td>
                        <td className="px-4 py-3">{formatDate(invitation.created_at)}</td>
                      </tr>
                    )
                  })}
                  {invitations.length === 0 && (
                    <tr>
                      <td className="px-4 py-8" colSpan={6}>
                        <EmptyState title="No invitations" message="No invitations are available from the current API response." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'ARCHIVED' ? (
          <div className="p-5">
            <ErrorState title="Archived users unavailable" message="The current API does not expose archived users. Not Available." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedUsers.map(user => (
                  <tr key={user.user_id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-900">{user.display_name || 'Not Available'}</td>
                    <td className="px-4 py-3">{user.email || 'Not Available'}</td>
                    <td className="px-4 py-3"><RoleBadge>{user.role}</RoleBadge></td>
                    <td className="px-4 py-3"><StatusBadge tone={statusTone(userLifecycleStatus(user, userInvitation.get(user.user_id)))}>{userLifecycleStatus(user, userInvitation.get(user.user_id))}</StatusBadge></td>
                    <td className="px-4 py-3">{formatDate(user.last_login_at)}</td>
                    <td className="px-4 py-3">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-64 flex-wrap gap-2">
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" type="button" onClick={() => setSelectedUser(user)}>
                          View
                        </button>
                        <button className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => setPendingAction({
                          title: 'Block User',
                          description: `Block ${user.display_name || user.email}?`,
                          confirmLabel: 'Block',
                          destructive: true,
                          run: () => void runUserAction(blockAdminUser(user.user_id), 'User blocked.')
                        })}>
                          Block
                        </button>
                        <button className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => setPendingAction({
                          title: 'Disable User',
                          description: `Disable ${user.display_name || user.email}?`,
                          confirmLabel: 'Disable',
                          destructive: true,
                          run: () => void runUserAction(deactivateAdminUser(user.user_id), 'User disabled.')
                        })}>
                          Disable
                        </button>
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-400" type="button" disabled title="Not Available">
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedUsers.length === 0 && (
                  <tr>
                    <td className="px-4 py-8" colSpan={7}>
                      <EmptyState title="No users" message="No users are available for this tab." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {activeTab === 'INVITATIONS' && selectedInvitation && (
        <InvitationManagementPanel
          title="Invitation Detail"
          invitation={selectedInvitation}
          regenerating={regeneratingUserId === selectedInvitation.user_id}
          onRegenerate={invitation => void handleRegenerateActivationLink(invitation)}
        />
      )}

      {activeTab === 'INVITATIONS' && !selectedInvitation && invitations.length > 0 && (
        <SectionCard>
          <EmptyState title="Select an invitation" message="Click an invitation to inspect provisioning, identity lifecycle, activation, and expiration details." />
        </SectionCard>
      )}

      {selectedUser && (
        <SectionCard title="User Detail" description="Read-only information returned by the existing users API.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Name" value={selectedUser.display_name} />
            <DetailRow label="Email" value={selectedUser.email} />
            <DetailRow label="Role" value={selectedUser.role} />
            <DetailRow label="Status" value={userLifecycleStatus(selectedUser, userInvitation.get(selectedUser.user_id))} />
            <DetailRow label="Last Login" value={formatDate(selectedUser.last_login_at)} />
            <DetailRow label="Created At" value={formatDate(selectedUser.created_at)} />
          </div>
        </SectionCard>
      )}

      <InviteUserModal
        open={inviteOpen}
        form={inviteForm}
        submitting={inviteSubmitting}
        onChange={setInviteForm}
        onCancel={() => setInviteOpen(false)}
        onSubmit={handleInvite}
      />

      <ConfirmationDialog
        open={pendingAction !== null}
        title={pendingAction?.title ?? ''}
        description={pendingAction?.description}
        confirmLabel={pendingAction?.confirmLabel ?? 'Confirm'}
        cancelLabel="Cancel"
        destructive={pendingAction?.destructive}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction
          setPendingAction(null)
          action?.run()
        }}
      />
    </PageContainer>
  )
}
