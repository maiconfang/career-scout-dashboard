import { apiRequest, apiUrl } from './httpClient'

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'Resume request failed',
    notFoundMessage: 'Resume request failed (404).'
  })
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
