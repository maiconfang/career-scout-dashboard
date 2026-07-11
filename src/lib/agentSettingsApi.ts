import { csrfToken } from './authApi'

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
    throw new Error(`Agent Settings request failed (${response.status}).`)
  }

  return response.json() as Promise<T>
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
