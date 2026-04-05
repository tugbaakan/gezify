import { getGoogleClientId, getOAuthRedirectUri } from '../config'
import { createAndStoreOAuthState } from './oauthState'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'

export function startGoogleSignIn(): void {
  const clientId = getGoogleClientId()
  if (!clientId) {
    console.error('VITE_GOOGLE_CLIENT_ID is not set.')
    return
  }

  const redirectUri = getOAuthRedirectUri()
  const state = createAndStoreOAuthState()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  window.location.assign(`${GOOGLE_AUTH}?${params.toString()}`)
}
