import { apiRequest } from './httpClient'

export type DiscoverySource = {
  source_id: string
  owner_user_id: string
  linkedin_account_id: string
  name: string
  search_url: string
  status: 'ACTIVE' | 'INACTIVE'
  active: boolean
  execution_interval_hours: number
  created_at: string | null
  updated_at: string | null
}

export type DiscoverySourcePayload = {
  linkedin_account_id: string
  name: string
  search_url: string
  active: boolean
  execution_interval_hours: number
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'Discovery Source request failed',
    notFoundMessage: 'Discovery Source request failed (404).',
    preferResponseDetail: true
  })
}

export function listDiscoverySources(includeInactive = false) {
  const params = new URLSearchParams()
  if (includeInactive) {
    params.set('include_inactive', 'true')
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request<DiscoverySource[]>(`/api/discovery-sources${suffix}`)
}

export function createDiscoverySource(payload: DiscoverySourcePayload) {
  return request<DiscoverySource>('/api/discovery-sources', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updateDiscoverySource(sourceId: string, payload: DiscoverySourcePayload) {
  return request<DiscoverySource>(`/api/discovery-sources/${sourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export function setDiscoverySourceActive(sourceId: string, active: boolean) {
  return request<DiscoverySource>(`/api/discovery-sources/${sourceId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active })
  })
}

export function deleteDiscoverySource(sourceId: string) {
  return request<void>(`/api/discovery-sources/${sourceId}`, {
    method: 'DELETE'
  })
}
