import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  createTravelInvitation,
  fetchTravel,
  fetchTravelInvitations,
  fetchTravelMembers,
} from '../api/travels'
import type { TravelDetail, TravelInvitationListItem, TravelMember } from '../api/types'
import { ApiRequestError } from '../api/client'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { AppLayout } from '../components/AppLayout'
import { firstValidationDetailMessage } from '../utils/apiErrorDisplay'
import { invitationStatusLabel } from '../utils/format'
import '../components/skeleton.css'
import './TravelDetailPage.css'
import './TravelPeoplePage.css'

function memberLabel(actor: { displayName: string | null; email: string }) {
  return actor.displayName?.trim() || actor.email
}

function TravelPeopleContent({ travelId }: { travelId: string }) {
  const { t, i18n: i18next } = useTranslation()
  const locale = i18next.language
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [members, setMembers] = useState<TravelMember[] | null>(null)
  const [invitations, setInvitations] = useState<TravelInvitationListItem[] | null>(null)
  const [error, setError] = useState<ApiRequestError | string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchTravel(travelId), fetchTravelMembers(travelId), fetchTravelInvitations(travelId)])
      .then(([tr, m, inv]) => {
        if (!cancelled) {
          setError(null)
          setTravel(tr)
          setMembers(m)
          setInvitations(inv)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError) setError(e)
          else setError(i18next.t('travelPeople.loadFailed'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [travelId, i18next])

  const canInvite = travel?.status === 'active'

  async function onInviteSubmit(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    const trimmed = inviteEmail.trim()
    if (!trimmed) {
      setInviteError(t('travelDetail.inviteEmailRequired'))
      return
    }
    setInviteBusy(true)
    try {
      await createTravelInvitation(travelId, trimmed)
      const nextInv = await fetchTravelInvitations(travelId)
      setInvitations(nextInv)
      setInviteSuccess(t('travelDetail.inviteSuccess', { email: trimmed }))
      setInviteEmail('')
    } catch (e: unknown) {
      if (e instanceof ApiRequestError) {
        const detail = firstValidationDetailMessage(e)
        setInviteError(detail ?? e.message)
      } else {
        setInviteError(t('travelDetail.inviteSendFailed'))
      }
    } finally {
      setInviteBusy(false)
    }
  }

  const loading = !travel || !members || !invitations

  return (
    <main className="travel-people__main">
      <nav className="travel-people__crumb" aria-label={t('common.ariaBreadcrumb')}>
        <Link to="/">{t('travelDetail.breadcrumbTrips')}</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/travels/${travelId}`}>{travel?.name ?? t('travelDetail.tripFallback')}</Link>
        <span aria-hidden="true"> / </span>
        <span className="travel-people__crumb-current">{t('travelPeople.title')}</span>
      </nav>

      {error ? (
        <ApiErrorBanner className="travel-people__banner" error={error} />
      ) : loading ? (
        <div className="travel-people__skel" aria-busy="true" aria-label={t('travelPeople.loading')}>
          <div className="travel-people__skel-title gf-skel" />
          <div className="travel-people__skel-block gf-skel" />
          <div className="travel-people__skel-block gf-skel" />
        </div>
      ) : (
        <>
          <header className="travel-people__header">
            <h1 className="travel-people__title">{t('travelPeople.title')}</h1>
            <p className="travel-people__subtitle">{travel.name}</p>
            <Link className="travel-detail__btn travel-detail__btn--secondary travel-people__back" to={`/travels/${travel.id}`}>
              {t('travelPeople.backToTrip')}
            </Link>
          </header>

          <section className="travel-people__section" aria-labelledby="tp-members-heading">
            <h2 id="tp-members-heading" className="travel-people__h2">
              {t('travelDetail.group')}
            </h2>
            <ul className="travel-people__members motion-list">
              {members.map((m, i) => (
                <li
                  key={m.userId}
                  className="travel-people__member"
                  style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                >
                  <span className="travel-people__member-name">{memberLabel(m)}</span>
                  <span className="travel-people__member-email">{m.email}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="travel-people__section" aria-labelledby="tp-invite-heading">
            <h2 id="tp-invite-heading" className="travel-people__h2">
              {t('travelDetail.inviteFriend')}
            </h2>
            {canInvite ? (
              <form className="travel-people__invite" onSubmit={onInviteSubmit}>
                <p className="travel-people__hint" id="tp-invite-desc">
                  {t('travelDetail.inviteHint')}
                </p>
                <label className="travel-people__sr-only" htmlFor="tp-invite-email">
                  {t('common.email')}
                </label>
                <input
                  id="tp-invite-email"
                  className="travel-people__input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={t('travelDetail.invitePlaceholder')}
                  value={inviteEmail}
                  onChange={(ev) => setInviteEmail(ev.target.value)}
                  disabled={inviteBusy}
                  aria-describedby="tp-invite-desc"
                />
                <button
                  type="submit"
                  className="travel-detail__btn travel-detail__btn--primary travel-people__invite-btn"
                  disabled={inviteBusy}
                >
                  {inviteBusy ? t('common.sending') : t('travelDetail.sendInvite')}
                </button>
                {inviteError ? (
                  <p className="travel-people__msg travel-people__msg--error" role="alert">
                    {inviteError}
                  </p>
                ) : null}
                {inviteSuccess ? (
                  <p className="travel-people__msg travel-people__msg--ok" role="status">
                    {inviteSuccess}
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="travel-people__muted">{t('travelDetail.inviteDisabled')}</p>
            )}
          </section>

          <section className="travel-people__section" aria-labelledby="tp-inv-heading">
            <h2 id="tp-inv-heading" className="travel-people__h2">
              {t('travelDetail.invitations')}
            </h2>
            {invitations.length === 0 ? (
              <p className="travel-people__muted">{t('travelDetail.noInvitesYet')}</p>
            ) : (
              <ul className="travel-people__invite-cards motion-list">
                {invitations.map((row, i) => (
                  <li
                    key={row.id}
                    className="travel-people__invite-card"
                    style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                  >
                    <div className="travel-people__invite-card-top">
                      <span className="travel-people__invite-email">{row.email}</span>
                      <span
                        className={`travel-people__invite-status travel-people__invite-status--${row.status}`}
                      >
                        {invitationStatusLabel(row.status)}
                      </span>
                    </div>
                    <dl className="travel-people__invite-meta">
                      <div className="travel-people__invite-meta-row">
                        <dt>{t('common.sent')}</dt>
                        <dd>
                          {new Date(row.createdAt).toLocaleString(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </dd>
                      </div>
                      <div className="travel-people__invite-meta-row">
                        <dt>{t('common.accepted')}</dt>
                        <dd>
                          {row.acceptedAt
                            ? new Date(row.acceptedAt).toLocaleString(locale, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : t('common.dash')}
                        </dd>
                      </div>
                      <div className="travel-people__invite-meta-row">
                        <dt>{t('common.invitedBy')}</dt>
                        <dd>{row.invitedByDisplayName?.trim() || row.invitedByEmail}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export function TravelPeoplePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <AppLayout>
      {!id ? (
        <main className="travel-people__main">
          <ApiErrorBanner error={t('travelPeople.missingId')} />
        </main>
      ) : (
        <TravelPeopleContent key={id} travelId={id} />
      )}
    </AppLayout>
  )
}

export default TravelPeoplePage
