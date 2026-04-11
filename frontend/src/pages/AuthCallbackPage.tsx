import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '../i18n'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { acceptInvitation } from '../api/invitations'
import { exchangeGoogleCodeOnce } from '../api/auth'
import { ApiRequestError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { clearOAuthState, validateOAuthState } from '../auth/oauthState'
import {
  consumeOAuthReturnPath,
  consumePendingInviteToken,
} from '../auth/postLoginRedirect'
import { getOAuthRedirectUri } from '../config'
import './AuthCallbackPage.css'

function safeReturnPath(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export function AuthCallbackPage() {
  const { t } = useTranslation()
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
        t('authCallback.oauthCancelled', { error: oauthError })
      )
    }
    if (!code) return t('authCallback.missingCode')
    if (!validateOAuthState(state)) return t('authCallback.invalidSession')
    return null
  }, [oauthError, oauthDescription, code, state, t])

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
        const pendingInvite = consumePendingInviteToken()
        if (pendingInvite) {
          acceptInvitation(pendingInvite)
            .then((r) => navigate(`/travels/${r.travelId}`, { replace: true }))
            .catch(() => {
              navigate(
                `/invite/${encodeURIComponent(pendingInvite)}?oauth=accept_failed`,
                { replace: true },
              )
            })
          return
        }
        const returnPath = consumeOAuthReturnPath()
        navigate(safeReturnPath(returnPath), { replace: true })
      })
      .catch((err: unknown) => {
        clearOAuthState()
        if (err instanceof ApiRequestError)
          setExchangeError(err.message || i18n.t('authCallback.signInFailed'))
        else setExchangeError(i18n.t('authCallback.serverUnreachable'))
      })
  }, [blockedMessage, code, navigate, completeSession])

  const message =
    blockedMessage ?? exchangeError ?? t('common.signingIn')

  return (
    <div className="auth-callback">
      <div className="auth-callback__card">
        <p className="auth-callback__message">{message}</p>
        <Link className="auth-callback__link" to="/">
          {t('authCallback.backHome')}
        </Link>
      </div>
    </div>
  )
}

export default AuthCallbackPage
