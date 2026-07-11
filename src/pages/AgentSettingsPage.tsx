import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  listAgentSettings,
  listAgentSettingVersions,
  updateAgentSetting,
  type AgentSetting,
  type AgentSettingVersion
} from '../lib/agentSettingsApi'
import { useLanguage } from '../i18n/LanguageProvider'

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function valueToString(value: string | number | boolean) {
  return typeof value === 'boolean' ? String(value) : `${value}`
}

function parseValue(value: string, type: AgentSetting['value_type']) {
  if (type === 'integer') return Number.parseInt(value, 10)
  if (type === 'float') return Number.parseFloat(value)
  if (type === 'boolean') return value === 'true'
  return value
}

export default function AgentSettingsPage() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<AgentSetting[]>([])
  const [selected, setSelected] = useState<AgentSetting | null>(null)
  const [versions, setVersions] = useState<AgentSettingVersion[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editNotes, setEditNotes] = useState('')

  function load() {
    setLoading(true)
    setError(null)
    listAgentSettings()
      .then(items => {
        setSettings(items)
        if (!selected && items.length > 0) {
          setSelected(items[0])
          setEditValue(valueToString(items[0].current_value))
        }
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    if (!selected) return
    listAgentSettingVersions(selected.setting_key)
      .then(setVersions)
      .catch(() => setVersions([]))
  }, [selected])

  const categories = useMemo(
    () => Array.from(new Set(settings.map(setting => setting.category))).sort(),
    [settings]
  )

  const filteredSettings = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return settings.filter(setting => {
      const categoryMatch = !category || setting.category === category
      const queryMatch = !normalized
        || setting.setting_key.toLowerCase().includes(normalized)
        || setting.description.toLowerCase().includes(normalized)
        || setting.current_source.toLowerCase().includes(normalized)
      return categoryMatch && queryMatch
    })
  }, [category, query, settings])

  function selectSetting(setting: AgentSetting) {
    setSelected(setting)
    setEditValue(valueToString(setting.current_value))
    setEditNotes(setting.notes)
    setMessage(null)
    setError(null)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const updated = await updateAgentSetting(
        selected.setting_key,
        parseValue(editValue, selected.value_type),
        editNotes
      )
      setSelected(updated)
      setSettings(items => items.map(item => item.setting_id === updated.setting_id ? updated : item))
      setMessage(t('agentSettings.saved'))
      const versionItems = await listAgentSettingVersions(updated.setting_key)
      setVersions(versionItems)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('agentSettings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-5">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('nav.administration')}</div>
              <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('agentSettings.title')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('agentSettings.description')}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold uppercase text-amber-700">
              {t('agentSettings.observationalOnly')}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t('agentSettings.search')}
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={category}
              onChange={event => setCategory(event.target.value)}
            >
              <option value="">{t('agentSettings.allCategories')}</option>
              {categories.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card">
          {loading && <div className="p-5 text-sm text-slate-500">{t('agentSettings.loading')}</div>}
          {!loading && filteredSettings.length === 0 && <div className="p-5 text-sm text-slate-500">{t('agentSettings.empty')}</div>}
          <div className="divide-y divide-slate-100">
            {filteredSettings.map(setting => (
              <button
                className={`block w-full p-5 text-left transition hover:bg-slate-50 ${selected?.setting_id === setting.setting_id ? 'bg-brand-50' : 'bg-white'}`}
                key={setting.setting_id}
                type="button"
                onClick={() => selectSetting(setting)}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-600">{setting.category}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${setting.status === 'PLATFORM' ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700'}`}>{setting.status}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">v{setting.version}</span>
                    </div>
                    <div className="mt-2 font-mono text-sm font-semibold text-agent-primary">{setting.setting_key}</div>
                    <p className="mt-1 text-sm text-slate-600">{setting.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase text-slate-400">{t('agentSettings.currentValue')}</div>
                    <div className="font-mono text-lg font-extrabold text-agent-primary">{valueToString(setting.current_value)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
          {!selected && <div className="text-sm text-slate-500">{t('agentSettings.selectSetting')}</div>}
          {selected && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-600">{selected.category}</span>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold uppercase text-amber-700">{t('agentSettings.noRuntimeEffect')}</span>
              </div>
              <h3 className="mt-3 break-all font-mono text-lg font-extrabold text-agent-primary">{selected.setting_key}</h3>
              <p className="mt-2 text-sm text-slate-600">{selected.description}</p>

              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="font-semibold text-slate-500">{t('agentSettings.type')}</dt><dd>{selected.value_type}</dd></div>
                <div><dt className="font-semibold text-slate-500">{t('agentSettings.defaultValue')}</dt><dd className="font-mono">{valueToString(selected.default_value)}</dd></div>
                <div><dt className="font-semibold text-slate-500">{t('agentSettings.currentSource')}</dt><dd>{selected.current_source}</dd></div>
                <div><dt className="font-semibold text-slate-500">{t('agentSettings.futureSource')}</dt><dd>{selected.future_source}</dd></div>
                <div><dt className="font-semibold text-slate-500">{t('agentSettings.updatedAt')}</dt><dd>{formatDate(selected.updated_at)}</dd></div>
              </dl>

              <form className="mt-5 space-y-3" onSubmit={handleSave}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('agentSettings.platformValue')}</span>
                  {selected.value_type === 'boolean' ? (
                    <select className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={editValue} onChange={event => setEditValue(event.target.value)}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      type={selected.value_type === 'string' ? 'text' : 'number'}
                      step={selected.value_type === 'float' ? '0.01' : '1'}
                      value={editValue}
                      onChange={event => setEditValue(event.target.value)}
                    />
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('agentSettings.notes')}</span>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={editNotes}
                    onChange={event => setEditNotes(event.target.value)}
                  />
                </label>
                <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">
                  {saving ? t('agentSettings.saving') : t('agentSettings.save')}
                </button>
              </form>

              {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
              {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
            </>
          )}
        </section>

        {selected && (
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
            <h3 className="text-lg font-extrabold text-agent-primary">{t('agentSettings.versionHistory')}</h3>
            <div className="mt-3 space-y-3">
              {versions.length === 0 && <div className="text-sm text-slate-500">{t('agentSettings.noVersions')}</div>}
              {versions.map(version => (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm" key={version.setting_version_id}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-agent-primary">v{version.version}</span>
                    <span className="text-xs text-slate-500">{formatDate(version.created_at)}</span>
                  </div>
                  <div className="mt-2 font-mono text-slate-700">{valueToString(version.value)}</div>
                  {version.change_reason && <div className="mt-1 text-xs text-slate-500">{version.change_reason}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  )
}
