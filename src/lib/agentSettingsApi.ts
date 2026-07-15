import { apiRequest } from './httpClient'

export type AgentSetting = {
  setting_id: string
  setting_key: string
  category: string
  current_value: string | number | boolean
  value_type: 'string' | 'integer' | 'float' | 'boolean'
  description: string
  default_value: string | number | boolean
  status: 'LEGACY' | 'PLATFORM'
  current_source: string
  future_source: string
  notes: string
  observational_only: boolean
  operational: boolean
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string | null
  updated_at: string | null
}

export type AgentSettingVersion = {
  setting_version_id: string
  setting_id: string
  setting_key: string
  version: number
  value: string | number | boolean
  changed_by: string | null
  change_reason: string
  created_at: string | null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    errorPrefix: 'Agent Settings request failed',
    notFoundMessage: 'Agent Settings request failed (404).'
  })
}

export function listAgentSettings() {
  return request<AgentSetting[]>('/api/admin/agent-settings')
}

export function updateAgentSetting(settingKey: string, value: string | number | boolean, notes: string) {
  return request<AgentSetting>(`/api/admin/agent-settings/${encodeURIComponent(settingKey)}`, {
    method: 'PATCH',
    body: JSON.stringify({ value, notes })
  })
}

export function listAgentSettingVersions(settingKey: string) {
  return request<AgentSettingVersion[]>(`/api/admin/agent-settings/${encodeURIComponent(settingKey)}/versions`)
}
