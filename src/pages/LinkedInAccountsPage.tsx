import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createLinkedInAccount,
  disconnectLinkedInAccount,
  listLinkedInAccounts,
  setDefaultLinkedInAccount,
  type LinkedInAccount
} from '../lib/linkedinAccountApi'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  EmptyState,
  ErrorAlert,
  InfoAlert,
  LoadingState,
  PageContainer,
  SectionCard,
  StatusBadge,
  SuccessAlert,
  ConfirmationDialog
} from '../components/design-system'

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export default function LinkedInAccountsPage() {
  const { t } = useLanguage()
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [includeDisconnected, setIncludeDisconnected] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [linkedinEmail, setLinkedinEmail] = useState('')
  const [storageState, setStorageState] = useState('')
  const [makeDefault, setMakeDefault] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accountToDisconnect, setAccountToDisconnect] = useState<LinkedInAccount | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listLinkedInAccounts(includeDisconnected)
      .then(setAccounts)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [includeDisconnected])

  const activeCount = useMemo(() => accounts.filter(account => account.active).length, [accounts])
  const defaultAccount = accounts.find(account => account.default_account && account.active)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      await createLinkedInAccount({
        display_name: displayName,
        linkedin_email: linkedinEmail,
        storage_state: storageState,
        make_default: makeDefault
      })
      setDisplayName('')
      setLinkedinEmail('')
      setStorageState('')
      setMakeDefault(true)
      setMessage(t('linkedinAccounts.created'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('linkedinAccounts.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDefault(accountId: string) {
    setMessage(null)
    setError(null)
    try {
      await setDefaultLinkedInAccount(accountId)
      setMessage(t('linkedinAccounts.defaultUpdated'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('linkedinAccounts.defaultFailed'))
    }
  }

  async function handleDisconnect(accountId: string) {
    setMessage(null)
    setError(null)
    try {
      await disconnectLinkedInAccount(accountId)
      setMessage(t('linkedinAccounts.disconnected'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('linkedinAccounts.disconnectFailed'))
    }
  }

  return (
    <PageContainer className="space-y-5" size="lg">
      <SectionCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('career.section')}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('linkedinAccounts.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('linkedinAccounts.description')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-brand-700">{t('linkedinAccounts.active')}</div>
              <div className="text-xl font-extrabold text-agent-primary">{activeCount}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">{t('linkedinAccounts.default')}</div>
              <div className="max-w-40 truncate text-sm font-bold text-agent-primary">{defaultAccount?.display_name ?? '-'}</div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('linkedinAccounts.displayName')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={displayName} onChange={event => setDisplayName(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('linkedinAccounts.email')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type="email" value={linkedinEmail} onChange={event => setLinkedinEmail(event.target.value)} />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">{t('linkedinAccounts.storageState')}</span>
              <textarea className="mt-2 min-h-36 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs" value={storageState} onChange={event => setStorageState(event.target.value)} />
              <span className="mt-1 block text-xs text-slate-500">{t('linkedinAccounts.storageStateHelp')}</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input checked={makeDefault} type="checkbox" onChange={event => setMakeDefault(event.target.checked)} />
              {t('linkedinAccounts.makeDefault')}
            </label>
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">
              {saving ? t('linkedinAccounts.saving') : t('linkedinAccounts.create')}
            </button>
          </div>
        </form>
        <div className="mt-4 flex items-center gap-2">
          <input id="include-disconnected" checked={includeDisconnected} type="checkbox" onChange={event => setIncludeDisconnected(event.target.checked)} />
          <label className="text-sm font-medium text-slate-600" htmlFor="include-disconnected">{t('linkedinAccounts.includeDisconnected')}</label>
        </div>
        {message && <SuccessAlert className="mt-4">{message}</SuccessAlert>}
        {error && <ErrorAlert className="mt-4">{error}</ErrorAlert>}
      </SectionCard>

      <SectionCard className="overflow-hidden" padded={false}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-extrabold text-agent-primary">{t('linkedinAccounts.library')}</h3>
          <p className="text-sm text-slate-500">{t('linkedinAccounts.libraryDescription')}</p>
        </div>

        {loading && <LoadingState title={t('linkedinAccounts.loading')} message={t('linkedinAccounts.loading')} />}
        {!loading && accounts.length === 0 && <EmptyState title={t('linkedinAccounts.empty')} message={t('linkedinAccounts.empty')} />}

        {!loading && accounts.length > 0 && (
          <div className="divide-y divide-slate-100">
            {accounts.map(account => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1.2fr_auto]" key={account.account_id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-extrabold text-agent-primary">{account.display_name}</h4>
                    <StatusBadge tone={account.active ? 'emerald' : 'slate'}>{account.status}</StatusBadge>
                    {account.default_account && <StatusBadge tone="brand">{t('linkedinAccounts.default')}</StatusBadge>}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{account.linkedin_email}</div>
                  <InfoAlert className="mt-2 border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {t('linkedinAccounts.storageStateProtected')}
                  </InfoAlert>
                </div>
                <div className="text-sm text-slate-600">
                  <div><span className="font-semibold">{t('linkedinAccounts.lastSync')}:</span> {formatDate(account.last_sync_at)}</div>
                  <div className="mt-1"><span className="font-semibold">{t('linkedinAccounts.lastUsed')}:</span> {formatDate(account.last_used_at)}</div>
                  <div className="mt-1"><span className="font-semibold">{t('linkedinAccounts.createdAt')}:</span> {formatDate(account.created_at)}</div>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  {account.active && !account.default_account && (
                    <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" type="button" onClick={() => void handleDefault(account.account_id)}>
                      {t('linkedinAccounts.setDefault')}
                    </button>
                  )}
                  {account.active && (
                    <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => setAccountToDisconnect(account)}>
                      {t('linkedinAccounts.disconnect')}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
      <ConfirmationDialog
        open={accountToDisconnect !== null}
        title="Disconnect LinkedIn Account"
        description={accountToDisconnect ? `Disconnect "${accountToDisconnect.display_name}"? Campaigns will no longer use this account while it is disconnected.` : undefined}
        confirmLabel={t('linkedinAccounts.disconnect')}
        cancelLabel="Cancel"
        destructive
        onCancel={() => setAccountToDisconnect(null)}
        onConfirm={() => {
          if (!accountToDisconnect) return
          const accountId = accountToDisconnect.account_id
          setAccountToDisconnect(null)
          void handleDisconnect(accountId)
        }}
      />
    </PageContainer>
  )
}
