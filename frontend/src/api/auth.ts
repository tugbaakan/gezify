import { apiFetch } from './client'
import type { AuthSuccess, PublicUser } from './types'

export function exchangeGoogleCode(code: string, redirectUri: string) {
  return apiFetch<AuthSuccess>('/auth/google', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify({ code, redirectUri }),
  })
}

const inflightCodeExchange = new Map<string, Promise<AuthSuccess>>()

/**
 * Reuses one in-flight request per code+redirectUri so React StrictMode double effects
 * still complete sign-in (authorization codes are single-use).
 */
export function exchangeGoogleCodeOnce(
  code: string,
  redirectUri: string,
): Promise<AuthSuccess> {
  const key = `${code}\n${redirectUri}`
  const existing = inflightCodeExchange.get(key)
  if (existing) return existing

  const pending = exchangeGoogleCode(code, redirectUri).finally(() => {
    inflightCodeExchange.delete(key)
  })
  inflightCodeExchange.set(key, pending)
  return pending
}

export function fetchCurrentUser() {
  return apiFetch<PublicUser>('/auth/me')
}
