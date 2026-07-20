import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getCandidateProfile,
  saveCandidateProfile,
  type CandidateProfilePayload
} from '../lib/candidateProfileApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  ErrorAlert,
  FormSection,
  InfoAlert,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  SuccessAlert
} from '../components/design-system'

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

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString()
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
  const [resumes, setResumes] = useState<CandidateResume[]>([])
  const [linkedInAccounts, setLinkedInAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.allSettled([
      getCandidateProfile(),
      listResumes(true),
      listLinkedInAccounts(true)
    ])
      .then(([profileResult, resumesResult, linkedInResult]) => {
        if (!active) return

        if (profileResult.status === 'rejected') {
          throw profileResult.reason
        }

        const response = profileResult.value
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

        setResumes(resumesResult.status === 'fulfilled' ? resumesResult.value : [])
        setLinkedInAccounts(linkedInResult.status === 'fulfilled' ? linkedInResult.value : [])
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
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

  const defaultResume = resumes.find(resume => resume.active && resume.is_default) ?? resumes.find(resume => resume.active) ?? null
  const defaultLinkedInAccount = linkedInAccounts.find(account => account.active && account.default_account) ?? linkedInAccounts.find(account => account.active) ?? null

  return (
    <PageContainer className="space-y-5" size="lg">
      <PageHeader
        eyebrow={t('career.section')}
        title={t('candidateProfile.title')}
        description={t('candidateProfile.description')}
        actions={
          <InfoAlert className="px-3 py-2 text-xs">
            {t('candidateProfile.foundation')}
          </InfoAlert>
        }
      />

      {loading ? (
        <LoadingState title={t('candidateProfile.loading')} message={t('candidateProfile.loading')} />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <SectionCard className="rounded-2xl border-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('candidateProfile.defaultResume')}</div>
                  {defaultResume ? (
                    <>
                      <h3 className="mt-2 text-lg font-extrabold text-agent-primary">{defaultResume.display_name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{defaultResume.filename}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {t('candidateProfile.uploaded')} {formatDate(defaultResume.updated_at ?? defaultResume.created_at) ?? t('common.notAvailable')}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-2 text-lg font-extrabold text-agent-primary">{t('candidateProfile.noResumeUploaded')}</h3>
                      <p className="mt-1 text-sm text-slate-600">{t('candidateProfile.resumeSourceDescription')}</p>
                    </>
                  )}
                </div>
                <Link className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/resumes">
                  {defaultResume ? t('candidateProfile.manageResumes') : t('candidateProfile.uploadResume')}
                </Link>
              </div>
            </SectionCard>

            <SectionCard className="rounded-2xl border-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('candidateProfile.linkedin')}</div>
                  {defaultLinkedInAccount ? (
                    <>
                      <h3 className="mt-2 text-lg font-extrabold text-agent-primary">{defaultLinkedInAccount.display_name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{defaultLinkedInAccount.linkedin_email}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {t('candidateProfile.connectedAccount')} · {defaultLinkedInAccount.status}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-2 text-lg font-extrabold text-agent-primary">{t('candidateProfile.noLinkedinConnected')}</h3>
                      <p className="mt-1 text-sm text-slate-600">{t('candidateProfile.linkedinSourceDescription')}</p>
                    </>
                  )}
                </div>
                <Link className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/linkedin-accounts">
                  {defaultLinkedInAccount ? t('candidateProfile.manageLinkedinAccounts') : t('candidateProfile.connectLinkedin')}
                </Link>
              </div>
            </SectionCard>
          </section>

          <SectionCard>
            <form className="space-y-5" onSubmit={handleSubmit}>
            <FormSection>
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
            </FormSection>

            {message && <SuccessAlert>{message}</SuccessAlert>}
            {error && <ErrorAlert>{error}</ErrorAlert>}

            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">
              {saving ? t('candidateProfile.saving') : t('candidateProfile.save')}
            </button>
            </form>
          </SectionCard>
        </>
      )}
    </PageContainer>
  )
}
