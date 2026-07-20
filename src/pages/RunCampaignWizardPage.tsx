import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getCandidateProfile, type CandidateProfile } from '../lib/candidateProfileApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { createCampaignProfile, listCampaignProfiles, updateCampaignProfile, type CampaignProfile } from '../lib/campaignProfileApi'
import { listDiscoverySources, type DiscoverySource } from '../lib/discoverySourceApi'
import { runCampaign } from '../lib/campaignRunApi'
import {
  ConfirmationDialog,
  EmptyState,
  ErrorAlert,
  ErrorState,
  InfoAlert,
  LoadingState,
  PageActions,
  PageContainer,
  PageHeader,
  SectionCard,
  StatusBadge,
  SuccessAlert
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'

type WizardData = {
  candidateProfile: CandidateProfile | null
  resumes: CandidateResume[]
  linkedInAccounts: LinkedInAccount[]
  campaignProfiles: CampaignProfile[]
  discoverySources: DiscoverySource[]
}

type StepKey = 'candidate' | 'resume' | 'linkedin' | 'campaign' | 'summary'

type ConfigurationForm = {
  name: string
  primarySearchIntent: string
  resumeId: string
  linkedInAccountId: string
  countries: string
  provinces: string
  remotePreference: string
  employmentTypes: string
  languages: string
  makeDefault: boolean
}

const emptyConfigurationForm: ConfigurationForm = {
  name: '',
  primarySearchIntent: '',
  resumeId: '',
  linkedInAccountId: '',
  countries: '',
  provinces: '',
  remotePreference: '',
  employmentTypes: '',
  languages: '',
  makeDefault: true
}

function formatDate(value: string | null | undefined, notAvailable: string) {
  if (!value) return notAvailable
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function selectedTone(selected: boolean) {
  return selected ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
}

function split(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function join(values: string[]) {
  return values.join(', ')
}

function firstValue(values: string[] | null | undefined) {
  return values?.find(value => value.trim())?.trim() ?? ''
}

function campaignRole(candidateProfile: CandidateProfile | null) {
  return candidateProfile?.desired_occupation || candidateProfile?.current_occupation || 'Career Campaign'
}

function campaignLocation(candidateProfile: CandidateProfile | null) {
  const province = firstValue(candidateProfile?.preferred_provinces)
  const country = firstValue(candidateProfile?.preferred_countries)
  const remotePreference = candidateProfile?.remote_preference ?? ''
  if (province) return province
  if (country) return country
  if (remotePreference.toLowerCase().includes('remote')) return 'Remote'
  return ''
}

function smartCampaignName(candidateProfile: CandidateProfile | null) {
  const role = campaignRole(candidateProfile)
  const location = campaignLocation(candidateProfile)
  return location ? `${role} - ${location}` : role
}

function smartSearchIntent(candidateProfile: CandidateProfile | null, variant: number) {
  const role = campaignRole(candidateProfile)
  const location = campaignLocation(candidateProfile)
  const level = candidateProfile?.career_level
  const locationSuffix = location ? ` in ${location}` : ''
  const experienceSuffix = level ? ` for my ${level} profile` : ' matching my profile'
  const templates = [
    `Find ${role} opportunities${locationSuffix} matching my experience.`,
    `Find ${role} positions${locationSuffix}${experienceSuffix}.`,
    `Find relevant ${role} opportunities based on my Career Profile.`
  ]
  return templates[variant % templates.length]
}

export default function RunCampaignWizardPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')
  const editingCampaignProfileId = searchParams.get('campaign_profile_id')
  const configurationMode = mode === 'create' || mode === 'edit'
  const [data, setData] = useState<WizardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [candidateSelected, setCandidateSelected] = useState(false)
  const [resumeId, setResumeId] = useState('')
  const [linkedInAccountId, setLinkedInAccountId] = useState('')
  const [campaignProfileId, setCampaignProfileId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [intentSuggestionIndex, setIntentSuggestionIndex] = useState(0)
  const [configurationForm, setConfigurationForm] = useState<ConfigurationForm>(emptyConfigurationForm)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([
      getCandidateProfile(),
      listResumes(false),
      listLinkedInAccounts(false),
      listCampaignProfiles(false),
      listDiscoverySources(false)
    ])
      .then(([candidateProfile, resumes, linkedInAccounts, campaignProfiles, discoverySources]) => {
        const defaultResumeId = resumes.find(resume => resume.active && resume.is_default)?.resume_id ?? resumes.find(resume => resume.active)?.resume_id ?? ''
        const defaultLinkedInAccountId = linkedInAccounts.find(account => account.active && account.default_account)?.account_id ?? linkedInAccounts.find(account => account.active)?.account_id ?? ''
        const selectedEditProfile = campaignProfiles.find(profile => profile.campaign_profile_id === editingCampaignProfileId) ?? null
        setData({
          candidateProfile,
          resumes,
          linkedInAccounts,
          campaignProfiles,
          discoverySources
        })
        setCandidateSelected(Boolean(candidateProfile.profile_id))
        setResumeId(defaultResumeId)
        setLinkedInAccountId(defaultLinkedInAccountId)
        setCampaignProfileId(campaignProfiles.find(profile => profile.active && profile.default_profile)?.campaign_profile_id ?? campaignProfiles.find(profile => profile.active)?.campaign_profile_id ?? '')
        setConfigurationForm(selectedEditProfile ? {
          name: selectedEditProfile.name,
          primarySearchIntent: selectedEditProfile.primary_search_intent,
          resumeId: selectedEditProfile.resume_id,
          linkedInAccountId: selectedEditProfile.linkedin_account_id,
          countries: join(selectedEditProfile.preferred_countries),
          provinces: join(selectedEditProfile.preferred_provinces),
          remotePreference: selectedEditProfile.remote_preference,
          employmentTypes: join(selectedEditProfile.employment_types),
          languages: join(selectedEditProfile.languages),
          makeDefault: selectedEditProfile.default_profile
        } : {
          ...emptyConfigurationForm,
          name: smartCampaignName(candidateProfile),
          primarySearchIntent: smartSearchIntent(candidateProfile, 0),
          resumeId: defaultResumeId,
          linkedInAccountId: defaultLinkedInAccountId,
          countries: join(candidateProfile.preferred_countries),
          provinces: join(candidateProfile.preferred_provinces),
          remotePreference: candidateProfile.remote_preference,
          employmentTypes: join(candidateProfile.preferred_employment_types),
          languages: join(candidateProfile.preferred_languages)
        })
        setIntentSuggestionIndex(0)
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [editingCampaignProfileId])

  const steps: Array<{ key: StepKey; label: string }> = [
    { key: 'candidate', label: t('campaigns.candidateProfile') },
    { key: 'resume', label: t('campaigns.resume') },
    { key: 'linkedin', label: t('campaigns.linkedin') },
    { key: 'campaign', label: t('campaigns.campaignProfile') },
    { key: 'summary', label: t('agentExecutions.summary') }
  ]
  const activeStep = steps[stepIndex]
  const activeResumes = data?.resumes.filter(resume => resume.active) ?? []
  const activeLinkedInAccounts = data?.linkedInAccounts.filter(account => account.active) ?? []
  const activeCampaignProfiles = data?.campaignProfiles.filter(profile => profile.active) ?? []
  const selectedResume = activeResumes.find(resume => resume.resume_id === resumeId) ?? null
  const selectedLinkedIn = activeLinkedInAccounts.find(account => account.account_id === linkedInAccountId) ?? null
  const selectedCampaign = activeCampaignProfiles.find(profile => profile.campaign_profile_id === campaignProfileId) ?? null
  const selectedDiscoverySources = useMemo(() => (
    data?.discoverySources.filter(source => source.active && source.linkedin_account_id === linkedInAccountId) ?? []
  ), [data?.discoverySources, linkedInAccountId])

  const validation = useMemo(() => {
    const candidateReady = Boolean(candidateSelected && data?.candidateProfile?.profile_id)
    const resumeReady = Boolean(selectedResume)
    const linkedInReady = Boolean(selectedLinkedIn)
    const discoverySourcesReady = selectedDiscoverySources.length > 0
    const campaignReady = Boolean(selectedCampaign)
    const referencesReady = Boolean(
      selectedCampaign
      && data?.candidateProfile?.profile_id
      && selectedCampaign.candidate_profile_id === data.candidateProfile.profile_id
      && selectedCampaign.resume_id === resumeId
      && selectedCampaign.linkedin_account_id === linkedInAccountId
    )

    return {
      candidateReady,
      resumeReady,
      linkedInReady,
      discoverySourcesReady,
      campaignReady,
      referencesReady,
      readyToRun: candidateReady && resumeReady && linkedInReady && discoverySourcesReady && campaignReady && referencesReady
    }
  }, [candidateSelected, data, linkedInAccountId, resumeId, selectedCampaign, selectedDiscoverySources.length, selectedLinkedIn, selectedResume])

  function canContinue() {
    if (activeStep.key === 'candidate') return validation.candidateReady
    if (activeStep.key === 'resume') return validation.resumeReady
    if (activeStep.key === 'linkedin') return validation.linkedInReady && validation.discoverySourcesReady
    if (activeStep.key === 'campaign') return validation.campaignReady
    return validation.readyToRun
  }

  function nextStep() {
    setStepIndex(index => Math.min(index + 1, steps.length - 1))
  }

  function previousStep() {
    setStepIndex(index => Math.max(index - 1, 0))
  }

  async function handleRunCampaign() {
    if (!selectedCampaign || !validation.readyToRun) return
    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await runCampaign(selectedCampaign.campaign_profile_id)
      setMessage(t('runCampaignWizard.executionCreated'))
      navigate(`/agent/executions/${response.execution_id}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('runCampaignWizard.runFailed'))
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  async function handleSaveConfiguration() {
    if (!data?.candidateProfile?.profile_id) {
      setError(t('runCampaignWizard.candidateRequiredToSave'))
      return
    }
    if (!configurationForm.name.trim()) {
      setError(t('runCampaignWizard.nameRequired'))
      return
    }
    if (!configurationForm.resumeId || !configurationForm.linkedInAccountId) {
      setError(t('runCampaignWizard.referencesRequiredToSave'))
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const payload = {
      candidate_profile_id: data.candidateProfile.profile_id,
      resume_id: configurationForm.resumeId,
      linkedin_account_id: configurationForm.linkedInAccountId,
      name: configurationForm.name,
      primary_search_intent: configurationForm.primarySearchIntent,
      preferred_countries: split(configurationForm.countries),
      preferred_provinces: split(configurationForm.provinces),
      remote_preference: configurationForm.remotePreference,
      employment_types: split(configurationForm.employmentTypes),
      languages: split(configurationForm.languages),
      make_default: configurationForm.makeDefault
    }

    try {
      if (mode === 'edit' && editingCampaignProfileId) {
        await updateCampaignProfile(editingCampaignProfileId, payload)
        setMessage(t('runCampaignWizard.updated'))
      } else {
        await createCampaignProfile(payload)
        setMessage(t('runCampaignWizard.created'))
      }
      navigate('/career/campaigns')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('runCampaignWizard.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  function regenerateSearchIntent() {
    setIntentSuggestionIndex(current => {
      const next = current + 1
      setConfigurationForm(form => ({
        ...form,
        primarySearchIntent: smartSearchIntent(data?.candidateProfile ?? null, next)
      }))
      return next
    })
  }

  if (loading) {
    return <LoadingState title={t('runCampaignWizard.loading')} message={t('runCampaignWizard.loadingDescription')} />
  }

  if (!data) {
    return <ErrorState title={t('runCampaignWizard.unavailable')} message={error ?? t('runCampaignWizard.dataLoadFailed')} />
  }

  if (configurationMode) {
    const configurationResumes = data.resumes.filter(resume => resume.active)
    const configurationLinkedInAccounts = data.linkedInAccounts.filter(account => account.active)
    const selectedSources = data.discoverySources.filter(source => source.active && source.linkedin_account_id === configurationForm.linkedInAccountId)
    const editingProfile = data.campaignProfiles.find(profile => profile.campaign_profile_id === editingCampaignProfileId) ?? null
    const inheritedResume = configurationResumes.find(resume => resume.resume_id === configurationForm.resumeId) ?? null
    const inheritedLinkedIn = configurationLinkedInAccounts.find(account => account.account_id === configurationForm.linkedInAccountId) ?? null

    return (
      <PageContainer className="space-y-6" size="xl">
        <PageHeader
          eyebrow={t('nav.career')}
          title={mode === 'edit' ? t('campaignSetup.editTitle') : t('campaignSetup.createTitle')}
          description={t('campaignSetup.description')}
          actions={(
            <PageActions>
              <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/campaigns">
                {t('campaigns.title')}
              </Link>
            </PageActions>
          )}
        />
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500" aria-label={t('campaignSetup.breadcrumbLabel')}>
          <Link className="text-brand-700 hover:text-brand-900" to="/career/campaigns">{t('nav.career')}</Link>
          <span aria-hidden="true">/</span>
          <Link className="text-brand-700 hover:text-brand-900" to="/career/campaigns">{t('campaigns.title')}</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-700">{mode === 'edit' ? t('campaignSetup.editBreadcrumb') : t('campaignSetup.createBreadcrumb')}</span>
        </nav>
        {message && <SuccessAlert>{message}</SuccessAlert>}
        {error && <ErrorAlert>{error}</ErrorAlert>}
        {mode === 'edit' && editingCampaignProfileId && !editingProfile && <ErrorAlert>{t('runCampaignWizard.profileNotFound')}</ErrorAlert>}
        <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <SectionCard title={t('campaignSetup.configuration')}>
            <InfoAlert className="mb-4 border-brand-100 bg-brand-50 text-brand-800">
              {t('campaignSetup.simpleHelp')}
            </InfoAlert>
            <form className="space-y-4" onSubmit={event => {
              event.preventDefault()
              void handleSaveConfiguration()
            }}>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">{t('campaignSetup.campaignInformation')}</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <TextField label={t('campaignProfiles.name')} value={configurationForm.name} onChange={value => setConfigurationForm(current => ({ ...current, name: value }))} required />
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">{t('campaignProfiles.searchIntent')}</span>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        value={configurationForm.primarySearchIntent}
                        onChange={event => setConfigurationForm(current => ({ ...current, primarySearchIntent: event.target.value }))}
                      />
                      <button className="shrink-0 rounded-lg border border-brand-200 px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50" type="button" onClick={regenerateSearchIntent}>
                        {t('campaignSetup.regenerate')}
                      </button>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">{t('campaignSetup.inheritedConfiguration')}</h3>
                    <p className="mt-1 text-sm text-slate-600">{t('campaignSetup.inheritedDescription')}</p>
                  </div>
                  <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" type="button" onClick={() => setAdvancedOpen(open => !open)}>
                    {advancedOpen ? t('campaignSetup.hideAdvanced') : t('campaignSetup.customizeSettings')}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InheritedItem actionLabel={t('campaignSetup.uploadResume')} actionTo="/career/resumes" icon="📄" label={t('campaigns.resume')} missing={!inheritedResume} value={inheritedResume?.display_name ?? t('campaignSetup.noResumeSelected')} />
                  <InheritedItem actionLabel={t('campaignSetup.connectLinkedin')} actionTo="/career/linkedin-accounts" icon="🔗" label={t('campaigns.linkedinAccount')} missing={!inheritedLinkedIn} value={inheritedLinkedIn?.display_name ?? t('campaignSetup.noLinkedinSelected')} />
                  <InheritedItem icon="🌎" label={t('campaigns.countries')} missing={!configurationForm.countries} value={configurationForm.countries || t('campaignSetup.noCountriesSelected')} />
                  <InheritedItem icon="🗣" label={t('campaigns.languages')} missing={!configurationForm.languages} value={configurationForm.languages || t('campaignSetup.noLanguagesSelected')} />
                  <InheritedItem icon="💼" label={t('campaigns.employmentTypes')} missing={!configurationForm.employmentTypes} value={configurationForm.employmentTypes || t('campaignSetup.noEmploymentTypesSelected')} />
                  <InheritedItem icon="🏠" label={t('campaigns.remotePreference')} missing={!configurationForm.remotePreference} value={configurationForm.remotePreference || t('campaignSetup.noRemotePreferenceSelected')} />
                  <InheritedItem actionLabel={t('campaignSetup.createDiscoverySource')} actionTo="/career/discovery-sources" icon="🔍" label={t('campaigns.discoverySources')} missing={selectedSources.length === 0} value={selectedSources.length > 0 ? t('campaigns.activeSourcesCount').replace('{count}', String(selectedSources.length)) : t('campaignSetup.noDiscoverySourcesSelected')} />
                </div>
              </div>

              {advancedOpen && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">{t('campaignSetup.advancedSettings')}</h3>
                    <p className="mt-1 text-sm text-slate-600">{t('campaignSetup.advancedDescription')}</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">{t('campaigns.resume')}</span>
                      <select className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={configurationForm.resumeId} onChange={event => setConfigurationForm(current => ({ ...current, resumeId: event.target.value }))} required>
                        <option value="">{t('campaignProfiles.selectResume')}</option>
                        {configurationResumes.map(resume => <option key={resume.resume_id} value={resume.resume_id}>{resume.display_name}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">{t('campaigns.linkedinAccount')}</span>
                      <select className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={configurationForm.linkedInAccountId} onChange={event => setConfigurationForm(current => ({ ...current, linkedInAccountId: event.target.value }))} required>
                        <option value="">{t('campaignProfiles.selectLinkedinAccount')}</option>
                        {configurationLinkedInAccounts.map(account => <option key={account.account_id} value={account.account_id}>{account.display_name}</option>)}
                      </select>
                    </label>
                    <TextField label={t('campaigns.countries')} value={configurationForm.countries} onChange={value => setConfigurationForm(current => ({ ...current, countries: value }))} placeholder={t('runCampaignWizard.countriesPlaceholder')} />
                    <TextField label={t('campaigns.provinces')} value={configurationForm.provinces} onChange={value => setConfigurationForm(current => ({ ...current, provinces: value }))} placeholder={t('runCampaignWizard.provincesPlaceholder')} />
                    <TextField label={t('campaigns.remotePreference')} value={configurationForm.remotePreference} onChange={value => setConfigurationForm(current => ({ ...current, remotePreference: value }))} placeholder={t('opportunityInbox.remote')} />
                    <TextField label={t('campaigns.employmentTypes')} value={configurationForm.employmentTypes} onChange={value => setConfigurationForm(current => ({ ...current, employmentTypes: value }))} placeholder={t('runCampaignWizard.employmentTypesPlaceholder')} />
                    <div className="lg:col-span-2">
                      <TextField label={t('campaigns.languages')} value={configurationForm.languages} onChange={value => setConfigurationForm(current => ({ ...current, languages: value }))} placeholder={t('runCampaignWizard.languagesPlaceholder')} />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input checked={configurationForm.makeDefault} type="checkbox" onChange={event => setConfigurationForm(current => ({ ...current, makeDefault: event.target.checked }))} />
                  <span title={t('campaignSetup.makeDefaultHelp')}>{t('campaignSetup.makeDefault')}</span>
                </label>
                <div className="flex gap-2">
                  <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/campaigns">{t('linkedinAccounts.cancel')}</Link>
                  <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting || (mode === 'edit' && !editingProfile)} type="submit">
                    {submitting ? t('campaignProfiles.saving') : mode === 'edit' ? t('runCampaignWizard.saveCampaign') : t('runCampaignWizard.createCampaign')}
                  </button>
                </div>
              </div>
            </form>
          </SectionCard>
          <SectionCard title={t('campaignSetup.setupReadiness')}>
            <div className="space-y-3">
              <ValidationRow label={t('campaigns.candidateProfile')} ready={Boolean(data.candidateProfile?.profile_id)} />
              <ValidationRow label={t('campaigns.resume')} ready={Boolean(configurationForm.resumeId)} />
              <ValidationRow label="LinkedIn" ready={Boolean(configurationForm.linkedInAccountId)} />
              <ValidationRow label={t('campaigns.discoverySources')} ready={selectedSources.length > 0} />
            </div>
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t('runCampaignWizard.activeDiscoverySources')}</div>
              <div className="mt-1 text-2xl font-extrabold text-agent-primary">{selectedSources.length}</div>
              {selectedSources.length === 0 && (
                <Link className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700" to="/career/discovery-sources">
                  {t('campaigns.openDiscoverySources')}
                </Link>
              )}
            </div>
          </SectionCard>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6" size="xl">
      <PageHeader
        eyebrow={t('nav.agent')}
        title={t('header.runCampaignWizard.title')}
        description={t('header.runCampaignWizard.subtitle')}
        actions={(
          <PageActions>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/campaigns">
              {t('campaigns.title')}
            </Link>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/agent/executions">
              {t('campaigns.executions')}
            </Link>
          </PageActions>
        )}
      />

      {message && <SuccessAlert>{message}</SuccessAlert>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <SectionCard>
        <div className="grid gap-2 md:grid-cols-5">
          {steps.map((step, index) => {
            const active = index === stepIndex
            const complete = index < stepIndex
            return (
              <button
                key={step.key}
                className={`rounded-xl border px-3 py-3 text-left transition ${active ? 'border-brand-300 bg-brand-50' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                type="button"
                onClick={() => setStepIndex(index)}
              >
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t('runCampaignWizard.step').replace('{number}', String(index + 1))}</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">{step.label}</div>
              </button>
            )
          })}
        </div>
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <SectionCard title={activeStep.label}>
          {activeStep.key === 'candidate' && (
            data.candidateProfile?.profile_id ? (
              <button
                className={`w-full rounded-xl border p-4 text-left transition ${selectedTone(candidateSelected)}`}
                type="button"
                onClick={() => setCandidateSelected(true)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-extrabold text-agent-primary">{data.candidateProfile.desired_occupation || data.candidateProfile.current_occupation || t('campaigns.candidateProfile')}</div>
                    <div className="mt-1 text-sm text-slate-600">{data.candidateProfile.career_level || t('runCampaignWizard.careerLevelMissing')}</div>
                  </div>
                  <StatusBadge tone={candidateSelected ? 'emerald' : 'slate'}>{candidateSelected ? t('runCampaignWizard.selected') : t('runCampaignWizard.available')}</StatusBadge>
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  {data.candidateProfile.preferred_countries.join(', ') || t('runCampaignWizard.noPreferredCountries')} | {data.candidateProfile.remote_preference || t('runCampaignWizard.noRemotePreference')}
                </div>
              </button>
            ) : (
              <EmptyState
                title={t('runCampaignWizard.candidateMissing')}
                message={t('runCampaignWizard.candidateMissingDescription')}
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/candidate-profile">{t('runCampaignWizard.openCandidateProfile')}</Link>}
              />
            )
          )}

          {activeStep.key === 'resume' && (
            activeResumes.length > 0 ? (
              <div className="space-y-3">
                {activeResumes.map(resume => (
                  <button
                    key={resume.resume_id}
                    className={`w-full rounded-xl border p-4 text-left transition ${selectedTone(resume.resume_id === resumeId)}`}
                    type="button"
                    onClick={() => setResumeId(resume.resume_id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-agent-primary">{resume.display_name}</div>
                        <div className="mt-1 text-sm text-slate-500">{resume.filename}</div>
                      </div>
                      <div className="flex gap-2">
                        {resume.is_default && <StatusBadge tone="brand">{t('campaigns.default')}</StatusBadge>}
                        <StatusBadge tone={resume.resume_id === resumeId ? 'emerald' : 'slate'}>{resume.resume_id === resumeId ? t('runCampaignWizard.selected') : resume.status}</StatusBadge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('runCampaignWizard.noActiveResume')}
                message={t('runCampaignWizard.noActiveResumeDescription')}
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/resumes">{t('runCampaignWizard.openResumes')}</Link>}
              />
            )
          )}

          {activeStep.key === 'linkedin' && (
            activeLinkedInAccounts.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {activeLinkedInAccounts.map(account => (
                    <button
                      key={account.account_id}
                      className={`w-full rounded-xl border p-4 text-left transition ${selectedTone(account.account_id === linkedInAccountId)}`}
                      type="button"
                      onClick={() => setLinkedInAccountId(account.account_id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-agent-primary">{account.display_name}</div>
                          <div className="mt-1 text-sm text-slate-500">{account.linkedin_email}</div>
                        </div>
                        <div className="flex gap-2">
                          {account.default_account && <StatusBadge tone="brand">{t('campaigns.default')}</StatusBadge>}
                          <StatusBadge tone={account.account_id === linkedInAccountId ? 'emerald' : 'slate'}>{account.account_id === linkedInAccountId ? t('runCampaignWizard.selected') : account.status}</StatusBadge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <DiscoverySourcesCheck sources={selectedDiscoverySources} selectedLinkedIn={selectedLinkedIn} />
              </div>
            ) : (
              <EmptyState
                title={t('runCampaignWizard.noActiveLinkedin')}
                message={t('runCampaignWizard.noActiveLinkedinDescription')}
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/linkedin-accounts">{t('runCampaignWizard.openLinkedinAccounts')}</Link>}
              />
            )
          )}

          {activeStep.key === 'campaign' && (
            activeCampaignProfiles.length > 0 ? (
              <div className="space-y-3">
                {activeCampaignProfiles.map(profile => {
                  const referenceMatch = data.candidateProfile?.profile_id === profile.candidate_profile_id
                    && profile.resume_id === resumeId
                    && profile.linkedin_account_id === linkedInAccountId
                  return (
                    <button
                      key={profile.campaign_profile_id}
                      className={`w-full rounded-xl border p-4 text-left transition ${selectedTone(profile.campaign_profile_id === campaignProfileId)}`}
                      type="button"
                      onClick={() => setCampaignProfileId(profile.campaign_profile_id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-agent-primary">{profile.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{profile.primary_search_intent || t('campaigns.noSearchIntent')}</div>
                        </div>
                        <div className="flex gap-2">
                          {profile.default_profile && <StatusBadge tone="brand">{t('campaigns.default')}</StatusBadge>}
                          <StatusBadge tone={referenceMatch ? 'emerald' : 'amber'}>{referenceMatch ? t('opportunityInbox.compatible') : t('runCampaignWizard.differentReferences')}</StatusBadge>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title={t('runCampaignWizard.noActiveCampaignProfile')}
                message={t('runCampaignWizard.noActiveCampaignProfileDescription')}
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/campaigns/setup?mode=create">{t('campaigns.createCampaign')}</Link>}
              />
            )
          )}

          {activeStep.key === 'summary' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryRow label={t('campaigns.candidate')} value={data.candidateProfile?.desired_occupation || data.candidateProfile?.current_occupation || t('common.notAvailable')} ready={validation.candidateReady} />
                <SummaryRow label={t('campaigns.resume')} value={selectedResume?.display_name || t('common.notAvailable')} ready={validation.resumeReady} />
                <SummaryRow label={t('campaigns.linkedin')} value={selectedLinkedIn?.display_name || t('common.notAvailable')} ready={validation.linkedInReady} />
                <SummaryRow label={t('campaigns.discoverySources')} value={t('campaigns.activeSourcesCount').replace('{count}', String(selectedDiscoverySources.length))} ready={validation.discoverySourcesReady} />
                <SummaryRow label={t('campaigns.title')} value={selectedCampaign?.name || t('common.notAvailable')} ready={validation.campaignReady && validation.referencesReady} />
              </div>
              {!validation.referencesReady && selectedCampaign && (
                <InfoAlert className="border-amber-200 bg-amber-50 text-amber-700">
                  {t('runCampaignWizard.referenceMismatch')}
                </InfoAlert>
              )}
              {validation.readyToRun && (
                <SuccessAlert>
                  {t('runCampaignWizard.readyToRun')}
                </SuccessAlert>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={stepIndex === 0}
              onClick={previousStep}
            >
              {t('agentExecutions.previous')}
            </button>
            {activeStep.key === 'summary' ? (
              <button
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!validation.readyToRun || submitting}
                onClick={() => setConfirmOpen(true)}
              >
                {submitting ? t('campaignRun.starting') : t('commandPalette.runCampaign')}
              </button>
            ) : (
              <button
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!canContinue()}
                onClick={nextStep}
              >
                {t('runCampaignWizard.continue')}
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard title={t('runCampaignWizard.validation')}>
          <div className="space-y-3">
            <ValidationRow label={t('campaigns.candidate')} ready={validation.candidateReady} />
            <ValidationRow label={t('campaigns.resume')} ready={validation.resumeReady} />
            <ValidationRow label="LinkedIn" ready={validation.linkedInReady} />
            <ValidationRow label={t('campaigns.discoverySources')} ready={validation.discoverySourcesReady} />
            <ValidationRow label={t('campaigns.title')} ready={validation.campaignReady && validation.referencesReady} />
          </div>
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-bold text-slate-900">{t('runCampaignWizard.selectedCampaign')}</div>
            <div className="mt-1">{selectedCampaign?.name ?? t('runCampaignWizard.notSelected')}</div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('campaigns.lastUpdated')}</div>
            <div>{formatDate(selectedCampaign?.updated_at ?? selectedCampaign?.created_at, t('common.notAvailable'))}</div>
          </div>
        </SectionCard>
      </section>

      <ConfirmationDialog
        open={confirmOpen}
        title={t('commandPalette.runCampaign')}
        description={selectedCampaign ? `Start a new execution using "${selectedCampaign.name}"?` : undefined}
        confirmLabel={submitting ? t('campaignRun.starting') : t('commandPalette.runCampaign')}
        cancelLabel={t('linkedinAccounts.cancel')}
        confirmDisabled={submitting || !validation.readyToRun}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => void handleRunCampaign()}
      />
    </PageContainer>
  )
}

function DiscoverySourcesCheck({
  sources,
  selectedLinkedIn
}: {
  sources: DiscoverySource[]
  selectedLinkedIn: LinkedInAccount | null
}) {
  const { t } = useLanguage()
  if (!selectedLinkedIn) {
    return (
      <InfoAlert className="border-amber-200 bg-amber-50 text-amber-700">
        {t('runCampaignWizard.selectLinkedinForSources')}
      </InfoAlert>
    )
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-extrabold text-amber-900">{t('runCampaignWizard.noActiveDiscoverySourcesFound')}</div>
            <p className="mt-1 text-sm text-amber-800">
              {t('runCampaignWizard.noActiveDiscoverySourcesDescription')}
            </p>
          </div>
          <Link className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700" to="/career/discovery-sources">
            {t('campaigns.openDiscoverySources')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-extrabold text-emerald-950">{t('campaigns.discoverySources')}</div>
          <p className="mt-1 text-sm text-emerald-800">{t('runCampaignWizard.activeSources').replace('{count}', String(sources.length))}</p>
        </div>
        <StatusBadge tone="emerald">{t('runCampaignWizard.ready')}</StatusBadge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {sources.map(source => (
          <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-slate-800" key={source.source_id}>
            <span className="mr-2 text-emerald-600">✓</span>
            {source.name}
          </div>
        ))}
      </div>
    </div>
  )
}

function ValidationRow({ label, ready }: { label: string; ready: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <StatusBadge tone={ready ? 'emerald' : 'amber'}>{ready ? t('runCampaignWizard.ready') : t('runCampaignWizard.required')}</StatusBadge>
    </div>
  )
}

function SummaryRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <StatusBadge tone={ready ? 'emerald' : 'amber'}>{ready ? t('runCampaignWizard.ready') : t('runCampaignWizard.required')}</StatusBadge>
      </div>
      <div className="mt-2 font-extrabold text-slate-900">{value}</div>
    </div>
  )
}

function InheritedItem({
  icon,
  label,
  value,
  missing = false,
  actionLabel,
  actionTo
}: {
  icon: string
  label: string
  value: string
  missing?: boolean
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${missing ? 'border-amber-100 bg-amber-50' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true">{icon}</span>
        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      </div>
      <div className={`mt-1 truncate text-sm font-extrabold ${missing ? 'text-amber-800' : 'text-slate-900'}`}>{value}</div>
      {missing && actionLabel && actionTo && (
        <Link className="mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}
