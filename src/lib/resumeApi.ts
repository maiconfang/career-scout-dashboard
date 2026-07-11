import { csrfToken } from './authApi'

export type CandidateResume = {
  resume_id: string
  owner_user_id: string
  candidate_profile_id: string
  filename: string
  display_name: string
  mime_type: string
  file_size_bytes: number
  version: number
  status: 'ACTIVE' | 'ARCHIVED'
  is_default: boolean
  active: boolean
  created_at: string | null
  updated_at: string | null
}

const configuredBaseUrl = (import.meta.env.VITE_CAREER_SCOUT_API_URL as string | undefined)?.trim()
const apiBaseUrl = configuredBaseUrl?.replace(/\/$/, '') ?? ''

function apiUrl(path: string) {
  return new URL(`${apiBaseUrl}${path}`, window.location.origin).toString()
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

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
    throw new Error(`Resume request failed (${response.status}).`)
  }

  return response.json() as Promise<T>
}

export function listResumes(includeArchived = false) {
  const params = new URLSearchParams()
  if (includeArchived) {
    params.set('include_archived', 'true')
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request<CandidateResume[]>(`/api/resumes${suffix}`)
}

export function uploadResume(file: File, displayName: string, makeDefault: boolean) {
  const form = new FormData()
  form.set('file', file)
  form.set('display_name', displayName)
  form.set('make_default', makeDefault ? 'true' : 'false')
  return request<CandidateResume>('/api/resumes', {
    method: 'POST',
    body: form
  })
}

export function setDefaultResume(resumeId: string) {
  return request<CandidateResume>(`/api/resumes/${resumeId}/default`, {
    method: 'POST'
  })
}

export function archiveResume(resumeId: string) {
  return request<CandidateResume>(`/api/resumes/${resumeId}`, {
    method: 'DELETE'
  })
}

export function resumeDownloadUrl(resumeId: string) {
  return apiUrl(`/api/resumes/${resumeId}/download`)
}
