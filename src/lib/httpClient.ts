const configuredBaseUrl = (import.meta.env.VITE_CAREER_SCOUT_API_URL as string | undefined)?.trim()
const apiBaseUrl = configuredBaseUrl?.replace(/\/$/, '') ?? ''

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined>

export type ApiRequestOptions = RequestInit & {
  query?: QueryParams
  errorPrefix?: string
  notFoundMessage?: string
  preferResponseDetail?: boolean
  skipAuthRefresh?: boolean
}

export function apiUrl(path: string, query?: QueryParams) {
  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

export function csrfToken() {
  return document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith('career_scout_csrf='))
    ?.split('=')
    .slice(1)
    .join('=')
}

async function parseResponseError(response: Response, fallback: string) {
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
  } catch {
    return fallback
  }

  return fallback
}

function buildHeaders(options: RequestInit) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const method = (options.method ?? 'GET').toUpperCase()
  const csrf = csrfToken()
  if (csrf && method !== 'GET' && method !== 'HEAD') {
    headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }

  return headers
}

async function refreshSessionOnce() {
  const response = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: buildHeaders({
      method: 'POST',
      body: JSON.stringify({})
    }),
    body: JSON.stringify({}),
    credentials: 'include'
  })

  return response.ok
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    query,
    errorPrefix = 'Career Scout API request failed',
    notFoundMessage = 'The requested Career Scout data was not found.',
    preferResponseDetail = false,
    skipAuthRefresh = false,
    ...fetchOptions
  } = options

  const execute = () => fetch(apiUrl(path, query), {
    ...fetchOptions,
    headers: buildHeaders(fetchOptions),
    credentials: 'include'
  })

  let response = await execute()

  if (response.status === 401 && !skipAuthRefresh) {
    try {
      if (await refreshSessionOnce()) {
        response = await execute()
      } else {
        window.dispatchEvent(new Event('career-scout-auth-expired'))
      }
    } catch {
      window.dispatchEvent(new Event('career-scout-auth-expired'))
    }
  }

  if (!response.ok) {
    const fallback = response.status === 404
      ? notFoundMessage
      : `${errorPrefix} (${response.status}).`
    const message = preferResponseDetail
      ? await parseResponseError(response, fallback)
      : fallback
    throw new ApiRequestError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function get<T>(path: string, query?: QueryParams, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, {
    ...options,
    method: 'GET',
    query
  })
}

export function patch<T>(path: string, body: unknown = {}, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, {
    ...options,
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body)
  })
}
