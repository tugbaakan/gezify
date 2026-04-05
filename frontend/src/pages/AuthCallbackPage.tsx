import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeGoogleCodeOnce } from '../api/auth'
import { ApiRequestError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { clearOAuthState, validateOAuthState } from '../auth/oauthState'
import { getOAuthRedirectUri } from '../config'
import './AuthCallbackPage.css'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { completeSession } = useAuth()
  const [exchangeError, setExchangeError] = useState<string | null>(null)

  const oauthError = searchParams.get('error')
  const oauthDescription = searchParams.get('error_description')
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const blockedMessage = useMemo(() => {
    if (oauthError) {
      return (
        oauthDescription?.replace(/\+/g, ' ') ??
        `Google sign-in was cancelled (${oauthError}).`
      )
    }
    if (!code) return 'Missing authorization code. Try signing in again.'
    if (!validateOAuthState(state))
      return 'Invalid sign-in session. Please try again from the app.'
    return null
  }, [oauthError, oauthDescription, code, state])

  useEffect(() => {
    if (!blockedMessage) return
    clearOAuthState()
  }, [blockedMessage])

  useEffect(() => {
    if (blockedMessage || !code) return

    const redirectUri = getOAuthRedirectUri()

    exchangeGoogleCodeOnce(code, redirectUri)
      .then((res) => {
        clearOAuthState()
        completeSession(res.accessToken, res.user)
        navigate('/', { replace: true })
      })
      .catch((err: unknown) => {
        clearOAuthState()
        if (err instanceof ApiRequestError)
          setExchangeError(err.message || 'Sign-in failed.')
        else
          setExchangeError(
            'Could not reach the server. Check VITE_API_URL and try again.',
          )
      })
  }, [blockedMessage, code, navigate, completeSession])

  const message =
    blockedMessage ?? exchangeError ?? 'Signing you in…'

  return (
    <div className="auth-callback">
      <div className="auth-callback__card">
        <p className="auth-callback__message">{message}</p>
        <Link className="auth-callback__link" to="/">
          Back to Gezify
        </Link>
      </div>
    </div>
  )
}

export default AuthCallbackPage
