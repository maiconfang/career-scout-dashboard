import { apiRequest, get, patch } from './httpClient'

const publicAccessRequestStorageKey = 'career-scout-public-access-requests'

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'USER_CREATED' | 'REJECTED'

export type AccessRequest = {
  id: string
  full_name: string
  email: string
  desired_position: string
  country: string
  linkedin_url: string | null
  resume_filename: string | null
  notes: string | null
  status: AccessRequestStatus
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  approved_by_user_id: string | null
  rejected_by_user_id: string | null
  created_user_id: string | null
  activation_token_id: string | null
  provisioning_duration_ms: number | null
}

export type PublicAccessRequestStatus = Pick<
  AccessRequest,
  | 'id'
  | 'status'
  | 'created_at'
  | 'approved_at'
  | 'rejected_at'
  | 'provisioning_duration_ms'
>

export type ListAccessRequestsParams = {
  status?: AccessRequestStatus | ''
  limit?: number
  offset?: number
}

export type CreateAccessRequestPayload = {
  full_name: string
  email: string
  desired_position: string
  country: string
  linkedin_url?: string | null
  resume_filename?: string | null
  notes?: string | null
}

export function createAccessRequest(payload: CreateAccessRequestPayload) {
  return apiRequest<AccessRequest>('/api/access-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
    errorPrefix: 'Unable to submit access request',
    preferResponseDetail: true
  })
}

export function rememberPublicAccessRequest(accessRequest: AccessRequest) {
  try {
    const stored = window.localStorage.getItem(publicAccessRequestStorageKey)
    const requests = stored ? JSON.parse(stored) as Record<string, AccessRequest> : {}
    requests[accessRequest.id] = accessRequest
    window.localStorage.setItem(publicAccessRequestStorageKey, JSON.stringify(requests))
  } catch {
    // Public status tracking remains available even when local storage is disabled.
  }
}

export function readRememberedPublicAccessRequest(accessRequestId: string) {
  try {
    const stored = window.localStorage.getItem(publicAccessRequestStorageKey)
    const requests = stored ? JSON.parse(stored) as Record<string, AccessRequest> : {}
    return requests[accessRequestId] ?? null
  } catch {
    return null
  }
}

export function listAccessRequests(params: ListAccessRequestsParams = {}) {
  return get<AccessRequest[]>('/api/access-requests', {
    status: params.status,
    limit: params.limit ?? 500,
    offset: params.offset ?? 0
  }, {
    errorPrefix: 'Unable to load access requests',
    preferResponseDetail: true
  })
}

export function getAccessRequest(accessRequestId: string) {
  return get<AccessRequest>(`/api/access-requests/${accessRequestId}`, undefined, {
    errorPrefix: 'Unable to load access request',
    notFoundMessage: 'Access request not found.',
    preferResponseDetail: true
  })
}

export function getPublicAccessRequestStatus(accessRequestId: string) {
  return get<PublicAccessRequestStatus>(`/api/access-requests/public/${accessRequestId}/status`, undefined, {
    errorPrefix: 'Unable to load access request status',
    notFoundMessage: 'Access request not found.',
    preferResponseDetail: true,
    skipAuthRefresh: true
  })
}

export function approveAccessRequest(accessRequestId: string) {
  return patch<AccessRequest>(`/api/access-requests/${accessRequestId}/approve`, {}, {
    errorPrefix: 'Unable to approve access request',
    preferResponseDetail: true
  })
}

export function rejectAccessRequest(accessRequestId: string) {
  return patch<AccessRequest>(`/api/access-requests/${accessRequestId}/reject`, {}, {
    errorPrefix: 'Unable to reject access request',
    preferResponseDetail: true
  })
}
