import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTravel, fetchTravelExpenses } from '../api/travels'
import type { ExpenseDetail, TravelDetail } from '../api/types'
import { ApiRequestError } from '../api/client'
import { AppLayout } from '../components/AppLayout'
import { formatExpenseCategory, formatTry, travelStatusLabel } from '../utils/format'
import './TravelDetailPage.css'

function memberLabel(actor: { displayName: string | null; email: string }) {
  return actor.displayName?.trim() || actor.email
}

function TravelDetailContent({ travelId }: { travelId: string }) {
  const [travel, setTravel] = useState<TravelDetail | null>(null)
  const [expenses, setExpenses] = useState<ExpenseDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchTravel(travelId), fetchTravelExpenses(travelId)])
      .then(([t, ex]) => {
        if (!cancelled) {
          setError(null)
          setTravel(t)
          setExpenses(ex)
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
      ) : !travel || !expenses ? (
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
