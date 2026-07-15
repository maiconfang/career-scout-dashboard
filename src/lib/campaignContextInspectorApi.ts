import { get } from './httpClient'

async function request<T>(path: string): Promise<T> {
  return get<T>(path, undefined, {
    errorPrefix: 'Campaign Context request failed',
    notFoundMessage: 'Campaign Context request failed (404).'
  })
}

export type CampaignContextValidationResult = {
  ready: boolean
  validation_score: number
  errors: string[]
  warnings: string[]
  missing_dependencies: string[]
  loaded_components: Record<string, boolean>
  configuration_summary: Record<string, unknown>
  planner_shadow_analysis?: Record<string, unknown>
  planner_comparison?: Record<string, unknown>
  campaign_context_planner_input?: Record<string, unknown>
  planner_input?: Record<string, unknown>
  [key: string]: unknown
}

export function validateCampaignContext(campaignProfileId: string) {
  return request<CampaignContextValidationResult>(
    `/api/agent/campaign-context/${encodeURIComponent(campaignProfileId)}/validate`
  )
}
