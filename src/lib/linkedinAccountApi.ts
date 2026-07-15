import { apiRequest } from './httpClient'

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'LinkedIn Account request failed',
    notFoundMessage: 'LinkedIn Account request failed (404).'
  })
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
