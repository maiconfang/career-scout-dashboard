import { ApiRequestError, apiRequest, csrfToken } from './httpClient'
export { csrfToken }

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

async function authRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await apiRequest<T>(path, {
      ...options,
      errorPrefix: 'Authentication request failed',
      notFoundMessage: 'Authentication request failed (404).',
      preferResponseDetail: true,
      skipAuthRefresh: true
    })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new AuthApiError(error.message, error.status)
    }
    throw error
  }
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
