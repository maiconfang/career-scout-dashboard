import { useEffect, useMemo, useState } from 'react'
import {
  EmptyState,
  ErrorState,
  InfoCard,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import { CampaignRunAction } from '../components/CampaignRunAction'
import { listCampaignProfiles, type CampaignProfile } from '../lib/campaignProfileApi'
import { getCandidateProfile, type CandidateProfile } from '../lib/candidateProfileApi'
import { listLinkedInAccounts, type LinkedInAccount } from '../lib/linkedinAccountApi'
import { listResumes, type CandidateResume } from '../lib/resumeApi'
import {
  validateCampaignContext,
  type CampaignContextValidationResult
} from '../lib/campaignContextInspectorApi'

type InspectorData = {
  profiles: CampaignProfile[]
  candidateProfile: CandidateProfile | null
  resumes: CandidateResume[]
  linkedinAccounts: LinkedInAccount[]
}

type DetailItem = {
  label: string
  value: unknown
}

const emptyData: InspectorData = {
  profiles: [],
  candidateProfile: null,
  resumes: [],
  linkedinAccounts: []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item)).filter(Boolean)
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return '-'
  if (isRecord(value)) return JSON.stringify(value, null, 2)
  return String(value)
}

function scoreTone(score: number): 'emerald' | 'amber' | 'red' {
  if (score >= 90) return 'emerald'
  if (score >= 60) return 'amber'
  return 'red'
}

function readinessTone(ready: boolean): 'emerald' | 'amber' {
  return ready ? 'emerald' : 'amber'
}

function pickRecord(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) return null
  for (const key of keys) {
    const value = asRecord(source[key])
    if (value) return value
  }
  return null
}

function findPlannerInput(validation: CampaignContextValidationResult | null) {
  if (!validation) return null
  const shadow = pickRecord(validation, ['planner_shadow_analysis', 'planner_shadow'])
  return (
    pickRecord(shadow, ['campaign_context_planner_input', 'planner_input', 'campaign_context_input'])
    ?? pickRecord(validation, ['campaign_context_planner_input', 'planner_input'])
  )
}

function findPlannerComparison(validation: CampaignContextValidationResult | null) {
  if (!validation) return null
  const comparison = pickRecord(validation, ['planner_comparison', 'planner_comparison_analysis'])
  if (comparison) return comparison
  const shadow = pickRecord(validation, ['planner_shadow_analysis', 'planner_shadow'])
  if (shadow && ('equivalence_percentage' in shadow || 'migration_readiness' in shadow)) return shadow
  return null
}

function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map(item => (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2" key={item.label}>
          <dt className="text-xs font-bold uppercase text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words font-semibold text-slate-900 whitespace-pre-wrap">{displayValue(item.value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function TextList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <div className="text-sm text-slate-500">{emptyLabel}</div>
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700" key={`${item}-${index}`}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  )
}

function PlannerInputSection({ input }: { input: Record<string, unknown> | null }) {
  if (!input) {
    return <EmptyState title="Planner Shadow unavailable" message="The validation response did not include a planner shadow input block." />
  }

  return (
    <DetailList
      items={[
        { label: 'Search Intent', value: input.search_intent },
        { label: 'Search Keywords', value: asStringList(input.search_keywords) },
        { label: 'Countries', value: asStringList(input.countries) },
        { label: 'Provinces', value: asStringList(input.provinces) },
        { label: 'Employment Types', value: asStringList(input.employment_types) },
        { label: 'Remote Preference', value: input.remote_preference },
        { label: 'Career Level', value: input.career_level },
        { label: 'Search Objectives', value: input.search_objectives }
      ]}
    />
  )
}

function PlannerComparisonSection({ comparison }: { comparison: Record<string, unknown> | null }) {
  if (!comparison) {
    return <EmptyState title="Planner Comparison unavailable" message="The validation response did not include a planner comparison block." />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Equivalence" value={`${comparison.equivalence_percentage ?? 0}%`} tone={scoreTone(Number(comparison.equivalence_percentage ?? 0))} />
        <StatCard label="Migration Readiness" value={`${comparison.migration_readiness ?? 0}%`} tone={scoreTone(Number(comparison.migration_readiness ?? 0))} />
      </div>
      <DetailList
        items={[
          { label: 'Missing Information', value: asStringList(comparison.missing_information) },
          { label: 'Extra Information', value: asStringList(comparison.extra_information) },
          { label: 'Differences', value: comparison.differences }
        ]}
      />
    </div>
  )
}

export default function CampaignInspectorPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<InspectorData>(emptyData)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [validation, setValidation] = useState<CampaignContextValidationResult | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingValidation, setLoadingValidation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingData(true)
    setError(null)

    Promise.all([
      listCampaignProfiles(false),
      getCandidateProfile().catch(() => null),
      listResumes(false),
      listLinkedInAccounts(false)
    ])
      .then(([profiles, candidateProfile, resumes, linkedinAccounts]) => {
        if (cancelled) return
        setData({ profiles, candidateProfile, resumes, linkedinAccounts })
        const defaultProfile = profiles.find(profile => profile.default_profile) ?? profiles[0]
        setSelectedProfileId(defaultProfile?.campaign_profile_id ?? '')
      })
      .catch(requestError => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load Campaign Inspector data.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedProfileId) {
      setValidation(null)
      return
    }

    let cancelled = false
    setLoadingValidation(true)
    setError(null)

    validateCampaignContext(selectedProfileId)
      .then(result => {
        if (!cancelled) setValidation(result)
      })
      .catch(requestError => {
        if (!cancelled) {
          setValidation(null)
          setError(requestError instanceof Error ? requestError.message : 'Unable to validate Campaign Context.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingValidation(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedProfileId])

  const selectedProfile = useMemo(
    () => data.profiles.find(profile => profile.campaign_profile_id === selectedProfileId) ?? null,
    [data.profiles, selectedProfileId]
  )
  const selectedResume = useMemo(
    () => data.resumes.find(resume => resume.resume_id === selectedProfile?.resume_id) ?? null,
    [data.resumes, selectedProfile]
  )
  const selectedLinkedIn = useMemo(
    () => data.linkedinAccounts.find(account => account.account_id === selectedProfile?.linkedin_account_id) ?? null,
    [data.linkedinAccounts, selectedProfile]
  )
  const plannerInput = useMemo(() => findPlannerInput(validation), [validation])
  const plannerComparison = useMemo(() => findPlannerComparison(validation), [validation])

  if (loadingData) {
    return <LoadingState title={t('campaignInspector.loading')} message={t('campaignInspector.loadingDescription')} />
  }

  return (
    <PageContainer className="space-y-5" size="xl">
      <PageHeader
        eyebrow={t('campaignInspector.section')}
        title={t('campaignInspector.title')}
        description={t('campaignInspector.description')}
        actions={(
          <>
            {selectedProfile && (
              <CampaignRunAction
                campaignProfileId={selectedProfile.campaign_profile_id}
                campaignProfileName={selectedProfile.name}
                disabled={!selectedProfile.active}
              />
            )}
            <StatusBadge tone="blue">{t('campaignInspector.observationalOnly')}</StatusBadge>
          </>
        )}
      />

      {error && <ErrorState title={t('campaignInspector.errorTitle')} message={error} />}

      <SectionCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{t('campaignInspector.selectProfile')}</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              onChange={event => setSelectedProfileId(event.target.value)}
              value={selectedProfileId}
            >
              <option value="">{t('campaignInspector.selectPlaceholder')}</option>
              {data.profiles.map(profile => (
                <option key={profile.campaign_profile_id} value={profile.campaign_profile_id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          {selectedProfile && (
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={selectedProfile.active ? 'emerald' : 'slate'}>{selectedProfile.status}</StatusBadge>
              {selectedProfile.default_profile && <StatusBadge tone="brand">{t('campaignProfiles.default')}</StatusBadge>}
            </div>
          )}
        </div>
      </SectionCard>

      {data.profiles.length === 0 && <EmptyState title={t('campaignInspector.emptyTitle')} message={t('campaignInspector.emptyDescription')} />}

      {selectedProfile && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Validation Score" value={validation?.validation_score ?? '-'} tone={scoreTone(validation?.validation_score ?? 0)} />
            <StatCard label="Ready" value={validation?.ready ? 'Yes' : 'No'} tone={readinessTone(Boolean(validation?.ready))} />
            <StatCard label="Missing Dependencies" value={validation?.missing_dependencies?.length ?? 0} tone={(validation?.missing_dependencies?.length ?? 0) > 0 ? 'amber' : 'emerald'} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <InfoCard label="Campaign Context" title="Campaign Profile">
              <DetailList
                items={[
                  { label: 'Name', value: selectedProfile.name },
                  { label: 'Primary Search Intent', value: selectedProfile.primary_search_intent },
                  { label: 'Countries', value: selectedProfile.preferred_countries },
                  { label: 'Provinces', value: selectedProfile.preferred_provinces },
                  { label: 'Remote Preference', value: selectedProfile.remote_preference },
                  { label: 'Employment Types', value: selectedProfile.employment_types },
                  { label: 'Languages', value: selectedProfile.languages }
                ]}
              />
            </InfoCard>

            <InfoCard label="Campaign Context" title="Candidate Profile">
              {data.candidateProfile ? (
                <DetailList
                  items={[
                    { label: 'Current Occupation', value: data.candidateProfile.current_occupation },
                    { label: 'Desired Occupation', value: data.candidateProfile.desired_occupation },
                    { label: 'Career Level', value: data.candidateProfile.career_level },
                    { label: 'Countries', value: data.candidateProfile.preferred_countries },
                    { label: 'Provinces', value: data.candidateProfile.preferred_provinces },
                    { label: 'Employment Types', value: data.candidateProfile.preferred_employment_types },
                    { label: 'Remote Preference', value: data.candidateProfile.remote_preference }
                  ]}
                />
              ) : (
                <EmptyState title="Candidate Profile unavailable" message="The current user does not have a Candidate Profile response available." />
              )}
            </InfoCard>

            <InfoCard label="Campaign Context" title="Resume">
              {selectedResume ? (
                <DetailList
                  items={[
                    { label: 'Display Name', value: selectedResume.display_name },
                    { label: 'Filename', value: selectedResume.filename },
                    { label: 'Version', value: selectedResume.version },
                    { label: 'Status', value: selectedResume.status },
                    { label: 'Default', value: selectedResume.is_default }
                  ]}
                />
              ) : (
                <EmptyState title="Resume unavailable" message="The selected Campaign Profile resume was not returned by the API." />
              )}
            </InfoCard>

            <InfoCard label="Campaign Context" title="LinkedIn Account">
              {selectedLinkedIn ? (
                <DetailList
                  items={[
                    { label: 'Display Name', value: selectedLinkedIn.display_name },
                    { label: 'E-mail', value: selectedLinkedIn.linkedin_email },
                    { label: 'Status', value: selectedLinkedIn.status },
                    { label: 'Default', value: selectedLinkedIn.default_account },
                    { label: 'Last Used', value: selectedLinkedIn.last_used_at }
                  ]}
                />
              ) : (
                <EmptyState title="LinkedIn Account unavailable" message="The selected Campaign Profile LinkedIn account was not returned by the API." />
              )}
            </InfoCard>
          </div>

          <SectionCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-agent-primary">Validation</h3>
                <p className="text-sm text-slate-500">CampaignContextValidator output for the selected Campaign Profile.</p>
              </div>
              {loadingValidation && <StatusBadge tone="blue">Loading</StatusBadge>}
            </div>
            {loadingValidation ? (
              <LoadingState title={t('campaignInspector.validating')} message={t('campaignInspector.validatingDescription')} />
            ) : (
              <EmptyState title="No validation selected" message="Select a Campaign Profile to inspect its CampaignContext readiness." />
            )}
          </SectionCard>

          {!loadingValidation && validation && (
            <div className="grid gap-5 lg:grid-cols-2">
              <InfoCard title="Loaded Components">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(validation.loaded_components ?? {}).map(([name, loaded]) => (
                    <StatusBadge key={name} tone={loaded ? 'emerald' : 'amber'}>{name}: {loaded ? 'loaded' : 'missing'}</StatusBadge>
                  ))}
                </div>
              </InfoCard>
              <InfoCard title="Runtime Settings">
                <JsonBlock value={validation.configuration_summary?.runtime_settings ?? validation.configuration_summary} />
              </InfoCard>
              <InfoCard title="Agent Settings">
                <JsonBlock value={validation.configuration_summary?.agent_settings ?? validation.configuration_summary} />
              </InfoCard>
              <InfoCard title="Errors">
                <TextList items={validation.errors ?? []} emptyLabel="No errors reported." />
              </InfoCard>
              <InfoCard title="Warnings">
                <TextList items={validation.warnings ?? []} emptyLabel="No warnings reported." />
              </InfoCard>
              <InfoCard title="Missing Dependencies">
                <TextList items={validation.missing_dependencies ?? []} emptyLabel="No missing dependencies reported." />
              </InfoCard>
            </div>
          )}

          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-agent-primary">Planner Shadow</h3>
              <p className="text-sm text-slate-500">Read-only input derived from CampaignContext for migration inspection.</p>
            </div>
            <PlannerInputSection input={plannerInput} />
          </SectionCard>

          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-agent-primary">Planner Comparison</h3>
              <p className="text-sm text-slate-500">Read-only comparison between legacy Planner input and CampaignContext-derived input.</p>
            </div>
            <PlannerComparisonSection comparison={plannerComparison} />
          </SectionCard>
        </>
      )}
    </PageContainer>
  )
}
