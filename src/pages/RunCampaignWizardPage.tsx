import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCandidateProfile, type CandidateProfile } from '../lib/candidateProfileApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { listCampaignProfiles, type CampaignProfile } from '../lib/campaignProfileApi'
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

type WizardData = {
  candidateProfile: CandidateProfile | null
  resumes: CandidateResume[]
  linkedInAccounts: LinkedInAccount[]
  campaignProfiles: CampaignProfile[]
}

type StepKey = 'candidate' | 'resume' | 'linkedin' | 'campaign' | 'summary'

const steps: Array<{ key: StepKey; label: string }> = [
  { key: 'candidate', label: 'Candidate Profile' },
  { key: 'resume', label: 'Resume' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'campaign', label: 'Campaign Profile' },
  { key: 'summary', label: 'Summary' }
]

function formatDate(value?: string | null) {
  if (!value) return 'Not Available'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function selectedTone(selected: boolean) {
  return selected ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
}

export default function RunCampaignWizardPage() {
  const navigate = useNavigate()
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

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([
      getCandidateProfile(),
      listResumes(false),
      listLinkedInAccounts(false),
      listCampaignProfiles(false)
    ])
      .then(([candidateProfile, resumes, linkedInAccounts, campaignProfiles]) => {
        setData({
          candidateProfile,
          resumes,
          linkedInAccounts,
          campaignProfiles
        })
        setCandidateSelected(Boolean(candidateProfile.profile_id))
        setResumeId(resumes.find(resume => resume.active && resume.is_default)?.resume_id ?? resumes.find(resume => resume.active)?.resume_id ?? '')
        setLinkedInAccountId(linkedInAccounts.find(account => account.active && account.default_account)?.account_id ?? linkedInAccounts.find(account => account.active)?.account_id ?? '')
        setCampaignProfileId(campaignProfiles.find(profile => profile.active && profile.default_profile)?.campaign_profile_id ?? campaignProfiles.find(profile => profile.active)?.campaign_profile_id ?? '')
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const activeStep = steps[stepIndex]
  const activeResumes = data?.resumes.filter(resume => resume.active) ?? []
  const activeLinkedInAccounts = data?.linkedInAccounts.filter(account => account.active) ?? []
  const activeCampaignProfiles = data?.campaignProfiles.filter(profile => profile.active) ?? []
  const selectedResume = activeResumes.find(resume => resume.resume_id === resumeId) ?? null
  const selectedLinkedIn = activeLinkedInAccounts.find(account => account.account_id === linkedInAccountId) ?? null
  const selectedCampaign = activeCampaignProfiles.find(profile => profile.campaign_profile_id === campaignProfileId) ?? null

  const validation = useMemo(() => {
    const candidateReady = Boolean(candidateSelected && data?.candidateProfile?.profile_id)
    const resumeReady = Boolean(selectedResume)
    const linkedInReady = Boolean(selectedLinkedIn)
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
      campaignReady,
      referencesReady,
      readyToRun: candidateReady && resumeReady && linkedInReady && campaignReady && referencesReady
    }
  }, [candidateSelected, data, linkedInAccountId, resumeId, selectedCampaign, selectedLinkedIn, selectedResume])

  function canContinue() {
    if (activeStep.key === 'candidate') return validation.candidateReady
    if (activeStep.key === 'resume') return validation.resumeReady
    if (activeStep.key === 'linkedin') return validation.linkedInReady
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
      setMessage('Campaign execution created. Opening execution detail...')
      navigate(`/agent/executions/${response.execution_id}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to run campaign.')
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return <LoadingState title="Loading Run Campaign Wizard" message="Loading Candidate Profile, resumes, LinkedIn accounts, and Campaign Profiles." />
  }

  if (!data) {
    return <ErrorState title="Run Campaign Wizard unavailable" message={error ?? 'Wizard data could not be loaded.'} />
  }

  return (
    <PageContainer className="space-y-6" size="xl">
      <PageHeader
        eyebrow="Agent"
        title="Run Campaign Wizard"
        description="Follow a guided setup check before starting a campaign execution."
        actions={(
          <PageActions>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/career/campaign-profiles">
              Campaign Profiles
            </Link>
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/agent/executions">
              Executions
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
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Step {index + 1}</div>
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
                    <div className="text-lg font-extrabold text-agent-primary">{data.candidateProfile.desired_occupation || data.candidateProfile.current_occupation || 'Candidate Profile'}</div>
                    <div className="mt-1 text-sm text-slate-600">{data.candidateProfile.career_level || 'Career level not provided'}</div>
                  </div>
                  <StatusBadge tone={candidateSelected ? 'emerald' : 'slate'}>{candidateSelected ? 'Selected' : 'Available'}</StatusBadge>
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  {data.candidateProfile.preferred_countries.join(', ') || 'No preferred countries'} | {data.candidateProfile.remote_preference || 'No remote preference'}
                </div>
              </button>
            ) : (
              <EmptyState
                title="Candidate Profile missing"
                message="Create a Candidate Profile before running a campaign."
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/candidate-profile">Open Candidate Profile</Link>}
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
                        {resume.is_default && <StatusBadge tone="brand">Default</StatusBadge>}
                        <StatusBadge tone={resume.resume_id === resumeId ? 'emerald' : 'slate'}>{resume.resume_id === resumeId ? 'Selected' : resume.status}</StatusBadge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active resume"
                message="Upload or reactivate a resume before running a campaign."
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/resumes">Open Resumes</Link>}
              />
            )
          )}

          {activeStep.key === 'linkedin' && (
            activeLinkedInAccounts.length > 0 ? (
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
                        {account.default_account && <StatusBadge tone="brand">Default</StatusBadge>}
                        <StatusBadge tone={account.account_id === linkedInAccountId ? 'emerald' : 'slate'}>{account.account_id === linkedInAccountId ? 'Selected' : account.status}</StatusBadge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active LinkedIn account"
                message="Add a LinkedIn account before running a campaign."
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/linkedin-accounts">Open LinkedIn Accounts</Link>}
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
                          <div className="mt-1 text-sm text-slate-500">{profile.primary_search_intent || 'No search intent provided'}</div>
                        </div>
                        <div className="flex gap-2">
                          {profile.default_profile && <StatusBadge tone="brand">Default</StatusBadge>}
                          <StatusBadge tone={referenceMatch ? 'emerald' : 'amber'}>{referenceMatch ? 'Compatible' : 'Different references'}</StatusBadge>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="No active Campaign Profile"
                message="Create a Campaign Profile before running a campaign."
                action={<Link className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" to="/career/campaign-profiles">Open Campaign Profiles</Link>}
              />
            )
          )}

          {activeStep.key === 'summary' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryRow label="Candidate" value={data.candidateProfile?.desired_occupation || data.candidateProfile?.current_occupation || 'Not Available'} ready={validation.candidateReady} />
                <SummaryRow label="Resume" value={selectedResume?.display_name || 'Not Available'} ready={validation.resumeReady} />
                <SummaryRow label="LinkedIn" value={selectedLinkedIn?.display_name || 'Not Available'} ready={validation.linkedInReady} />
                <SummaryRow label="Campaign" value={selectedCampaign?.name || 'Not Available'} ready={validation.campaignReady && validation.referencesReady} />
              </div>
              {!validation.referencesReady && selectedCampaign && (
                <InfoAlert className="border-amber-200 bg-amber-50 text-amber-700">
                  The selected Campaign Profile does not reference the selected Candidate Profile, Resume, and LinkedIn account. Choose matching inputs before running.
                </InfoAlert>
              )}
              {validation.readyToRun && (
                <SuccessAlert>
                  All required campaign context is ready. You can run the campaign now.
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
              Previous
            </button>
            {activeStep.key === 'summary' ? (
              <button
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!validation.readyToRun || submitting}
                onClick={() => setConfirmOpen(true)}
              >
                {submitting ? 'Starting...' : 'Run Campaign'}
              </button>
            ) : (
              <button
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!canContinue()}
                onClick={nextStep}
              >
                Continue
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Validation">
          <div className="space-y-3">
            <ValidationRow label="Candidate" ready={validation.candidateReady} />
            <ValidationRow label="Resume" ready={validation.resumeReady} />
            <ValidationRow label="LinkedIn" ready={validation.linkedInReady} />
            <ValidationRow label="Campaign" ready={validation.campaignReady && validation.referencesReady} />
          </div>
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-bold text-slate-900">Selected Campaign</div>
            <div className="mt-1">{selectedCampaign?.name ?? 'Not selected'}</div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</div>
            <div>{formatDate(selectedCampaign?.updated_at ?? selectedCampaign?.created_at)}</div>
          </div>
        </SectionCard>
      </section>

      <ConfirmationDialog
        open={confirmOpen}
        title="Run Campaign"
        description={selectedCampaign ? `Start a new execution using "${selectedCampaign.name}"?` : undefined}
        confirmLabel={submitting ? 'Starting...' : 'Run Campaign'}
        cancelLabel="Cancel"
        confirmDisabled={submitting || !validation.readyToRun}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        onConfirm={() => void handleRunCampaign()}
      />
    </PageContainer>
  )
}

function ValidationRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <StatusBadge tone={ready ? 'emerald' : 'amber'}>{ready ? 'Ready' : 'Required'}</StatusBadge>
    </div>
  )
}

function SummaryRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <StatusBadge tone={ready ? 'emerald' : 'amber'}>{ready ? 'Ready' : 'Required'}</StatusBadge>
      </div>
      <div className="mt-2 font-extrabold text-slate-900">{value}</div>
    </div>
  )
}
