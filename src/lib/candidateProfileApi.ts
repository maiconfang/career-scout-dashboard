import { apiRequest } from './httpClient'

export type CandidateProfile = {
  profile_id: string | null
  owner_user_id: string
  current_occupation: string
  desired_occupation: string
  career_level: string
  years_of_experience: number | null
  preferred_countries: string[]
  preferred_provinces: string[]
  preferred_employment_types: string[]
  remote_preference: string
  salary_expectation: string
  preferred_languages: string[]
  current_resume: string
  linkedin_url: string
  created_at: string | null
  updated_at: string | null
}

export type CandidateProfilePayload = Omit<
  CandidateProfile,
  'profile_id' | 'owner_user_id' | 'created_at' | 'updated_at'
>

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'Candidate Profile request failed',
    notFoundMessage: 'Candidate Profile request failed (404).'
  })
}

export function getCandidateProfile() {
  return request<CandidateProfile>('/api/candidate-profile')
}

export function saveCandidateProfile(payload: CandidateProfilePayload) {
  return request<CandidateProfile>('/api/candidate-profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}
