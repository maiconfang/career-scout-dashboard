import { csrfToken } from './authApi'

export type LinkedInAccount = {
  account_id: string
  owner_user_id: string
  candidate_profile_id: string
  display_name: string
  linkedin_email: string
  status: 'ACTIVE' | 'DISCONNECTED'
  active: boolean
  default_account: boolean
  created_at: string | null
  updated_at: string | null
  last_sync_at: string | null
  last_used_at: string | null
}

export type LinkedInAccountPayload = {
  display_name: string
  linkedin_email: string
  storage_state: string
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
    throw new Error(`LinkedIn Account request failed (${response.status}).`)
  }

  return response.json() as Promise<T>
}

export function listLinkedInAccounts(includeDisconnected = false) {
  const params = new URLSearchParams()
  if (includeDisconnected) {
    params.set('include_disconnected', 'true')
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request<LinkedInAccount[]>(`/api/linkedin-accounts${suffix}`)
}

export function createLinkedInAccount(payload: LinkedInAccountPayload) {
  return request<LinkedInAccount>('/api/linkedin-accounts', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function setDefaultLinkedInAccount(accountId: string) {
  return request<LinkedInAccount>(`/api/linkedin-accounts/${accountId}/default`, {
    method: 'POST'
  })
}

export function disconnectLinkedInAccount(accountId: string) {
  return request<LinkedInAccount>(`/api/linkedin-accounts/${accountId}/disconnect`, {
    method: 'POST'
  })
}
