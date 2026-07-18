import { apiRequest } from './httpClient'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'Campaign execution request failed',
    notFoundMessage: 'Campaign execution request failed (404).'
  })
}

export type RunCampaignResponse = {
  execution_id: string
  status: string
}

export type CampaignExecutionProgress = {
  execution_id?: string
  status: string
  current_stage?: string
  completed_stages?: string[]
  next_stage?: string | null
  started_at?: string | null
  finished_at?: string | null
  duration?: number | null
  duration_seconds?: number | null
  progress?: number
}

export function runCampaign(campaignProfileId: string) {
  return request<RunCampaignResponse>(
    `/api/campaigns/${encodeURIComponent(campaignProfileId)}/run`,
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  )
}

export function runAgentCampaign(campaignProfileId: string) {
  return request<RunCampaignResponse>('/api/agent/run', {
    method: 'POST',
    body: JSON.stringify({ campaign_profile_id: campaignProfileId })
  })
}

export function replayCampaignExecution(executionId: string) {
  return request<RunCampaignResponse>(
    `/api/agent/executions/${encodeURIComponent(executionId)}/replay`,
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  )
}

export function getCampaignExecutionProgress(executionId: string) {
  return request<CampaignExecutionProgress>(
    `/api/agent/executions/${encodeURIComponent(executionId)}/progress`
  )
}
