import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createDiscoverySource,
  deleteDiscoverySource,
  listDiscoverySources,
  setDiscoverySourceActive,
  updateDiscoverySource,
  type DiscoverySource
} from '../lib/discoverySourceApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  ConfirmationDialog,
  EmptyState,
  ErrorAlert,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function isLinkedInJobsUrl(value: string) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return (
      ['http:', 'https:'].includes(url.protocol)
      && (host === 'linkedin.com' || host.endsWith('.linkedin.com'))
      && url.pathname.toLowerCase().startsWith('/jobs')
    )
  } catch {
    return false
  }
}

function accountName(accounts: LinkedInAccount[], accountId: string) {
  return accounts.find(account => account.account_id === accountId)?.display_name ?? '-'
}

type FormState = {
  sourceId: string | null
  name: string
  linkedinAccountId: string
  searchUrl: string
  executionIntervalHours: string
  active: boolean
}

const emptyForm: FormState = {
  sourceId: null,
  name: '',
  linkedinAccountId: '',
  searchUrl: '',
  executionIntervalHours: '6',
  active: true
}

export default function DiscoverySourcesPage() {
  const { t } = useLanguage()
  const [sources, setSources] = useState<DiscoverySource[]>([])
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sourceToDelete, setSourceToDelete] = useState<DiscoverySource | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([
      listDiscoverySources(includeInactive),
      listLinkedInAccounts(false)
    ])
      .then(([sourceItems, accountItems]) => {
        setSources(sourceItems)
        setAccounts(accountItems)
        if (!form.linkedinAccountId) {
          setForm(current => ({
            ...current,
            linkedinAccountId: accountItems.find(account => account.default_account)?.account_id ?? accountItems[0]?.account_id ?? ''
          }))
        }
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [includeInactive])

  const activeCount = useMemo(() => sources.filter(source => source.active).length, [sources])
  const inactiveCount = sources.length - activeCount
  const canSubmit = accounts.length > 0

  function openCreateForm() {
    setError(null)
    setForm({
      ...emptyForm,
      linkedinAccountId: accounts.find(account => account.default_account)?.account_id ?? accounts[0]?.account_id ?? ''
    })
    setFormOpen(true)
  }

  function openEditForm(source: DiscoverySource) {
    setError(null)
    setForm({
      sourceId: source.source_id,
      name: source.name,
      linkedinAccountId: source.linkedin_account_id,
      searchUrl: source.search_url,
      executionIntervalHours: String(source.execution_interval_hours),
      active: source.active
    })
    setFormOpen(true)
  }

  function validateForm() {
    if (!form.name.trim()) {
      return t('discoverySources.nameRequired')
    }
    if (!form.searchUrl.trim()) {
      return t('discoverySources.urlRequired')
    }
    if (!isLinkedInJobsUrl(form.searchUrl)) {
      return t('discoverySources.linkedinJobsUrlRequired')
    }
    if (!form.linkedinAccountId) {
      return t('discoverySources.accountRequired')
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setMessage(null)
    setError(null)
    const payload = {
      linkedin_account_id: form.linkedinAccountId,
      name: form.name,
      search_url: form.searchUrl,
      active: form.active,
      execution_interval_hours: Number(form.executionIntervalHours)
    }

    try {
      if (form.sourceId) {
        await updateDiscoverySource(form.sourceId, payload)
        setMessage(t('discoverySources.updated'))
      } else {
        await createDiscoverySource(payload)
        setMessage(t('discoverySources.created'))
      }
      setFormOpen(false)
      setForm(emptyForm)
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('discoverySources.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleActiveToggle(source: DiscoverySource) {
    setMessage(null)
    setError(null)
    try {
      await setDiscoverySourceActive(source.source_id, !source.active)
      setMessage(source.active ? t('discoverySources.deactivated') : t('discoverySources.activated'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('discoverySources.statusFailed'))
    }
  }

  async function handleDelete(source: DiscoverySource) {
    setMessage(null)
    setError(null)
    try {
      await deleteDiscoverySource(source.source_id)
      setMessage(t('discoverySources.deleted'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('discoverySources.deleteFailed'))
    }
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow={t('career.section')}
        title={t('discoverySources.title')}
        description={t('discoverySources.description')}
        actions={(
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            disabled={loading || accounts.length === 0}
            type="button"
            onClick={openCreateForm}
          >
            {t('discoverySources.new')}
          </button>
        )}
      />

      {message && <SuccessAlert>{message}</SuccessAlert>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard>
          <div className="text-xs font-semibold uppercase text-slate-500">{t('discoverySources.total')}</div>
          <div className="mt-2 text-3xl font-extrabold text-agent-primary">{sources.length}</div>
        </SectionCard>
        <SectionCard>
          <div className="text-xs font-semibold uppercase text-slate-500">{t('discoverySources.active')}</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700">{activeCount}</div>
        </SectionCard>
        <SectionCard>
          <div className="text-xs font-semibold uppercase text-slate-500">{t('discoverySources.inactive')}</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-500">{inactiveCount}</div>
        </SectionCard>
      </div>

      {formOpen && (
        <SectionCard title={form.sourceId ? t('discoverySources.editTitle') : t('discoverySources.createTitle')} description={t('discoverySources.formDescription')}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('discoverySources.name')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                  placeholder="QA Automation Canada"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('discoverySources.linkedinAccount')}</span>
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  value={form.linkedinAccountId}
                  onChange={event => setForm(current => ({ ...current, linkedinAccountId: event.target.value }))}
                  required
                >
                  <option value="">{t('discoverySources.selectAccount')}</option>
                  {accounts.map(account => (
                    <option key={account.account_id} value={account.account_id}>{account.display_name}</option>
                  ))}
                </select>
              </label>
              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">{t('discoverySources.searchUrl')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  value={form.searchUrl}
                  onChange={event => setForm(current => ({ ...current, searchUrl: event.target.value }))}
                  placeholder="https://www.linkedin.com/jobs/search/?keywords=QA%20Automation"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('discoverySources.interval')}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  min={1}
                  max={720}
                  type="number"
                  value={form.executionIntervalHours}
                  onChange={event => setForm(current => ({ ...current, executionIntervalHours: event.target.value }))}
                  required
                />
              </label>
              <label className="mt-8 flex items-center gap-2 text-sm font-medium text-slate-700">
                <input checked={form.active} type="checkbox" onChange={event => setForm(current => ({ ...current, active: event.target.checked }))} />
                {t('discoverySources.enabled')}
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                disabled={saving || !canSubmit}
                type="submit"
              >
                {saving ? t('discoverySources.saving') : t('discoverySources.save')}
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={saving}
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  setForm(emptyForm)
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard className="overflow-hidden" padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-agent-primary">{t('discoverySources.library')}</h3>
            <p className="text-sm text-slate-500">{t('discoverySources.libraryDescription')}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input checked={includeInactive} type="checkbox" onChange={event => setIncludeInactive(event.target.checked)} />
            {t('discoverySources.includeInactive')}
          </label>
        </div>

        {loading && <LoadingState title={t('discoverySources.loading')} message={t('discoverySources.loading')} />}
        {!loading && sources.length === 0 && (
          <div className="p-5">
            <EmptyState title={t('discoverySources.emptyTitle')} message={accounts.length === 0 ? t('discoverySources.noAccounts') : t('discoverySources.emptyMessage')} />
          </div>
        )}

        {!loading && sources.length > 0 && (
          <div className="divide-y divide-slate-100">
            {sources.map(source => (
              <article className="grid gap-4 p-5 transition hover:bg-slate-50 xl:grid-cols-[1.35fr_1.1fr_0.8fr_auto]" key={source.source_id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-base font-extrabold text-agent-primary">{source.name}</h4>
                    <StatusBadge tone={source.active ? 'emerald' : 'slate'}>{source.active ? t('discoverySources.activeStatus') : t('discoverySources.inactiveStatus')}</StatusBadge>
                  </div>
                  <a className="mt-2 block truncate text-sm font-medium text-brand-700 hover:text-brand-900" href={source.search_url} rel="noreferrer" target="_blank">
                    {source.search_url}
                  </a>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="text-xs font-semibold uppercase text-slate-400">{t('discoverySources.account')}</div>
                  <div className="mt-1 font-semibold text-agent-primary">{accountName(accounts, source.linkedin_account_id)}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div><span className="font-semibold">{t('discoverySources.interval')}:</span> {source.execution_interval_hours}h</div>
                  <div className="mt-1"><span className="font-semibold">{t('discoverySources.updatedAt')}:</span> {formatDate(source.updated_at)}</div>
                </div>
                <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                  <a className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" href={source.search_url} rel="noreferrer" target="_blank">
                    {t('discoverySources.open')}
                  </a>
                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => openEditForm(source)}>
                    {t('discoverySources.edit')}
                  </button>
                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => void handleActiveToggle(source)}>
                    {source.active ? t('discoverySources.deactivate') : t('discoverySources.activate')}
                  </button>
                  <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => setSourceToDelete(source)}>
                    {t('discoverySources.delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmationDialog
        open={sourceToDelete !== null}
        title={t('discoverySources.deleteTitle')}
        description={sourceToDelete ? `${t('discoverySources.deleteDescription')} ${sourceToDelete.name}` : undefined}
        confirmLabel={t('discoverySources.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setSourceToDelete(null)}
        onConfirm={() => {
          if (!sourceToDelete) return
          const source = sourceToDelete
          setSourceToDelete(null)
          void handleDelete(source)
        }}
      />
    </PageContainer>
  )
}
