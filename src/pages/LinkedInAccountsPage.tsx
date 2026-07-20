import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createLinkedInAccount,
  createLinkedInAccountFromLogin,
  disconnectLinkedInAccount,
  listLinkedInAccounts,
  setDefaultLinkedInAccount,
  type LinkedInAccount
} from '../lib/linkedinAccountApi'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  EmptyState,
  ErrorAlert,
  LoadingState,
  PageContainer,
  SectionCard,
  StatusBadge,
  SuccessAlert,
  ConfirmationDialog
} from '../components/design-system'

function formatDate(value: string | null) {
  if (!value) {
    return null
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function statusTone(account: LinkedInAccount) {
  return account.active ? 'emerald' : 'slate'
}

function readableStatus(account: LinkedInAccount): 'linkedinAccounts.connected' | 'linkedinAccounts.disconnectedStatus' {
  return account.active ? 'linkedinAccounts.connected' : 'linkedinAccounts.disconnectedStatus'
}

function sessionState(account: LinkedInAccount): 'linkedinAccounts.sessionActive' | 'linkedinAccounts.sessionExpired' {
  return account.active ? 'linkedinAccounts.sessionActive' : 'linkedinAccounts.sessionExpired'
}

function accountInitials(account: LinkedInAccount) {
  const source = account.display_name || account.linkedin_email || 'LinkedIn'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'LI'
}

type DetailItemProps = {
  label: string
  value: string | number | boolean | null | undefined
  fallback: string
}

function DetailItem({ label, value, fallback }: DetailItemProps) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-agent-primary">{value ?? fallback}</div>
    </div>
  )
}

type ConnectDialogProps = {
  open: boolean
  saving: boolean
  connectionMethod: 'login' | 'upload'
  displayName: string
  linkedinEmail: string
  linkedinPassword: string
  selectedFileName: string
  makeDefault: boolean
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onConnectionMethodChange: (value: 'login' | 'upload') => void
  onDisplayNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onMakeDefaultChange: (value: boolean) => void
  t: ReturnType<typeof useLanguage>['t']
}

function ConnectLinkedInDialog({
  open,
  saving,
  connectionMethod,
  displayName,
  linkedinEmail,
  linkedinPassword,
  selectedFileName,
  makeDefault,
  onCancel,
  onSubmit,
  onConnectionMethodChange,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onFileChange,
  onMakeDefaultChange,
  t
}: ConnectDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
      <form className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onSubmit={onSubmit}>
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase text-brand-600">{t('linkedinAccounts.session')}</div>
          <h3 className="mt-1 text-xl font-extrabold text-agent-primary">{t('linkedinAccounts.connect')}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {t('linkedinAccounts.modalDescription')}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${connectionMethod === 'login' ? 'bg-white text-agent-primary shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}>
              <input
                checked={connectionMethod === 'login'}
                name="linkedin-connection-method"
                type="radio"
                value="login"
                onChange={() => onConnectionMethodChange('login')}
              />
              {t('linkedinAccounts.loginMethod')}
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${connectionMethod === 'upload' ? 'bg-white text-agent-primary shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}>
              <input
                checked={connectionMethod === 'upload'}
                name="linkedin-connection-method"
                type="radio"
                value="upload"
                onChange={() => onConnectionMethodChange('upload')}
              />
              {t('linkedinAccounts.uploadMethod')}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('linkedinAccounts.displayName')}</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                value={displayName}
                onChange={event => onDisplayNameChange(event.target.value)}
                placeholder="Work LinkedIn"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('linkedinAccounts.email')}</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                type="email"
                value={linkedinEmail}
                onChange={event => onEmailChange(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          </div>

          {connectionMethod === 'login' && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('linkedinAccounts.password')}</span>
              <input
                autoComplete="new-password"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                type="password"
                value={linkedinPassword}
                onChange={event => onPasswordChange(event.target.value)}
                required={connectionMethod === 'login'}
              />
              <span className="mt-1 block text-xs text-slate-500">{t('linkedinAccounts.passwordHelp')}</span>
            </label>
          )}

          {connectionMethod === 'upload' && (
            <label className="block rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-5">
              <span className="text-sm font-bold text-agent-primary">storage_state.json</span>
              <span className="mt-1 block text-sm text-slate-600">
                {t('linkedinAccounts.fileHelp')}
              </span>
              <input
                accept="application/json,.json"
                className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
                type="file"
                onChange={onFileChange}
                required={connectionMethod === 'upload'}
              />
              <span className="mt-3 block text-xs font-semibold text-slate-500">
                {selectedFileName ? `${t('linkedinAccounts.selectedFile')}: ${selectedFileName}` : t('linkedinAccounts.noFileSelected')}
              </span>
            </label>
          )}

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input checked={makeDefault} type="checkbox" onChange={event => onMakeDefaultChange(event.target.checked)} />
            {t('linkedinAccounts.makeDefault')}
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            {t('linkedinAccounts.cancel')}
          </button>
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? t('linkedinAccounts.connecting') : t('linkedinAccounts.connect')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function LinkedInAccountsPage() {
  const { t } = useLanguage()
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [includeDisconnected, setIncludeDisconnected] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectionMethod, setConnectionMethod] = useState<'login' | 'upload'>('login')
  const [displayName, setDisplayName] = useState('')
  const [linkedinEmail, setLinkedinEmail] = useState('')
  const [linkedinPassword, setLinkedinPassword] = useState('')
  const [storageState, setStorageState] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [makeDefault, setMakeDefault] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accountToDisconnect, setAccountToDisconnect] = useState<LinkedInAccount | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listLinkedInAccounts(true)
      .then(setAccounts)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const activeAccounts = useMemo(() => accounts.filter(account => account.active), [accounts])
  const visibleLibraryAccounts = useMemo(
    () => includeDisconnected ? accounts : accounts.filter(account => account.active),
    [accounts, includeDisconnected]
  )
  const defaultAccount = activeAccounts.find(account => account.default_account)
  const connectedAccount = defaultAccount ?? activeAccounts[0] ?? null
  const showAccountLibrary = accounts.length >= 2

  function resetConnectForm() {
    setConnectionMethod('login')
    setDisplayName('')
    setLinkedinEmail('')
    setLinkedinPassword('')
    setStorageState('')
    setSelectedFileName('')
    setMakeDefault(true)
  }

  async function handleSessionFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      setStorageState('')
      setSelectedFileName('')
      return
    }
    setSelectedFileName(file.name)
    setError(null)
    try {
      const content = await file.text()
      setStorageState(content)
    } catch {
      setStorageState('')
      setError(t('linkedinAccounts.fileReadFailed'))
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    if (connectionMethod === 'upload' && !storageState.trim()) {
      setSaving(false)
      setError(t('linkedinAccounts.selectFileError'))
      return
    }

    if (connectionMethod === 'login' && !linkedinPassword.trim()) {
      setSaving(false)
      setError(t('linkedinAccounts.passwordRequired'))
      return
    }

    try {
      if (connectionMethod === 'login') {
        await createLinkedInAccountFromLogin({
          display_name: displayName,
          linkedin_email: linkedinEmail,
          linkedin_password: linkedinPassword,
          make_default: makeDefault
        })
      } else {
        await createLinkedInAccount({
          display_name: displayName,
          linkedin_email: linkedinEmail,
          storage_state: storageState,
          make_default: makeDefault
        })
      }
      resetConnectForm()
      setConnectOpen(false)
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
    <PageContainer className="space-y-5" size="xl">
      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('career.section')}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-extrabold text-agent-primary">{t('linkedinAccounts.yourLinkedinAccount')}</h2>
              <StatusBadge tone={connectedAccount ? statusTone(connectedAccount) : 'slate'}>
                {loading ? t('common.loading') : connectedAccount ? t(readableStatus(connectedAccount)) : t('linkedinAccounts.notConnected')}
              </StatusBadge>
            </div>

            {loading ? (
              <div className="mt-4">
                <LoadingState title={t('linkedinAccounts.loading')} message={t('linkedinAccounts.loading')} />
              </div>
            ) : connectedAccount ? (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-lg font-extrabold text-brand-700">
                  {accountInitials(connectedAccount)}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-agent-primary">{connectedAccount.display_name}</h3>
                  <div className="mt-1 text-sm text-slate-500">{connectedAccount.linkedin_email}</div>
                  <div className="mt-2 text-sm font-semibold text-emerald-700">{t('linkedinAccounts.discoveryReady')}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    {t('linkedinAccounts.lastAuthenticated')}: {formatDate(connectedAccount.last_sync_at ?? connectedAccount.updated_at) ?? t('linkedinAccounts.notAvailable')}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                {t('linkedinAccounts.singleAccountDescription')}
              </p>
            )}
          </div>

          {!loading && (
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {connectedAccount ? (
              <>
                <button
                  className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  type="button"
                  onClick={() => {
                    setError(null)
                    setConnectOpen(true)
                  }}
                >
                  {t('linkedinAccounts.reconnect')}
                </button>
                <button
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  disabled={!connectedAccount.active}
                  type="button"
                  onClick={() => setAccountToDisconnect(connectedAccount)}
                >
                  {t('linkedinAccounts.disconnect')}
                </button>
              </>
              ) : (
                <button
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  type="button"
                  onClick={() => {
                    setError(null)
                    setConnectOpen(true)
                  }}
                >
                  {t('linkedinAccounts.connect')}
                </button>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {message && <SuccessAlert>{message}</SuccessAlert>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {showAccountLibrary && (
      <SectionCard className="overflow-hidden" padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-agent-primary">{t('linkedinAccounts.library')}</h3>
            <p className="text-sm text-slate-500">{t('linkedinAccounts.enterpriseLibraryDescription')}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input checked={includeDisconnected} type="checkbox" onChange={event => setIncludeDisconnected(event.target.checked)} />
            {t('linkedinAccounts.includeDisconnected')}
          </label>
        </div>

        {loading && <LoadingState title={t('linkedinAccounts.loading')} message={t('linkedinAccounts.loading')} />}
        {!loading && visibleLibraryAccounts.length === 0 && (
          <div className="p-5">
            <EmptyState title={t('linkedinAccounts.emptyConnectedTitle')} message={t('linkedinAccounts.emptyConnectedMessage')} />
          </div>
        )}

        {!loading && visibleLibraryAccounts.length > 0 && (
          <div className="divide-y divide-slate-100">
            {visibleLibraryAccounts.map(account => (
              <article className="grid gap-4 p-5 transition hover:bg-slate-50 lg:grid-cols-[1.25fr_1.5fr_auto]" key={account.account_id}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">
                    {accountInitials(account)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-extrabold text-agent-primary">{account.display_name}</h4>
                      <StatusBadge tone={statusTone(account)}>{t(readableStatus(account))}</StatusBadge>
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">{account.linkedin_email}</div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <DetailItem fallback={t('linkedinAccounts.notAvailable')} label={t('linkedinAccounts.default')} value={account.default_account ? t('linkedinAccounts.yes') : t('linkedinAccounts.no')} />
                  <DetailItem fallback={t('linkedinAccounts.notAvailable')} label={t('linkedinAccounts.lastConnection')} value={formatDate(account.last_sync_at ?? account.updated_at)} />
                  <DetailItem fallback={t('linkedinAccounts.notAvailable')} label={t('linkedinAccounts.session')} value={t(sessionState(account))} />
                </div>

                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  {account.active && !account.default_account && (
                    <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" type="button" onClick={() => void handleDefault(account.account_id)}>
                      {t('linkedinAccounts.setDefault')}
                    </button>
                  )}
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400"
                    disabled
                    type="button"
                    title={t('linkedinAccounts.updateUnavailable')}
                  >
                    {t('linkedinAccounts.updateSession')}
                  </button>
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
      )}

      <ConnectLinkedInDialog
        open={connectOpen}
        saving={saving}
        connectionMethod={connectionMethod}
        displayName={displayName}
        linkedinEmail={linkedinEmail}
        linkedinPassword={linkedinPassword}
        selectedFileName={selectedFileName}
        makeDefault={makeDefault}
        onCancel={() => {
          if (saving) return
          setConnectOpen(false)
          resetConnectForm()
        }}
        onSubmit={handleCreate}
        onConnectionMethodChange={setConnectionMethod}
        onDisplayNameChange={setDisplayName}
        onEmailChange={setLinkedinEmail}
        onPasswordChange={setLinkedinPassword}
        onFileChange={event => void handleSessionFileChange(event)}
        onMakeDefaultChange={setMakeDefault}
        t={t}
      />

      <ConfirmationDialog
        open={accountToDisconnect !== null}
        title={t('linkedinAccounts.disconnectTitle')}
        description={accountToDisconnect ? `${t('linkedinAccounts.disconnectDescription')} ${accountToDisconnect.display_name}` : undefined}
        confirmLabel={t('linkedinAccounts.disconnect')}
        cancelLabel={t('linkedinAccounts.cancel')}
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
