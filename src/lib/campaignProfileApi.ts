import { csrfToken } from './authApi'

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

const configuredBaseUrl = (import.meta.env.VITE_CAREER_SCOUT_API_URL as string | undefined)?.trim()
const apiBaseUrl = configuredBaseUrl?.replace(/\/$/, '') ?? ''

function apiUrl(path: string) {
  return new URL(`${apiBaseUrl}${path}`, window.location.origin).toString()
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const csrf = csrfToken()
  if (csrf && (options.method ?? 'GET').toUpperCase() !== 'GET') {
    headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`Campaign Profile request failed (${response.status}).`)
  }

  return response.json() as Promise<T>
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
