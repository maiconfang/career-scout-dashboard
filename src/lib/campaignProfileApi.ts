import { apiRequest } from './httpClient'

export type CampaignProfile = {
  campaign_profile_id: string
  owner_user_id: string
  candidate_profile_id: string
  resume_id: string
  linkedin_account_id: string
  name: string
  primary_search_intent: string
  preferred_countries: string[]
  preferred_provinces: string[]
  remote_preference: string
  employment_types: string[]
  languages: string[]
  status: 'ACTIVE' | 'ARCHIVED'
  active: boolean
  default_profile: boolean
  created_at: string | null
  updated_at: string | null
}

export type CampaignProfilePayload = {
  candidate_profile_id: string
  resume_id: string
  linkedin_account_id: string
  name: string
  primary_search_intent: string
  preferred_countries: string[]
  preferred_provinces: string[]
  remote_preference: string
  employment_types: string[]
  languages: string[]
  make_default: boolean
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'Campaign Profile request failed',
    notFoundMessage: 'Campaign Profile request failed (404).'
  })
}

export function listCampaignProfiles(includeArchived = false) {
  const params = new URLSearchParams()
  if (includeArchived) {
    params.set('include_archived', 'true')
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request<CampaignProfile[]>(`/api/campaign-profiles${suffix}`)
}

export function createCampaignProfile(payload: CampaignProfilePayload) {
  return request<CampaignProfile>('/api/campaign-profiles', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updateCampaignProfile(campaignProfileId: string, payload: CampaignProfilePayload) {
  return request<CampaignProfile>(`/api/campaign-profiles/${campaignProfileId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export function setDefaultCampaignProfile(campaignProfileId: string) {
  return request<CampaignProfile>(`/api/campaign-profiles/${campaignProfileId}/default`, {
    method: 'POST'
  })
}

export function archiveCampaignProfile(campaignProfileId: string) {
  return request<CampaignProfile>(`/api/campaign-profiles/${campaignProfileId}/archive`, {
    method: 'POST'
  })
}
