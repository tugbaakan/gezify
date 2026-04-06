import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createTravelInvitation,
  fetchTravel,
  fetchTravelExpenses,
  fetchTravelInvitations,
  fetchTravelMembers,
} from '../api/travels'
import type {
  ExpenseDetail,
  TravelDetail,
  TravelInvitationListItem,
  TravelMember,
} from '../api/types'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import {
  formatExpenseCategory,
  formatTry,
  invitationStatusLabel,
  travelStatusLabel,
} from '../utils/format'
import './TravelDetailPage.css'

function memberLabel(actor: { displayName: string | null; email: string }) {
  return actor.displayName?.trim() || actor.email
}

function firstValidationDetail(err: ApiRequestError): string | null {
  const d = err.body?.error.details
  if (!d) return null
  for (const msgs of Object.values(d)) {
    if (msgs?.[0]) return msgs[0]
  }
  return null
}

function TravelDetailContent({ travelId }: { travelId: string }) {
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [expenses, setExpenses] = useState<ExpenseDetail[] | null>(null)
  const [members, setMembers] = useState<TravelMember[] | null>(null)
  const [invitations, setInvitations] = useState<TravelInvitationListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchTravel(travelId),
      fetchTravelExpenses(travelId),
      fetchTravelMembers(travelId),
      fetchTravelInvitations(travelId),
    ])
      .then(([t, ex, m, inv]) => {
        if (!cancelled) {
          setError(null)
          setTravel(t)
          setExpenses(ex)
          setMembers(m)
          setInvitations(inv)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError) setError(e.message)
          else setError('Could not load this trip.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [travelId])

  const canInvite = travel?.status === 'active'

  async function onInviteSubmit(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    const trimmed = inviteEmail.trim()
    if (!trimmed) {
      setInviteError('Enter your friend’s email address.')
      return
    }
    setInviteBusy(true)
    try {
      await createTravelInvitation(travelId, trimmed)
      const nextInv = await fetchTravelInvitations(travelId)
      setInvitations(nextInv)
      setInviteSuccess(
        `Invitation sent to ${trimmed}. They can join using the link in the email (Google account must match that address).`,
      )
      setInviteEmail('')
    } catch (e: unknown) {
      if (e instanceof ApiRequestError) {
        const detail = firstValidationDetail(e)
        setInviteError(detail ?? e.message)
      } else {
        setInviteError('Could not send invitation.')
      }
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <main className="travel-detail__main">
      <nav className="travel-detail__crumb" aria-label="Breadcrumb">
        <Link to="/">Travels</Link>
        <span aria-hidden="true"> / </span>
        <span className="travel-detail__crumb-current">
          {travel?.name ?? 'Trip'}
        </span>
      </nav>

      {error ? (
        <p className="travel-detail__error" role="alert">
          {error}
        </p>
      ) : !travel || !expenses || !members || !invitations ? (
        <p className="travel-detail__loading">Loading…</p>
      ) : (
        <>
          <header className="travel-detail__head">
            <div>
              <h1 className="travel-detail__title">{travel.name}</h1>
              <p className="travel-detail__status">{travelStatusLabel(travel.status)}</p>
            </div>
            <div className="travel-detail__actions">
              <Link
                className="travel-detail__btn travel-detail__btn--secondary"
                to={`/travels/${travel.id}/settlement`}
              >
                Settlement
              </Link>
              <Link
                className="travel-detail__btn travel-detail__btn--primary"
                to={`/travels/${travel.id}/expenses/new`}
              >
                Add expense
              </Link>
            </div>
          </header>

          <section
            className="travel-detail__section travel-detail__section--members"
            aria-labelledby="members-heading"
          >
            <h2 id="members-heading" className="travel-detail__section-title">
              Group
            </h2>
            <ul className="travel-detail__members">
              {members.map((m) => (
                <li key={m.userId} className="travel-detail__member">
                  <span className="travel-detail__member-name">{memberLabel(m)}</span>
                  <span className="travel-detail__member-email">{m.email}</span>
                </li>
              ))}
            </ul>

            {canInvite ? (
              <form className="travel-detail__invite" onSubmit={onInviteSubmit}>
                <label className="travel-detail__invite-label" htmlFor="invite-email">
                  Invite a friend
                </label>
                <p className="travel-detail__invite-hint" id="invite-email-desc">
                  We’ll email them a link to join this trip. They must sign in with the same Google
                  account as this address.
                </p>
                <div className="travel-detail__invite-row">
                  <input
                    id="invite-email"
                    className="travel-detail__invite-input"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(ev) => setInviteEmail(ev.target.value)}
                    disabled={inviteBusy}
                    aria-describedby="invite-email-desc"
                  />
                  <button
                    type="submit"
                    className="travel-detail__btn travel-detail__btn--secondary travel-detail__invite-submit"
                    disabled={inviteBusy}
                  >
                    {inviteBusy ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
                {inviteError ? (
                  <p className="travel-detail__invite-msg travel-detail__invite-msg--error" role="alert">
                    {inviteError}
                  </p>
                ) : null}
                {inviteSuccess ? (
                  <p className="travel-detail__invite-msg travel-detail__invite-msg--ok" role="status">
                    {inviteSuccess}
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="travel-detail__muted travel-detail__invite-disabled">
                Invites are only available while the trip is active.
              </p>
            )}

            <div className="travel-detail__invites-table-wrap">
              <h3 className="travel-detail__invites-table-title" id="invites-table-heading">
                Invitations
              </h3>
              {invitations.length === 0 ? (
                <p className="travel-detail__muted">No invitations yet.</p>
              ) : (
                <div
                  className="travel-detail__table-scroll"
                  role="region"
                  aria-labelledby="invites-table-heading"
                  tabIndex={0}
                >
                  <table className="travel-detail__table">
                    <thead>
                      <tr>
                        <th scope="col">Email</th>
                        <th scope="col">Status</th>
                        <th scope="col">Sent</th>
                        <th scope="col">Accepted</th>
                        <th scope="col">Invited by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((row) => (
                        <tr key={row.id}>
                          <td className="travel-detail__table-cell--email">{row.email}</td>
                          <td>
                            <span
                              className={`travel-detail__invite-status travel-detail__invite-status--${row.status}`}
                            >
                              {invitationStatusLabel(row.status)}
                            </span>
                          </td>
                          <td className="travel-detail__table-cell--date">
                            {new Date(row.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="travel-detail__table-cell--date">
                            {row.acceptedAt
                              ? new Date(row.acceptedAt).toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </td>
                          <td>
                            {row.invitedByDisplayName?.trim() || row.invitedByEmail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="travel-detail__section" aria-labelledby="exp-heading">
            <h2 id="exp-heading" className="travel-detail__section-title">
              Expenses
            </h2>
            {expenses.length === 0 ? (
              <p className="travel-detail__muted">No expenses yet.</p>
            ) : (
              <ul className="travel-detail__expenses">
                {expenses.map((e) => (
                  <li key={e.id} className="travel-detail__expense">
                    <div className="travel-detail__expense-main">
                      <span className="travel-detail__expense-cat">
                        {formatExpenseCategory(e.category)}
                      </span>
                      {e.location ? (
                        <span className="travel-detail__expense-loc">{e.location}</span>
                      ) : null}
                    </div>
                    <div className="travel-detail__expense-amounts">
                      <span className="travel-detail__expense-original">
                        {e.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {e.currency}
                      </span>
                      <span className="travel-detail__expense-try">
                        {formatTry(e.amountTry)}
                      </span>
                    </div>
                    <div className="travel-detail__expense-meta">
                      <span>
                        Paid by:{' '}
                        {e.paidBy
                          ? memberLabel(e.paidBy)
                          : '—'}
                      </span>
                      <span>
                        {new Date(e.expenseDate).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
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

export function TravelDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <AppLayout>
      {!id ? (
        <main className="travel-detail__main">
          <p className="travel-detail__error">Missing trip id.</p>
        </main>
      ) : (
        <TravelDetailContent key={id} travelId={id} />
      )}
    </AppLayout>
  )
}

export default TravelDetailPage
