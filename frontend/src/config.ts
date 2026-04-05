export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
}

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
}

/** Must match an authorized redirect URI in Google Cloud and the value sent to `POST /auth/google`. */
export function getOAuthRedirectUri(): string {
  const explicit = (import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? '').trim()
  if (explicit) return explicit.replace(/\/$/, '')
  return `${window.location.origin}/auth/callback`
}
