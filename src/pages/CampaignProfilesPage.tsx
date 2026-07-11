import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  archiveCampaignProfile,
  createCampaignProfile,
  listCampaignProfiles,
  setDefaultCampaignProfile,
  type CampaignProfile
} from '../lib/campaignProfileApi'
import { getCandidateProfile, type CandidateProfile } from '../lib/candidateProfileApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { useLanguage } from '../i18n/LanguageProvider'

function split(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export default function CampaignProfilesPage() {
  const { t } = useLanguage()
  const [profiles, setProfiles] = useState<CampaignProfile[]>([])
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null)
  const [resumes, setResumes] = useState<CandidateResume[]>([])
  const [linkedinAccounts, setLinkedinAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [name, setName] = useState('')
  const [primarySearchIntent, setPrimarySearchIntent] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [linkedinAccountId, setLinkedinAccountId] = useState('')
  const [countries, setCountries] = useState('')
  const [provinces, setProvinces] = useState('')
  const [remotePreference, setRemotePreference] = useState('')
  const [employmentTypes, setEmploymentTypes] = useState('')
  const [languages, setLanguages] = useState('')
  const [makeDefault, setMakeDefault] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([
      listCampaignProfiles(includeArchived),
      getCandidateProfile(),
      listResumes(false),
      listLinkedInAccounts(false)
    ])
      .then(([campaignProfiles, candidate, resumeItems, accountItems]) => {
        setProfiles(campaignProfiles)
        setCandidateProfile(candidate)
        setResumes(resumeItems)
        setLinkedinAccounts(accountItems)
        if (!resumeId) {
          setResumeId(resumeItems.find(item => item.is_default)?.resume_id ?? resumeItems[0]?.resume_id ?? '')
        }
        if (!linkedinAccountId) {
          setLinkedinAccountId(accountItems.find(item => item.default_account)?.account_id ?? accountItems[0]?.account_id ?? '')
        }
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [includeArchived])

  const activeCount = useMemo(() => profiles.filter(profile => profile.active).length, [profiles])
  const defaultProfile = profiles.find(profile => profile.default_profile && profile.active)
  const canCreate = Boolean(candidateProfile?.profile_id && resumeId && linkedinAccountId)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!candidateProfile?.profile_id) {
      setError(t('campaignProfiles.candidateProfileRequired'))
      return
    }
    if (!resumeId || !linkedinAccountId) {
      setError(t('campaignProfiles.referencesRequired'))
      return
    }

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      await createCampaignProfile({
        candidate_profile_id: candidateProfile.profile_id,
        resume_id: resumeId,
        linkedin_account_id: linkedinAccountId,
        name,
        primary_search_intent: primarySearchIntent,
        preferred_countries: split(countries),
        preferred_provinces: split(provinces),
        remote_preference: remotePreference,
        employment_types: split(employmentTypes),
        languages: split(languages),
        make_default: makeDefault
      })
      setName('')
      setPrimarySearchIntent('')
      setCountries('')
      setProvinces('')
      setRemotePreference('')
      setEmploymentTypes('')
      setLanguages('')
      setMakeDefault(true)
      setMessage(t('campaignProfiles.created'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('campaignProfiles.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDefault(campaignProfileId: string) {
    setMessage(null)
    setError(null)
    try {
      await setDefaultCampaignProfile(campaignProfileId)
      setMessage(t('campaignProfiles.defaultUpdated'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('campaignProfiles.defaultFailed'))
    }
  }

  async function handleArchive(campaignProfileId: string) {
    setMessage(null)
    setError(null)
    try {
      await archiveCampaignProfile(campaignProfileId)
      setMessage(t('campaignProfiles.archived'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('campaignProfiles.archiveFailed'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('career.section')}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('campaignProfiles.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('campaignProfiles.description')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-brand-700">{t('campaignProfiles.active')}</div>
              <div className="text-xl font-extrabold text-agent-primary">{activeCount}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">{t('campaignProfiles.default')}</div>
              <div className="max-w-44 truncate text-sm font-bold text-agent-primary">{defaultProfile?.name ?? '-'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.name')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={name} onChange={event => setName(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.searchIntent')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={primarySearchIntent} onChange={event => setPrimarySearchIntent(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.resume')}</span>
              <select className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={resumeId} onChange={event => setResumeId(event.target.value)}>
                <option value="">{t('campaignProfiles.selectResume')}</option>
                {resumes.map(resume => <option key={resume.resume_id} value={resume.resume_id}>{resume.display_name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.linkedinAccount')}</span>
              <select className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={linkedinAccountId} onChange={event => setLinkedinAccountId(event.target.value)}>
                <option value="">{t('campaignProfiles.selectLinkedinAccount')}</option>
                {linkedinAccounts.map(account => <option key={account.account_id} value={account.account_id}>{account.display_name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.preferredCountries')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={countries} onChange={event => setCountries(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.preferredProvinces')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={provinces} onChange={event => setProvinces(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.remotePreference')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={remotePreference} onChange={event => setRemotePreference(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.employmentTypes')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={employmentTypes} onChange={event => setEmploymentTypes(event.target.value)} />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.languages')}</span>
              <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={languages} onChange={event => setLanguages(event.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input checked={makeDefault} type="checkbox" onChange={event => setMakeDefault(event.target.checked)} />
              {t('campaignProfiles.makeDefault')}
            </label>
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving || !canCreate} type="submit">
              {saving ? t('campaignProfiles.saving') : t('campaignProfiles.create')}
            </button>
          </div>
          {!canCreate && !loading && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{t('campaignProfiles.missingReferences')}</div>}
        </form>
        <div className="mt-4 flex items-center gap-2">
          <input id="include-archived-campaign-profiles" checked={includeArchived} type="checkbox" onChange={event => setIncludeArchived(event.target.checked)} />
          <label className="text-sm font-medium text-slate-600" htmlFor="include-archived-campaign-profiles">{t('campaignProfiles.includeArchived')}</label>
        </div>
        {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-extrabold text-agent-primary">{t('campaignProfiles.library')}</h3>
          <p className="text-sm text-slate-500">{t('campaignProfiles.libraryDescription')}</p>
        </div>

        {loading && <div className="p-5 text-sm text-slate-500">{t('campaignProfiles.loading')}</div>}
        {!loading && profiles.length === 0 && <div className="p-5 text-sm text-slate-500">{t('campaignProfiles.empty')}</div>}

        {!loading && profiles.length > 0 && (
          <div className="divide-y divide-slate-100">
            {profiles.map(profile => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1.2fr_auto]" key={profile.campaign_profile_id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-extrabold text-agent-primary">{profile.name}</h4>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${profile.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{profile.status}</span>
                    {profile.default_profile && <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{t('campaignProfiles.default')}</span>}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{profile.primary_search_intent || '-'}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{profile.remote_preference || '-'}</span>
                    <span>|</span>
                    <span>{profile.employment_types.join(', ') || '-'}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div><span className="font-semibold">{t('campaignProfiles.countries')}:</span> {profile.preferred_countries.join(', ') || '-'}</div>
                  <div className="mt-1"><span className="font-semibold">{t('campaignProfiles.languages')}:</span> {profile.languages.join(', ') || '-'}</div>
                  <div className="mt-1"><span className="font-semibold">{t('campaignProfiles.updatedAt')}:</span> {formatDate(profile.updated_at)}</div>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  {profile.active && !profile.default_profile && (
                    <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" type="button" onClick={() => void handleDefault(profile.campaign_profile_id)}>
                      {t('campaignProfiles.setDefault')}
                    </button>
                  )}
                  {profile.active && (
                    <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => void handleArchive(profile.campaign_profile_id)}>
                      {t('campaignProfiles.archive')}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
