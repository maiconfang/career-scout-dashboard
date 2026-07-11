import { csrfToken } from './authApi'

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
    throw new Error(`Candidate Profile request failed (${response.status}).`)
  }

  return response.json() as Promise<T>
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
