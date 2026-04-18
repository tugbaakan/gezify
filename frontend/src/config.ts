type PublicEnvKeys = 'VITE_API_URL' | 'VITE_GOOGLE_CLIENT_ID' | 'VITE_GOOGLE_REDIRECT_URI'

type WindowWithEnv = Window & {
  __ENV?: Partial<Record<PublicEnvKeys, string>>
}

function envFromRuntime(key: PublicEnvKeys): string | undefined {
  if (typeof window === 'undefined') return undefined
  const v = (window as WindowWithEnv).__ENV?.[key]
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  return s.length ? s : undefined
}

function envString(key: PublicEnvKeys): string {
  const fromRuntime = envFromRuntime(key)
  if (fromRuntime !== undefined) return fromRuntime
  return (import.meta.env[key] ?? '').trim()
}

export function getApiBaseUrl(): string {
  return envString('VITE_API_URL').replace(/\/$/, '')
}

export function getGoogleClientId(): string {
  return envString('VITE_GOOGLE_CLIENT_ID')
}

/** Must match an authorized redirect URI in Google Cloud and the value sent to `POST /auth/google`. */
export function getOAuthRedirectUri(): string {
  const explicit = envString('VITE_GOOGLE_REDIRECT_URI')
  if (explicit) return explicit.replace(/\/$/, '')
  return `${window.location.origin}/auth/callback`
}
