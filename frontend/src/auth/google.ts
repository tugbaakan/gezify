import { getGoogleClientId, getOAuthRedirectUri } from '../config'
import { createAndStoreOAuthState } from './oauthState'
import {
  clearOAuthReturnPath,
  clearPendingInviteToken,
  setOAuthReturnPath,
  setPendingInviteToken,
} from './postLoginRedirect'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'

export type GoogleSignInOptions = {
  /** After OAuth, accept this invitation (requires user to match invite email). */
  pendingInviteToken?: string
  /** In-app path to open after sign-in (e.g. `/travels/...`) when not using invite flow. */
  returnToPath?: string
}

export function startGoogleSignIn(options: GoogleSignInOptions = {}): void {
  const clientId = getGoogleClientId()
  if (!clientId) {
    console.error('VITE_GOOGLE_CLIENT_ID is not set.')
    return
  }

  if (options.pendingInviteToken)
    setPendingInviteToken(options.pendingInviteToken)
  else clearPendingInviteToken()

  if (options.returnToPath?.startsWith('/'))
    setOAuthReturnPath(options.returnToPath)
  else clearOAuthReturnPath()

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
