export type PlatformUser = {
  user_id: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  role: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'INACTIVE' | 'BLOCKED'
  is_active: boolean
  is_locked: boolean
  locale: 'en' | 'fr' | 'pt-BR'
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in_seconds: number
  csrf_token: string
  user: PlatformUser
}

export type PasswordResetTokenResponse = {
  user_id: string
  reset_token: string
  reset_expires_at: string
}

export type CreateUserResponse = {
  user: PlatformUser
  activation_token: string
  activation_expires_at: string
}

export class AuthApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

const configuredBaseUrl = (import.meta.env.VITE_CAREER_SCOUT_API_URL as string | undefined)?.trim()
const apiBaseUrl = configuredBaseUrl?.replace(/\/$/, '') ?? ''

function apiUrl(path: string) {
  return new URL(`${apiBaseUrl}${path}`, window.location.origin).toString()
}

export function csrfToken() {
  return document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith('career_scout_csrf='))
    ?.split('=')
    .slice(1)
    .join('=')
}

async function parseError(response: Response) {
  try {
    const payload = await response.json()
    if (typeof payload.detail === 'string') {
      return payload.detail
    }
    if (payload.detail && typeof payload.detail.message === 'string') {
      return payload.detail.message
    }
    if (typeof payload.message === 'string') {
      return payload.message
    }
    return `Authentication request failed (${response.status}).`
  } catch {
    return `Authentication request failed (${response.status}).`
  }
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
    throw new AuthApiError(await parseError(response), response.status)
  }

  return response.json() as Promise<T>
}

export function login(email: string, password: string) {
  return authRequest<TokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
}

export function refreshSession() {
  return authRequest<TokenResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function logout() {
  return authRequest<{ message: string }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function currentUser() {
  return authRequest<PlatformUser>('/api/auth/me')
}

export function updateLocalePreference(locale: 'en' | 'fr' | 'pt-BR') {
  return authRequest<PlatformUser>('/api/auth/me/locale', {
    method: 'PATCH',
    body: JSON.stringify({ locale })
  })
}

export function activateAccount(activationToken: string, newPassword: string) {
  return authRequest<PlatformUser>('/api/auth/activate', {
    method: 'POST',
    body: JSON.stringify({
      activation_token: activationToken,
      new_password: newPassword
    })
  })
}

export function requestPasswordReset(email: string) {
  return authRequest<PasswordResetTokenResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export function resetPassword(resetToken: string, newPassword: string) {
  return authRequest<PlatformUser>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      reset_token: resetToken,
      new_password: newPassword
    })
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return authRequest<PlatformUser>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  })
}

export function listAdminUsers() {
  return authRequest<PlatformUser[]>('/api/admin/users')
}

export function createAdminUser(payload: {
  first_name: string
  last_name: string
  display_name: string
  email: string
  role: 'ADMIN' | 'USER'
  locale: 'en' | 'fr' | 'pt-BR'
}) {
  return authRequest<CreateUserResponse>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function blockAdminUser(userId: string) {
  return authRequest<PlatformUser>(`/api/admin/users/${userId}/block`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function unblockAdminUser(userId: string) {
  return authRequest<PlatformUser>(`/api/admin/users/${userId}/unblock`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function activateAdminUser(userId: string) {
  return authRequest<PlatformUser>(`/api/admin/users/${userId}/activate`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function deactivateAdminUser(userId: string) {
  return authRequest<PlatformUser>(`/api/admin/users/${userId}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function resetAdminUserPassword(userId: string) {
  return authRequest<PasswordResetTokenResponse>(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function regenerateActivationToken(userId: string) {
  return authRequest<CreateUserResponse>(`/api/admin/users/${userId}/activation-token`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}
