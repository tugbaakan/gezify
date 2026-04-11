import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createTravelInvitation,
  fetchTravel,
  fetchTravelExpenses,
  fetchTravelInvitations,
  fetchTravelMembers,
} from '../api/travels'
import type {
  ExpenseCategory,
  ExpenseDetail,
  TravelDetail,
  TravelInvitationListItem,
  TravelMember,
} from '../api/types'
import { ApiRequestError } from '../api/client'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { AppLayout } from '../components/AppLayout'
import { TravelDetailSkeleton } from '../components/TravelDetailSkeleton'
import { firstValidationDetailMessage } from '../utils/apiErrorDisplay'
import {
  expenseCategoriesForFilter,
  formatExpenseCategory,
  formatTry,
  invitationStatusLabel,
  travelStatusChipTone,
  travelStatusLabel,
  travelStatusShort,
} from '../utils/format'
import './TravelDetailPage.css'

function memberLabel(actor: { displayName: string | null; email: string }) {
  return actor.displayName?.trim() || actor.email
}

type ExpenseSort = 'date-desc' | 'date-asc' | 'try-desc' | 'try-asc'

function sortExpenses(list: ExpenseDetail[], sort: ExpenseSort): ExpenseDetail[] {
  const out = [...list]
  switch (sort) {
    case 'date-desc':
      out.sort(
        (a, b) =>
          new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
      )
      break
    case 'date-asc':
      out.sort(
        (a, b) =>
          new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime(),
      )
      break
    case 'try-desc':
      out.sort((a, b) => b.amountTry - a.amountTry)
      break
    case 'try-asc':
      out.sort((a, b) => a.amountTry - b.amountTry)
      break
    default:
      break
  }
  return out
}

function groupExpensesByLocalDay(
  sorted: ExpenseDetail[],
): { dayKey: string; dayLabel: string; items: ExpenseDetail[] }[] {
  const groups: { dayKey: string; dayLabel: string; items: ExpenseDetail[] }[] = []
  for (const e of sorted) {
    const d = new Date(e.expenseDate)
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayLabel = d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const last = groups[groups.length - 1]
    if (last?.dayKey === dayKey) last.items.push(e)
    else groups.push({ dayKey, dayLabel, items: [e] })
  }
  return groups
}

function TravelDetailContent({ travelId }: { travelId: string }) {
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [expenses, setExpenses] = useState<ExpenseDetail[] | null>(null)
  const [members, setMembers] = useState<TravelMember[] | null>(null)
  const [invitations, setInvitations] = useState<TravelInvitationListItem[] | null>(null)
  const [error, setError] = useState<ApiRequestError | string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [expenseSort, setExpenseSort] = useState<ExpenseSort>('date-desc')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | 'all'>('all')

  const expenseGroups = useMemo(() => {
    if (!expenses) return []
    const filtered =
      expenseCategory === 'all'
        ? expenses
        : expenses.filter((e) => e.category === expenseCategory)
    const sorted = sortExpenses(filtered, expenseSort)
    return groupExpensesByLocalDay(sorted)
  }, [expenses, expenseCategory, expenseSort])

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
          if (e instanceof ApiRequestError) setError(e)
          else setError('Gezi yüklenemedi.')
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
        const detail = firstValidationDetailMessage(e)
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
        <ApiErrorBanner className="travel-detail__banner" error={error} />
      ) : !travel || !expenses || !members || !invitations ? (
        <TravelDetailSkeleton />
      ) : (
        <>
          <div className="travel-detail__sticky">
            <div className="travel-detail__sticky-inner">
              <div className="travel-detail__sticky-text">
                <h1 className="travel-detail__title">{travel.name}</h1>
                <span
                  className={`travel-detail__status-chip travel-detail__status-chip--${travelStatusChipTone(travel.status)}`}
                  aria-label={travelStatusLabel(travel.status)}
                >
                  {travelStatusShort(travel.status)}
                </span>
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
            </div>
          </div>

          <section
            className="travel-detail__section travel-detail__section--members"
            aria-labelledby="members-heading"
          >
            <h2 id="members-heading" className="travel-detail__section-title">
              Group
            </h2>
            <ul className="travel-detail__members motion-list">
              {members.map((m, i) => (
                <li
                  key={m.userId}
                  className="travel-detail__member"
                  style={{ ['--stagger' as string]: String(i) } as CSSProperties}
                >
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
                <p className="travel-detail__muted">Henüz davet yok.</p>
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
              <div className="travel-detail__empty-card" role="status">
                <p className="travel-detail__empty-title">Henüz gider yok</p>
                <p className="travel-detail__empty-copy">
                  İlk harcamayı ekleyerek gruptaki payları hesaplamaya başlayın.
                </p>
                <Link
                  className="travel-detail__btn travel-detail__btn--primary travel-detail__empty-cta"
                  to={`/travels/${travel.id}/expenses/new`}
                >
                  Gider ekle
                </Link>
              </div>
            ) : (
              <>
                <div className="travel-detail__expense-toolbar">
                  <div className="travel-detail__expense-toolbar-inner">
                    <div className="travel-detail__toolbar-field">
                      <label className="travel-detail__toolbar-label" htmlFor="travel-exp-sort">
                        Sort
                      </label>
                      <select
                        id="travel-exp-sort"
                        className="travel-detail__toolbar-select"
                        value={expenseSort}
                        onChange={(ev) => setExpenseSort(ev.target.value as ExpenseSort)}
                      >
                        <option value="date-desc">Newest first</option>
                        <option value="date-asc">Oldest first</option>
                        <option value="try-desc">Highest TRY</option>
                        <option value="try-asc">Lowest TRY</option>
                      </select>
                    </div>
                    <div className="travel-detail__toolbar-field">
                      <label className="travel-detail__toolbar-label" htmlFor="travel-exp-cat">
                        Category
                      </label>
                      <select
                        id="travel-exp-cat"
                        className="travel-detail__toolbar-select"
                        value={expenseCategory}
                        onChange={(ev) =>
                          setExpenseCategory(ev.target.value as ExpenseCategory | 'all')
                        }
                      >
                        <option value="all">All categories</option>
                        {expenseCategoriesForFilter().map((c) => (
                          <option key={c} value={c}>
                            {formatExpenseCategory(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {expenseGroups.length === 0 ? (
                  <p className="travel-detail__muted">Bu filtreye uyan gider yok.</p>
                ) : (
                  <div className="travel-detail__expense-groups">
                    <div
                      className="travel-detail__expense-column-labels"
                      aria-hidden="true"
                    >
                      <span>Original</span>
                      <span>TRY (locked)</span>
                    </div>
                    {expenseGroups.map((g) => (
                      <div key={g.dayKey} className="travel-detail__expense-day">
                        <h3 className="travel-detail__day-heading">{g.dayLabel}</h3>
                        <ul className="travel-detail__expenses motion-list">
                          {g.items.map((e, i) => (
                            <li
                              key={e.id}
                              className="travel-detail__expense"
                              style={
                                { ['--stagger' as string]: String(i) } as CSSProperties
                              }
                            >
                              <div className="travel-detail__expense-main">
                                <span className="travel-detail__expense-cat">
                                  {formatExpenseCategory(e.category)}
                                </span>
                                {e.location ? (
                                  <span className="travel-detail__expense-loc">
                                    {e.location}
                                  </span>
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
                                  {e.paidBy ? memberLabel(e.paidBy) : '—'}
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
                      </div>
                    ))}
                  </div>
                )}
              </>
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
          <ApiErrorBanner error="Gezi kimliği eksik." />
        </main>
      ) : (
        <TravelDetailContent key={id} travelId={id} />
      )}
    </AppLayout>
  )
}

export default TravelDetailPage
