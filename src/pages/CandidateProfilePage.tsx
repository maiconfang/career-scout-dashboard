import { FormEvent, useEffect, useState } from 'react'
import {
  getCandidateProfile,
  saveCandidateProfile,
  type CandidateProfilePayload
} from '../lib/candidateProfileApi'
import { useLanguage } from '../i18n/LanguageProvider'

const emptyProfile: CandidateProfilePayload = {
  current_occupation: '',
  desired_occupation: '',
  career_level: '',
  years_of_experience: null,
  preferred_countries: [],
  preferred_provinces: [],
  preferred_employment_types: [],
  remote_preference: '',
  salary_expectation: '',
  preferred_languages: [],
  current_resume: '',
  linkedin_url: ''
}

function join(values: string[]) {
  return values.join(', ')
}

function split(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export default function CandidateProfilePage() {
  const { t } = useLanguage()
  const [profile, setProfile] = useState<CandidateProfilePayload>(emptyProfile)
  const [countries, setCountries] = useState('')
  const [provinces, setProvinces] = useState('')
  const [employmentTypes, setEmploymentTypes] = useState('')
  const [languages, setLanguages] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getCandidateProfile()
      .then(response => {
        setProfile({
          current_occupation: response.current_occupation,
          desired_occupation: response.desired_occupation,
          career_level: response.career_level,
          years_of_experience: response.years_of_experience,
          preferred_countries: response.preferred_countries,
          preferred_provinces: response.preferred_provinces,
          preferred_employment_types: response.preferred_employment_types,
          remote_preference: response.remote_preference,
          salary_expectation: response.salary_expectation,
          preferred_languages: response.preferred_languages,
          current_resume: response.current_resume,
          linkedin_url: response.linkedin_url
        })
        setCountries(join(response.preferred_countries))
        setProvinces(join(response.preferred_provinces))
        setEmploymentTypes(join(response.preferred_employment_types))
        setLanguages(join(response.preferred_languages))
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const payload = {
        ...profile,
        preferred_countries: split(countries),
        preferred_provinces: split(provinces),
        preferred_employment_types: split(employmentTypes),
        preferred_languages: split(languages)
      }
      const saved = await saveCandidateProfile(payload)
      setProfile({
        current_occupation: saved.current_occupation,
        desired_occupation: saved.desired_occupation,
        career_level: saved.career_level,
        years_of_experience: saved.years_of_experience,
        preferred_countries: saved.preferred_countries,
        preferred_provinces: saved.preferred_provinces,
        preferred_employment_types: saved.preferred_employment_types,
        remote_preference: saved.remote_preference,
        salary_expectation: saved.salary_expectation,
        preferred_languages: saved.preferred_languages,
        current_resume: saved.current_resume,
        linkedin_url: saved.linkedin_url
      })
      setMessage(t('candidateProfile.saved'))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('candidateProfile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  function update(field: keyof CandidateProfilePayload, value: string | number | null) {
    setProfile(current => ({ ...current, [field]: value }))
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('career.section')}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('candidateProfile.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('candidateProfile.description')}</p>
          </div>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
            {t('candidateProfile.foundation')}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        {loading && <div className="text-sm text-slate-500">{t('candidateProfile.loading')}</div>}
        {!loading && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.currentOccupation')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.current_occupation} onChange={event => update('current_occupation', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.desiredOccupation')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.desired_occupation} onChange={event => update('desired_occupation', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.careerLevel')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.career_level} onChange={event => update('career_level', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.yearsOfExperience')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" min="0" step="0.5" type="number" value={profile.years_of_experience ?? ''} onChange={event => update('years_of_experience', event.target.value === '' ? null : Number(event.target.value))} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.preferredCountries')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={countries} onChange={event => setCountries(event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.preferredProvinces')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={provinces} onChange={event => setProvinces(event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.preferredEmploymentTypes')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={employmentTypes} onChange={event => setEmploymentTypes(event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.remotePreference')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.remote_preference} onChange={event => update('remote_preference', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.salaryExpectation')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.salary_expectation} onChange={event => update('salary_expectation', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.preferredLanguages')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={languages} onChange={event => setLanguages(event.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.linkedinUrl')}</span>
                <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.linkedin_url} onChange={event => update('linkedin_url', event.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">{t('candidateProfile.currentResume')}</span>
                <textarea className="mt-2 min-h-48 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={profile.current_resume} onChange={event => update('current_resume', event.target.value)} />
              </label>
            </div>

            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">
              {saving ? t('candidateProfile.saving') : t('candidateProfile.save')}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
