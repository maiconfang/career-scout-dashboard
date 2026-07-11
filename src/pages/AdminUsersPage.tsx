import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  activateAdminUser,
  blockAdminUser,
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  regenerateActivationToken,
  resetAdminUserPassword,
  unblockAdminUser,
  type CreateUserResponse,
  type PasswordResetTokenResponse,
  type PlatformUser
} from '../lib/authApi'
import { useLanguage } from '../i18n/LanguageProvider'

const PAGE_SIZE = 10

type SortField = 'display_name' | 'email' | 'role' | 'status' | 'locale' | 'created_at' | 'last_login_at'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ')
  }
}

export default function AdminUsersPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [offset, setOffset] = useState(0)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [tokenResult, setTokenResult] = useState<CreateUserResponse | null>(null)
  const [resetResult, setResetResult] = useState<PasswordResetTokenResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    email: '',
    role: 'USER' as 'ADMIN' | 'USER',
    locale: 'en' as 'en' | 'fr' | 'pt-BR'
  })

  function loadUsers() {
    setLoading(true)
    setError(null)
    listAdminUsers()
      .then(setUsers)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadUsers, [])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedEmail = emailQuery.trim().toLowerCase()

    return users
      .filter(user => {
        const names = splitName(user.display_name)
        const nameMatch = !normalizedQuery
          || user.display_name.toLowerCase().includes(normalizedQuery)
          || names.firstName.toLowerCase().includes(normalizedQuery)
          || names.lastName.toLowerCase().includes(normalizedQuery)
        const emailMatch = !normalizedEmail || user.email.toLowerCase().includes(normalizedEmail)
        const roleMatch = !role || user.role === role
        const statusMatch = !status || user.status === status
        return nameMatch && emailMatch && roleMatch && statusMatch
      })
      .sort((first, second) => {
        const firstValue = String(first[sortField] ?? '')
        const secondValue = String(second[sortField] ?? '')
        const result = firstValue.localeCompare(secondValue)
        return sortDirection === 'asc' ? result : -result
      })
  }, [emailQuery, query, role, sortDirection, sortField, status, users])

  const page = filteredUsers.slice(offset, offset + PAGE_SIZE)
  const canGoBack = offset > 0
  const canGoForward = offset + PAGE_SIZE < filteredUsers.length

  async function refreshAfter(action: Promise<unknown>, success: string) {
    setActionMessage(null)
    setError(null)
    try {
      await action
      setActionMessage(success)
      loadUsers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('admin.actionFailed'))
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    setActionMessage(null)
    setTokenResult(null)
    setResetResult(null)

    try {
      const result = await createAdminUser(form)
      setTokenResult(result)
      setActionMessage(t('admin.userCreated'))
      setForm({
        first_name: '',
        last_name: '',
        display_name: '',
        email: '',
        role: 'USER',
        locale: 'en'
      })
      loadUsers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('admin.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  async function handleResetPassword(userId: string) {
    setResetResult(null)
    setTokenResult(null)
    try {
      const result = await resetAdminUserPassword(userId)
      setResetResult(result)
      setActionMessage(t('admin.resetTokenGenerated'))
      loadUsers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('admin.actionFailed'))
    }
  }

  async function handleRegenerateActivation(userId: string) {
    setResetResult(null)
    setTokenResult(null)
    try {
      const result = await regenerateActivationToken(userId)
      setTokenResult(result)
      setActionMessage(t('admin.activationTokenRegenerated'))
      loadUsers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('admin.actionFailed'))
    }
  }

  async function copyToken(value: string) {
    await navigator.clipboard.writeText(value)
    setActionMessage(t('admin.tokenCopied'))
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('admin.section')}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('admin.usersTitle')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('admin.usersDescription')}</p>
          </div>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
            {t('admin.adminOnly')}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">{t('admin.createUser')}</h3>
        <form className="mt-4 grid gap-3 lg:grid-cols-6" onSubmit={handleCreateUser}>
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={t('admin.firstName')} value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} required />
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={t('admin.lastName')} value={form.last_name} onChange={event => setForm({ ...form, last_name: event.target.value })} required />
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={t('admin.displayName')} value={form.display_name} onChange={event => setForm({ ...form, display_name: event.target.value })} />
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={t('admin.email')} type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={form.role} onChange={event => setForm({ ...form, role: event.target.value as 'ADMIN' | 'USER' })}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={form.locale} onChange={event => setForm({ ...form, locale: event.target.value as 'en' | 'fr' | 'pt-BR' })}>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="pt-BR">Português (Brasil)</option>
          </select>
          <div className="lg:col-span-6">
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={creating} type="submit">
              {creating ? t('admin.creating') : t('admin.createUser')}
            </button>
          </div>
        </form>
      </section>

      {(tokenResult || resetResult || actionMessage || error) && (
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
          {actionMessage && <div className="text-sm font-semibold text-emerald-700">{actionMessage}</div>}
          {error && <div className="text-sm font-semibold text-red-700">{error}</div>}
          {tokenResult && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-semibold text-slate-800">{t('admin.activationToken')}</div>
              <code className="block break-all rounded-lg bg-slate-50 p-3 text-xs">{tokenResult.activation_token}</code>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => void copyToken(tokenResult.activation_token)} type="button">
                {t('admin.copy')}
              </button>
            </div>
          )}
          {resetResult && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-semibold text-slate-800">{t('admin.resetToken')}</div>
              <code className="block break-all rounded-lg bg-slate-50 p-3 text-xs">{resetResult.reset_token}</code>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => void copyToken(resetResult.reset_token)} type="button">
                {t('admin.copy')}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="grid gap-2 lg:grid-cols-6">
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={t('admin.searchByName')} value={query} onChange={event => { setOffset(0); setQuery(event.target.value) }} />
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={t('admin.searchByEmail')} value={emailQuery} onChange={event => { setOffset(0); setEmailQuery(event.target.value) }} />
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={role} onChange={event => { setOffset(0); setRole(event.target.value) }}>
            <option value="">{t('admin.allRoles')}</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={status} onChange={event => { setOffset(0); setStatus(event.target.value) }}>
            <option value="">{t('admin.allStatuses')}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={sortField} onChange={event => setSortField(event.target.value as SortField)}>
            <option value="display_name">{t('admin.displayName')}</option>
            <option value="email">{t('admin.email')}</option>
            <option value="role">Role</option>
            <option value="status">Status</option>
            <option value="locale">Locale</option>
            <option value="created_at">{t('admin.createdAt')}</option>
            <option value="last_login_at">{t('admin.lastLogin')}</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={sortDirection} onChange={event => setSortDirection(event.target.value as 'asc' | 'desc')}>
            <option value="asc">{t('admin.ascending')}</option>
            <option value="desc">{t('admin.descending')}</option>
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">{t('admin.firstName')}</th>
                <th className="px-3 py-3">{t('admin.lastName')}</th>
                <th className="px-3 py-3">{t('admin.displayName')}</th>
                <th className="px-3 py-3">{t('admin.email')}</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Locale</th>
                <th className="px-3 py-3">{t('admin.createdAt')}</th>
                <th className="px-3 py-3">{t('admin.lastLogin')}</th>
                <th className="px-3 py-3">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={10}>{t('admin.loadingUsers')}</td></tr>
              )}
              {!loading && page.map(user => {
                const names = splitName(user.display_name)
                return (
                  <tr key={user.user_id} className="align-top">
                    <td className="px-3 py-3">{user.first_name || names.firstName || '—'}</td>
                    <td className="px-3 py-3">{user.last_name || names.lastName || '—'}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{user.display_name || '—'}</td>
                    <td className="px-3 py-3">{user.email}</td>
                    <td className="px-3 py-3">{user.role}</td>
                    <td className="px-3 py-3">{user.status}</td>
                    <td className="px-3 py-3">{user.locale}</td>
                    <td className="px-3 py-3">{formatDate(user.created_at)}</td>
                    <td className="px-3 py-3">{formatDate(user.last_login_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-60 flex-wrap gap-2">
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50" onClick={() => void refreshAfter(blockAdminUser(user.user_id), t('admin.userBlocked'))}>{t('admin.block')}</button>
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50" onClick={() => void refreshAfter(unblockAdminUser(user.user_id), t('admin.userUnblocked'))}>{t('admin.unblock')}</button>
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50" onClick={() => void refreshAfter(activateAdminUser(user.user_id), t('admin.userActivated'))}>{t('admin.activate')}</button>
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50" onClick={() => void refreshAfter(deactivateAdminUser(user.user_id), t('admin.userDeactivated'))}>{t('admin.deactivate')}</button>
                        <button className="rounded border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50" onClick={() => void handleResetPassword(user.user_id)}>{t('admin.resetPassword')}</button>
                        <button className="rounded border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50" onClick={() => void handleRegenerateActivation(user.user_id)}>{t('admin.regenerateActivation')}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && page.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={10}>{t('admin.noUsers')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{t('admin.showing')} {filteredUsers.length === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, filteredUsers.length)} / {filteredUsers.length}</span>
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50" disabled={!canGoBack} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>{t('admin.previous')}</button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50" disabled={!canGoForward} onClick={() => setOffset(value => value + PAGE_SIZE)}>{t('admin.next')}</button>
          </div>
        </div>
      </section>
    </div>
  )
}
