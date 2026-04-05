import { getAccessToken } from '../auth/token'
import { getApiBaseUrl } from '../config'
import type { ApiErrorEnvelope } from './types'

export class ApiRequestError extends Error {
  readonly status: number
  readonly body?: ApiErrorEnvelope

  constructor(message: string, status: number, body?: ApiErrorEnvelope) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.body = body
  }
}

type ApiFetchOptions = RequestInit & {
  /** When true, do not send `Authorization` (e.g. `POST /auth/google`). */
  anonymous?: boolean
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base)
    throw new ApiRequestError(
      'Missing VITE_API_URL. Set it to your Gezify API base (e.g. http://localhost:8050).',
      0,
    )

  const { anonymous, ...rest } = init
  const headers = new Headers(rest.headers)
  if (rest.body !== undefined && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  if (!anonymous) {
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${base}${path}`, { ...rest, headers })
  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const envelope = json as ApiErrorEnvelope | undefined
    const message =
      envelope?.error?.message ??
      (typeof json === 'object' &&
      json !== null &&
      'message' in json &&
      typeof (json as { message: unknown }).message === 'string'
        ? (json as { message: string }).message
        : res.statusText)
    throw new ApiRequestError(message, res.status, envelope)
  }

  return json as T
}
