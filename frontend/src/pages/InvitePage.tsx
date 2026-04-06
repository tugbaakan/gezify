import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { acceptInvitation, validateInvitationToken } from '../api/invitations'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../auth/useAuth'
import './InvitePage.css'

function InviteWithToken({ token }: { token: string }) {
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
        else setAcceptError('Could not accept invitation.')
      })
      .finally(() => setAccepting(false))
  }

  return (
    <main className="invite__main">
      <h1 className="invite__title">Trip invitation</h1>

      {oauthFailed ? (
        <p className="invite__warn" role="alert">
          We could not add you to the trip after sign-in. Your Google account email may
          not match the invitation. Open the invite link again while signed in with the
          invited address, or ask the host to send a new invite.
        </p>
      ) : null}

      {checking ? (
        <p className="invite__muted">Checking invitation…</p>
      ) : !inviteOk ? (
        <p className="invite__error" role="alert">
          This invitation link is invalid or has expired.
        </p>
      ) : (
        <>
          <p className="invite__lede">
            {travelName ? (
              <>
                You&apos;re invited to <strong>{travelName}</strong>.
              </>
            ) : (
              <>You&apos;ve been invited to a trip on Gezify.</>
            )}
          </p>

          {!ready ? (
            <p className="invite__muted">Loading…</p>
          ) : !user ? (
            <div className="invite__actions">
              <p className="invite__hint">
                Sign in with the Google account that received the invitation email.
              </p>
              <button
                type="button"
                className="invite__primary"
                onClick={() => signInWithGoogle({ pendingInviteToken: token })}
              >
                Sign in with Google
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
                {accepting ? 'Joining…' : 'Join this trip'}
              </button>
            </div>
          )}

          <p className="invite__back">
            <Link to="/">Back to Gezify</Link>
          </p>
        </>
      )}
    </main>
  )
}

export function InvitePage() {
  const { token: tokenParam } = useParams<{ token: string }>()
  const token = tokenParam ? decodeURIComponent(tokenParam) : ''

  return (
    <AppLayout>
      {!token ? (
        <main className="invite__main">
          <h1 className="invite__title">Trip invitation</h1>
          <p className="invite__error" role="alert">
            This invitation link is invalid or has expired.
          </p>
          <p className="invite__back">
            <Link to="/">Back to Gezify</Link>
          </p>
        </main>
      ) : (
        <InviteWithToken key={token} token={token} />
      )}
    </AppLayout>
  )
}

export default InvitePage
