import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { i18n } from '../i18n'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { acceptInvitation, validateInvitationToken } from '../api/invitations'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../auth/useAuth'
import './InvitePage.css'

function InviteWithToken({ token }: { token: string }) {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, ready, signInWithGoogle } = useAuth()

  const oauthFailed = searchParams.get('oauth') === 'accept_failed'

  const [checking, setChecking] = useState(true)
  const [inviteOk, setInviteOk] = useState(false)
  const [travelName, setTravelName] = useState<string | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let cancelled = false

    validateInvitationToken(token)
      .then((v) => {
        if (!cancelled) {
          setChecking(false)
          if (!v.valid) {
            setInviteOk(false)
            setTravelName(null)
          } else {
            setInviteOk(true)
            setTravelName(v.travelName)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecking(false)
          setInviteOk(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const onAccept = () => {
    if (!user || accepting) return
    setAcceptError(null)
    setAccepting(true)
    acceptInvitation(token)
      .then((res) => navigate(`/travels/${res.travelId}`, { replace: true }))
      .catch((e: unknown) => {
        if (e instanceof ApiRequestError) setAcceptError(e.message)
        else setAcceptError(i18n.t('invite.acceptFailed'))
      })
      .finally(() => setAccepting(false))
  }

  return (
    <main className="invite__main">
      <div className="invite__card">
        <h1 className="invite__title">{t('invite.title')}</h1>

        {oauthFailed ? (
          <p className="invite__warn" role="alert">
            {t('invite.oauthFailed')}
          </p>
        ) : null}

        {checking ? (
          <p className="invite__muted">{t('common.checking')}</p>
        ) : !inviteOk ? (
          <p className="invite__error" role="alert">
            {t('invite.invalid')}
          </p>
        ) : (
          <>
            <p className="invite__lede">
              {travelName ? (
                <Trans
                  i18nKey="invite.invitedToNamed"
                  values={{ name: travelName }}
                  components={{ highlight: <strong /> }}
                />
              ) : (
                t('invite.invitedGeneric')
              )}
            </p>

            {!ready ? (
              <p className="invite__muted">{t('common.loading')}</p>
            ) : !user ? (
              <div className="invite__actions">
                <p className="invite__hint">{t('invite.signInHint')}</p>
                <button
                  type="button"
                  className="invite__primary"
                  onClick={() => signInWithGoogle({ pendingInviteToken: token })}
                >
                  {t('app.signInGoogle')}
                </button>
              </div>
            ) : (
              <div className="invite__actions">
                {acceptError ? (
                  <p className="invite__error" role="alert">
                    {acceptError}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="invite__primary"
                  disabled={accepting}
                  onClick={onAccept}
                >
                  {accepting ? t('common.joining') : t('invite.joinTrip')}
                </button>
              </div>
            )}

            <p className="invite__back">
              <Link to="/">{t('invite.backHome')}</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}

export function InvitePage() {
  const { t } = useTranslation()
  const { token: tokenParam } = useParams<{ token: string }>()
  const token = tokenParam ? decodeURIComponent(tokenParam) : ''

  return (
    <AppLayout>
      {!token ? (
        <main className="invite__main">
          <div className="invite__card">
            <h1 className="invite__title">{t('invite.title')}</h1>
            <p className="invite__error" role="alert">
              {t('invite.invalid')}
            </p>
            <p className="invite__back">
              <Link to="/">{t('invite.backHome')}</Link>
            </p>
          </div>
        </main>
      ) : (
        <InviteWithToken key={token} token={token} />
      )}
    </AppLayout>
  )
}

export default InvitePage
